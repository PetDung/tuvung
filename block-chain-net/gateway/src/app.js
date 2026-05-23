/*
 * AgriTrace Gateway - REST API for Hyperledger Fabric
 * Connects to Fabric network and exposes REST endpoints for the backend
 *
 * Contract Model (IMMutable Product):
 * - Product: ID, RefID, FarmerID, FarmerName, QRCode, CreatedAt
 *   (NO Status, CurrentOwner, CurrentRole, Certified, UpdatedAt)
 *
 * - SupplyChainEvent: ID, ProductID, EventType, ActorID, ActorName, ActorRole,
 *   Timestamp, Location, PrevOwner, NewOwner, Description, TxID
 *
 * EventTypes (Status): Registered, Inspected, InTransit, Delivered, Sold
 * EventTypes (Meta): Certified, Transferred
 * Note: Status flow uses actual status values (e.g. "Sold"), not "StatusChanged"
 * Status Flow: Registered → Inspected → InTransit → Delivered → Sold (terminal)
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('path');
const { TextDecoder } = require('node:util');
const express = require('express');

const utf8Decoder = new TextDecoder();

// Configuration
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '4000', 10);
const DEFAULT_PAGE_SIZE = 25;

// Environment defaults
const channelName = process.env.CHANNEL_NAME || 'nongsan';
const chaincodeName = process.env.CHAINCODE_NAME || 'agri-trace';
const mspId = process.env.MSP_ID || 'Org1MSP';
const peerEndpoint = process.env.PEER_ENDPOINT || 'localhost:7051';
const peerHostAlias = process.env.PEER_HOST_ALIAS || 'peer0.org1.example.com';

const cryptoPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com');
const keyDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore');
const certDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts');
const tlsCertPath = path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');

// Global contract reference
let contract = null;

// ==================== Helpers ====================

function parseJson(raw) {
    if (!raw || raw.length === 0) return null;
    try {
        return JSON.parse(utf8Decoder.decode(raw));
    } catch {
        return null;
    }
}

function requireContract(res) {
    if (!contract) {
        res.status(503).json({ error: 'Fabric not connected' });
        return false;
    }
    return true;
}

// ==================== Express REST API ====================

const app = express();
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== Product CRUD ====================

// POST /api/products - CreateProduct
// Chaincode: CreateProduct(id, refID, farmerID, farmerName, qrCode, createdAt)
// Returns: { success: true, txId: string }
app.post('/api/products', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const { id, refID, farmerID, farmerName, qrCode, createdAt } = req.body;

        if (!id) return res.status(400).json({ error: 'id is required' });
        if (!refID) return res.status(400).json({ error: 'refID is required' });
        if (!farmerID) return res.status(400).json({ error: 'farmerID is required' });
        if (!qrCode) return res.status(400).json({ error: 'qrCode is required' });

        const result = await contract.submitTransaction(
            'CreateProduct', id, refID, farmerID, farmerName || '', qrCode, createdAt || new Date().toISOString()
        );

        res.json({ success: true, txId: utf8Decoder.decode(result).trim() });
    } catch (error) {
        console.error('CreateProduct error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/products/:id - ReadProduct
// Returns: Product (immutable fields only: ID, RefID, FarmerID, FarmerName, QRCode, CreatedAt)
// Note: NO Status, CurrentOwner, CurrentRole - use /events to get current state
app.get('/api/products/:id', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const result = parseJson(await contract.evaluateTransaction('ReadProduct', req.params.id));
        if (!result) return res.status(404).json({ error: 'Product not found' });
        res.json(result);
    } catch (error) {
        if (error.message.includes('does not exist')) {
            return res.status(404).json({ error: error.message });
        }
        console.error('ReadProduct error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/products - GetAllProducts (paginated)
app.get('/api/products', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const pageSize = req.query.pageSize || DEFAULT_PAGE_SIZE;
        const bookmark = req.query.bookmark || '';
        const result = parseJson(await contract.evaluateTransaction('GetAllProducts', String(pageSize), bookmark));
        res.json(result || { products: [], bookmark: '', fetchedCount: 0 });
    } catch (error) {
        console.error('GetAllProducts error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Supply Chain Actions ====================

// POST /api/products/:id/approve - ApproveProduct
// Inspector approves: Registered → Inspected. Ownership stays with Farmer.
// Chaincode: ApproveProduct(productID, inspectorID, inspectorName, timestamp, location)
app.post('/api/products/:id/approve', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const { inspectorID, inspectorName, timestamp, location } = req.body;
        const result = await contract.submitTransaction(
            'ApproveProduct', req.params.id,
            inspectorID || '', inspectorName || '',
            timestamp || new Date().toISOString(), location || ''
        );
        res.json({ success: true, txId: utf8Decoder.decode(result).trim() });
    } catch (error) {
        console.error('ApproveProduct error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/products/:id/ship - StartShipment
// Distributor ships: Inspected → InTransit. Ownership transfers to Distributor.
// Chaincode: StartShipment(productID, distributorID, distributorName, timestamp, location)
app.post('/api/products/:id/ship', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const { distributorID, distributorName, timestamp, location } = req.body;
        const result = await contract.submitTransaction(
            'StartShipment', req.params.id,
            distributorID || '', distributorName || '',
            timestamp || new Date().toISOString(), location || ''
        );
        res.json({ success: true, txId: utf8Decoder.decode(result).trim() });
    } catch (error) {
        console.error('StartShipment error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/products/:id/receive - ConfirmDelivery
// Retailer confirms: InTransit → Delivered. Ownership transfers to Retailer.
// Chaincode: ConfirmDelivery(productID, retailerID, retailerName, timestamp, location)
app.post('/api/products/:id/receive', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const { retailerID, retailerName, timestamp, location } = req.body;
        const result = await contract.submitTransaction(
            'ConfirmDelivery', req.params.id,
            retailerID || '', retailerName || '',
            timestamp || new Date().toISOString(), location || ''
        );
        res.json({ success: true, txId: utf8Decoder.decode(result).trim() });
    } catch (error) {
        console.error('ConfirmDelivery error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/products/:id/status - UpdateProductStatus
// Update status only (e.g. Delivered → Sold). Ownership unchanged.
// Chaincode: UpdateProductStatus(id, newStatus, updatedAt, actorID, actorName)
// Valid statuses: Registered, Inspected, InTransit, Delivered, Sold
app.put('/api/products/:id/status', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const { newStatus, updatedAt, actorID, actorName } = req.body;
        if (!newStatus) return res.status(400).json({ error: 'newStatus is required' });

        const result = await contract.submitTransaction(
            'UpdateProductStatus', req.params.id,
            newStatus, updatedAt || new Date().toISOString(),
            actorID || '', actorName || ''
        );
        res.json({ success: true, txId: utf8Decoder.decode(result).trim() });
    } catch (error) {
        console.error('UpdateProductStatus error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/products/:id/transfer - TransferProduct
// Generic ownership transfer. Cannot transfer sold products.
// Chaincode: TransferProduct(productID, newOwner, newOwnerRole, newOwnerName, updatedAt, actorID, actorName)
app.post('/api/products/:id/transfer', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const { newOwner, newOwnerRole, newOwnerName, updatedAt, actorID, actorName } = req.body;
        const result = await contract.submitTransaction(
            'TransferProduct', req.params.id,
            newOwner || '', newOwnerRole || '', newOwnerName || '',
            updatedAt || new Date().toISOString(),
            actorID || '', actorName || ''
        );
        res.json({ success: true, txId: utf8Decoder.decode(result).trim() });
    } catch (error) {
        console.error('TransferProduct error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Inspection & Certification ====================

// POST /api/products/:id/inspection - RecordInspection
// Records inspection event without changing status.
// Chaincode: RecordInspection(productID, inspectorID, inspectorName, inspectorRole, timestamp, location, description)
app.post('/api/products/:id/inspection', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const { inspectorID, inspectorName, inspectorRole, timestamp, location, description } = req.body;
        const result = await contract.submitTransaction(
            'RecordInspection', req.params.id,
            inspectorID || '', inspectorName || '', inspectorRole || '',
            timestamp || new Date().toISOString(), location || '', description || ''
        );
        res.json({ success: true, txId: utf8Decoder.decode(result).trim() });
    } catch (error) {
        console.error('RecordInspection error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/products/:id/certify - MarkAsCertified
// Marks product as certified.
// Chaincode: MarkAsCertified(productID, certifiedAt, certifierID, certifierName)
app.post('/api/products/:id/certify', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const { certifiedAt, certifierID, certifierName } = req.body;
        const result = await contract.submitTransaction(
            'MarkAsCertified', req.params.id,
            certifiedAt || new Date().toISOString(),
            certifierID || '', certifierName || ''
        );
        res.json({ success: true, txId: utf8Decoder.decode(result).trim() });
    } catch (error) {
        console.error('MarkAsCertified error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Events & History ====================

// GET /api/products/:id/events - GetSupplyChainEvents
// Returns all events for the product (unsorted by timestamp)
// Use /history for sorted timeline
app.get('/api/products/:id/events', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const result = parseJson(await contract.evaluateTransaction('GetSupplyChainEvents', req.params.id));
        res.json(Array.isArray(result) ? result : []);
    } catch (error) {
        console.error('GetSupplyChainEvents error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/products/:id/history - GetProductHistory
// Returns all events sorted by timestamp (oldest first)
// This is the SOURCE OF TRUTH for product timeline
app.get('/api/products/:id/history', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const result = parseJson(await contract.evaluateTransaction('GetProductHistory', req.params.id));
        res.json(Array.isArray(result) ? result : []);
    } catch (error) {
        console.error('GetProductHistory error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/products/:id/qr-payload - GenerateQRPayload
// Returns: { id, refId, farm, url }
app.get('/api/products/:id/qr-payload', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const result = parseJson(await contract.evaluateTransaction('GenerateQRPayload', req.params.id));
        if (!result) return res.status(404).json({ error: 'Product not found' });
        res.json(result);
    } catch (error) {
        console.error('GenerateQRPayload error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Queries ====================

// GET /api/products/farmer/:farmerId - GetProductsByFarmer
app.get('/api/products/farmer/:farmerId', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const pageSize = req.query.pageSize || DEFAULT_PAGE_SIZE;
        const bookmark = req.query.bookmark || '';
        const result = parseJson(await contract.evaluateTransaction('GetProductsByFarmer', req.params.farmerId, String(pageSize), bookmark));
        res.json(result || { products: [], bookmark: '', fetchedCount: 0 });
    } catch (error) {
        console.error('GetProductsByFarmer error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/products/status/:status - GetProductsByStatus
// Valid statuses: Registered, Inspected, InTransit, Delivered, Sold
app.get('/api/products/status/:status', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const pageSize = req.query.pageSize || DEFAULT_PAGE_SIZE;
        const bookmark = req.query.bookmark || '';
        const result = parseJson(await contract.evaluateTransaction('GetProductsByStatus', req.params.status, String(pageSize), bookmark));
        res.json(result || { products: [], bookmark: '', fetchedCount: 0 });
    } catch (error) {
        console.error('GetProductsByStatus error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/products/owner/:ownerId - GetProductsByOwner
app.get('/api/products/owner/:ownerId', async (req, res) => {
    if (!requireContract(res)) return;
    try {
        const pageSize = req.query.pageSize || DEFAULT_PAGE_SIZE;
        const bookmark = req.query.bookmark || '';
        const result = parseJson(await contract.evaluateTransaction('GetProductsByOwner', req.params.ownerId, String(pageSize), bookmark));
        res.json(result || { products: [], bookmark: '', fetchedCount: 0 });
    } catch (error) {
        console.error('GetProductsByOwner error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Fabric Connection ====================

async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const files = await fs.readdir(certDirectoryPath);
    const certPath = path.join(certDirectoryPath, files[0]);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function getFirstFile(dirPath) {
    const files = await fs.readdir(dirPath);
    if (!files[0]) throw new Error(`No files in: ${dirPath}`);
    return path.join(dirPath, files[0]);
}

async function newSigner() {
    const keyPath = await getFirstFile(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

async function initFabric() {
    console.log('====================================');
    console.log('  AgriTrace Gateway                ');
    console.log('====================================');
    console.log(`  Channel:        ${channelName}`);
    console.log(`  Chaincode:      ${chaincodeName}`);
    console.log(`  MSP:             ${mspId}`);
    console.log(`  Peer Endpoint:   ${peerEndpoint}`);
    console.log('====================================');

    const client = await newGrpcConnection();
    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        hash: hash.sha256,
        evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
        endorseOptions: () => ({ deadline: Date.now() + 15000 }),
        submitOptions: () => ({ deadline: Date.now() + 5000 }),
        commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });

    const network = gateway.getNetwork(channelName);
    contract = network.getContract(chaincodeName);
    console.log('*** Fabric gateway connected');

    return { gateway, client };
}

// ==================== Start Server ====================

async function startServer() {
    try {
        await initFabric();
        app.listen(GATEWAY_PORT, () => {
            console.log(`*** AgriTrace Gateway listening on port ${GATEWAY_PORT}`);
            console.log('\nAvailable endpoints:');
            console.log('  POST   /api/products              — CreateProduct');
            console.log('  GET    /api/products/:id         — ReadProduct');
            console.log('  GET    /api/products             — GetAllProducts');
            console.log('  POST   /api/products/:id/approve — ApproveProduct (Registered→Inspected)');
            console.log('  POST   /api/products/:id/ship    — StartShipment (Inspected→InTransit)');
            console.log('  POST   /api/products/:id/receive — ConfirmDelivery (InTransit→Delivered)');
            console.log('  PUT    /api/products/:id/status  — UpdateProductStatus (Delivered→Sold)');
            console.log('  POST   /api/products/:id/transfer — TransferProduct');
            console.log('  POST   /api/products/:id/inspection — RecordInspection');
            console.log('  POST   /api/products/:id/certify    — MarkAsCertified');
            console.log('  GET    /api/products/:id/events   — GetSupplyChainEvents');
            console.log('  GET    /api/products/:id/history  — GetProductHistory (timeline)');
            console.log('  GET    /api/products/:id/qr-payload — GenerateQRPayload');
            console.log('  GET    /api/products/farmer/:farmerId   — GetProductsByFarmer');
            console.log('  GET    /api/products/status/:status    — GetProductsByStatus');
            console.log('  GET    /api/products/owner/:ownerId    — GetProductsByOwner');
        });
    } catch (error) {
        console.error('*** FAILED to start server:', error.message);
        process.exitCode = 1;
    }
}

startServer();

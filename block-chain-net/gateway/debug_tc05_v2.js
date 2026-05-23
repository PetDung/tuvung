const axios = require('axios');

const GATEWAY_URL = 'http://localhost:4000';

async function req(method, url, data) {
    try {
        const response = await axios({ method, url, data });
        return response.data;
    } catch (e) {
        console.log(`     REQ ERROR: ${e.response?.status} - ${e.response?.data?.error || e.message}`);
        throw e;
    }
}

const ACTORS = {
    farmer:      { id: 'farmer-err',      name: 'Farmer A' },
    inspector:   { id: 'inspector-err',    name: 'Inspector B' },
    distributor: { id: 'distributor-err', name: 'Distributor C' },
    retailer:    { id: 'retailer-err',     name: 'Retailer D' },
};

function now() { return new Date().toISOString(); }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const id5 = `TEST-ERR05-${Date.now()}`;
    console.log(`Product ID: ${id5}`);
    
    // Step 1: Create
    console.log('Step 1: Create...');
    try {
        await req('POST', `${GATEWAY_URL}/api/products`, {
            id: id5,
            refID: `ref-${id5}`,
            farmerID: ACTORS.farmer.id,
            farmerName: ACTORS.farmer.name,
            qrCode: `https://x.com/${id5}`,
            createdAt: now(),
        });
        console.log('  OK');
    } catch (e) {
        console.log(`  FAILED: ${e.response?.data?.error}`);
        return;
    }
    await delay(500);
    
    // Step 2: Approve
    console.log('Step 2: Approve...');
    try {
        await req('POST', `${GATEWAY_URL}/api/products/${id5}/approve`, {
            inspectorID: ACTORS.inspector.id,
            inspectorName: ACTORS.inspector.name,
            timestamp: now(),
            location: 'X',
        });
        console.log('  OK');
    } catch (e) {
        console.log(`  FAILED: ${e.response?.data?.error}`);
        return;
    }
    await delay(500);
    
    // Step 3: Ship
    console.log('Step 3: Ship...');
    try {
        await req('POST', `${GATEWAY_URL}/api/products/${id5}/ship`, {
            distributorID: ACTORS.distributor.id,
            distributorName: ACTORS.distributor.name,
            timestamp: now(),
            location: 'Route',
        });
        console.log('  OK');
    } catch (e) {
        console.log(`  FAILED: ${e.response?.data?.error}`);
        return;
    }
    await delay(500);
    
    // Step 4: Receive
    console.log('Step 4: Receive...');
    try {
        await req('POST', `${GATEWAY_URL}/api/products/${id5}/receive`, {
            retailerID: ACTORS.retailer.id,
            retailerName: ACTORS.retailer.name,
            timestamp: now(),
            location: 'HCM',
        });
        console.log('  OK');
    } catch (e) {
        console.log(`  FAILED: ${e.response?.data?.error}`);
        return;
    }
    await delay(500);
    
    // Step 5: Mark as Sold
    console.log('Step 5: Mark Sold...');
    try {
        await req('PUT', `${GATEWAY_URL}/api/products/${id5}/status`, {
            newStatus: 'Sold',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
        console.log('  OK');
    } catch (e) {
        console.log(`  FAILED: ${e.response?.data?.error}`);
        return;
    }
    await delay(500);
    
    // Step 6: Try Sold -> Delivered (should fail)
    console.log('Step 6: Try Sold->Delivered...');
    try {
        await req('PUT', `${GATEWAY_URL}/api/products/${id5}/status`, {
            newStatus: 'Delivered',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
        console.log('  UNEXPECTED SUCCESS!');
    } catch (e) {
        console.log(`  Expected error: ${e.response?.status} - ${e.response?.data?.error}`);
        console.log('  -> Test PASSED');
    }
}

main().catch(console.error);

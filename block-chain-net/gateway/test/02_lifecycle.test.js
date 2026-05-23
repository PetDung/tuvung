/**
 * Test 02: Full Product Lifecycle
 *
 * Tests the complete supply chain flow:
 * CreateProduct → ApproveProduct → StartShipment → ConfirmDelivery → UpdateProductStatus
 *
 * Contract rules:
 * - Product is IMMUTABLE (no Status/CurrentOwner on Product)
 * - All state changes are recorded as SupplyChainEvent records
 * - GetProductHistory returns timeline sorted by timestamp (oldest first)
 * - GetSupplyChainEvents returns all events (unsorted - use history for latest)
 *
 * Status flow: Registered → Inspected → InTransit → Delivered → Sold (terminal)
 * Ownership flow: Farmer → Farmer → Distributor → Retailer → Retailer
 */

const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const now = () => new Date().toISOString();

// Actors in the supply chain
const ACTORS = {
    farmer:      { id: 'farmer-001',      name: 'Nguyen Van A',        role: 'Farmer' },
    inspector:   { id: 'inspector-001',   name: 'Chi Cuc NNPTNT Can Tho', role: 'Inspector' },
    distributor: { id: 'distributor-001', name: 'Vietrans Co.',         role: 'Distributor' },
    retailer:    { id: 'retailer-001',    name: 'Co.opMart District 3', role: 'Retailer' },
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

async function req(method, url, data) {
    const response = await axios({ method, url, data });
    return response.data;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Get latest event from history (sorted by timestamp, last item is latest)
async function getLatestEvent(productId) {
    const history = await req('GET', `${GATEWAY_URL}/api/products/${productId}/history`);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
}

async function main() {
    console.log('========================================');
    console.log('  TEST 02: Full Product Lifecycle     ');
    console.log('========================================\n');

    const productId = `TEST-LIFECYCLE-${Date.now()}`;
    const refId = `ref-lifecycle-${Date.now()}`;

    console.log(`Product ID: ${productId}\n`);

    // ─── Step 1: CreateProduct (Farmer) ────────────────────────────────────
    console.log('[Step 1] Farmer creates product...');
    try {
        const res = await req('POST', `${GATEWAY_URL}/api/products`, {
            id: productId,
            refID: refId,
            farmerID: ACTORS.farmer.id,
            farmerName: ACTORS.farmer.name,
            qrCode: `https://agri.trace/v1/${refId}`,
            createdAt: now(),
        });
        assert(res.success === true, 'CreateProduct returns success');
        assert(!!res.txId, 'CreateProduct returns txId');
    } catch (e) {
        assert(false, `CreateProduct failed: ${e.response?.data?.error || e.message}`);
    }

    await delay(500);

    // Verify: 1 Registered event in history, owner = Farmer
    const history1 = await req('GET', `${GATEWAY_URL}/api/products/${productId}/history`);
    assert(history1.length === 1, `After Create: 1 event (got ${history1.length})`);
    assert(history1[0].EventType === 'Registered', 'EventType === "Registered"');
    assert(history1[0].NewOwner === ACTORS.farmer.id, `Owner === Farmer`);
    console.log('       -> Product created, owner: Farmer');

    // ─── Step 2: ApproveProduct (Inspector) ────────────────────────────────
    console.log('\n[Step 2] Inspector approves product...');
    try {
        const res = await req('POST', `${GATEWAY_URL}/api/products/${productId}/approve`, {
            inspectorID: ACTORS.inspector.id,
            inspectorName: ACTORS.inspector.name,
            timestamp: now(),
            location: 'Can Tho City',
        });
        assert(res.success === true, 'ApproveProduct returns success');
    } catch (e) {
        assert(false, `ApproveProduct failed: ${e.response?.data?.error || e.message}`);
    }

    await delay(500);

    // Verify: 2 events, latest = Inspected, owner unchanged
    const history2 = await req('GET', `${GATEWAY_URL}/api/products/${productId}/history`);
    assert(history2.length === 2, `After Approve: 2 events (got ${history2.length})`);
    const event2 = history2[history2.length - 1];
    assert(event2.EventType === 'Inspected', 'Latest event === "Inspected"');
    assert(event2.ActorID === ACTORS.inspector.id, 'ActorID === Inspector');
    assert(event2.ActorRole === 'Inspector', 'ActorRole === "Inspector"');
    assert(event2.NewOwner === ACTORS.farmer.id, 'Owner unchanged (still Farmer)');
    console.log('       -> Product inspected, owner unchanged: Farmer');

    // ─── Step 3: StartShipment (Distributor) ───────────────────────────────
    console.log('\n[Step 3] Distributor starts shipping...');
    try {
        const res = await req('POST', `${GATEWAY_URL}/api/products/${productId}/ship`, {
            distributorID: ACTORS.distributor.id,
            distributorName: ACTORS.distributor.name,
            timestamp: now(),
            location: 'Can Tho → Ho Chi Minh City',
        });
        assert(res.success === true, 'StartShipment returns success');
    } catch (e) {
        assert(false, `StartShipment failed: ${e.response?.data?.error || e.message}`);
    }

    await delay(500);

    // Verify: 3 events, latest = InTransit, owner = Distributor
    const history3 = await req('GET', `${GATEWAY_URL}/api/products/${productId}/history`);
    assert(history3.length === 3, `After Ship: 3 events (got ${history3.length})`);
    const event3 = history3[history3.length - 1];
    assert(event3.EventType === 'InTransit', 'Latest event === "InTransit"');
    assert(event3.ActorID === ACTORS.distributor.id, 'ActorID === Distributor');
    assert(event3.ActorRole === 'Distributor', 'ActorRole === "Distributor"');
    assert(event3.PrevOwner === ACTORS.farmer.id, 'PrevOwner === Farmer');
    assert(event3.NewOwner === ACTORS.distributor.id, 'NewOwner === Distributor');
    console.log('       -> Product in transit, owner changed: Distributor');

    // ─── Step 4: ConfirmDelivery (Retailer) ───────────────────────────────
    console.log('\n[Step 4] Retailer confirms delivery...');
    try {
        const res = await req('POST', `${GATEWAY_URL}/api/products/${productId}/receive`, {
            retailerID: ACTORS.retailer.id,
            retailerName: ACTORS.retailer.name,
            timestamp: now(),
            location: 'Ho Chi Minh City',
        });
        assert(res.success === true, 'ConfirmDelivery returns success');
    } catch (e) {
        assert(false, `ConfirmDelivery failed: ${e.response?.data?.error || e.message}`);
    }

    await delay(500);

    // Verify: 4 events, latest = Delivered, owner = Retailer
    const history4 = await req('GET', `${GATEWAY_URL}/api/products/${productId}/history`);
    assert(history4.length === 4, `After Deliver: 4 events (got ${history4.length})`);
    const event4 = history4[history4.length - 1];
    assert(event4.EventType === 'Delivered', 'Latest event === "Delivered"');
    assert(event4.ActorID === ACTORS.retailer.id, 'ActorID === Retailer');
    assert(event4.ActorRole === 'Retailer', 'ActorRole === "Retailer"');
    assert(event4.PrevOwner === ACTORS.distributor.id, 'PrevOwner === Distributor');
    assert(event4.NewOwner === ACTORS.retailer.id, 'NewOwner === Retailer');
    console.log('       -> Product delivered, owner changed: Retailer');

    // ─── Step 5: UpdateProductStatus → Sold (Retailer) ────────────────────
    console.log('\n[Step 5] Retailer marks product as Sold...');
    try {
        const res = await req('PUT', `${GATEWAY_URL}/api/products/${productId}/status`, {
            newStatus: 'Sold',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
        assert(res.success === true, 'UpdateProductStatus returns success');
    } catch (e) {
        assert(false, `UpdateProductStatus failed: ${e.response?.data?.error || e.message}`);
    }

    await delay(500);

    // Verify: 5 events, latest = Sold, owner unchanged
    const history5 = await req('GET', `${GATEWAY_URL}/api/products/${productId}/history`);
    assert(history5.length === 5, `After Sold: 5 events (got ${history5.length})`);
    const event5 = history5[history5.length - 1];
    assert(event5.EventType === 'Sold', 'Latest event === "Sold"');
    assert(event5.ActorID === ACTORS.retailer.id, 'ActorID === Retailer');
    assert(event5.NewOwner === ACTORS.retailer.id, 'Owner unchanged (still Retailer)');
    assert(event5.Description.includes('Sold'), 'Description mentions "Sold"');
    console.log('       -> Product sold, owner unchanged: Retailer');

    // ─── Step 6: Verify full history timeline ──────────────────────────────
    console.log('\n[Step 6] Verify product history timeline...');
    try {
        const history = await req('GET', `${GATEWAY_URL}/api/products/${productId}/history`);
        assert(Array.isArray(history), 'History is an array');
        assert(history.length === 5, `History has 5 events (got ${history.length})`);

    // Verify order: oldest first
    assert(history[0].EventType === 'Registered',   '[0] Registered');
    assert(history[1].EventType === 'Inspected',      '[1] Inspected');
    assert(history[2].EventType === 'InTransit',      '[2] InTransit');
    assert(history[3].EventType === 'Delivered',      '[3] Delivered');
    assert(history[4].EventType === 'Sold',           '[4] Sold');

        // Verify all events have required fields
        for (let i = 0; i < history.length; i++) {
            const e = history[i];
            assert(!!e.ID,          `[${i}] has ID`);
            assert(!!e.ProductID,   `[${i}] has ProductID`);
            assert(!!e.EventType,   `[${i}] has EventType`);
            assert(!!e.ActorID,     `[${i}] has ActorID`);
            assert(!!e.ActorName,   `[${i}] has ActorName`);
            assert(!!e.ActorRole,   `[${i}] has ActorRole`);
            assert(!!e.Timestamp,   `[${i}] has Timestamp`);
            assert(!!e.TxID,        `[${i}] has TxID`);
        }

        // Verify ownership chain
        assert(history[0].NewOwner === ACTORS.farmer.id,       '[0] Owner: Farmer');
        assert(history[1].NewOwner === ACTORS.farmer.id,       '[1] Owner: Farmer (unchanged)');
        assert(history[2].NewOwner === ACTORS.distributor.id,   '[2] Owner: Distributor');
        assert(history[3].NewOwner === ACTORS.retailer.id,     '[3] Owner: Retailer');
        assert(history[4].NewOwner === ACTORS.retailer.id,      '[4] Owner: Retailer (unchanged)');

        console.log('       -> History timeline verified');
        console.log('         Registered → Inspected → InTransit → Delivered → Sold');
    } catch (e) {
        assert(false, `GetHistory failed: ${e.response?.data?.error || e.message}`);
    }

    // ─── Step 7: Product record is still immutable ─────────────────────────
    console.log('\n[Step 7] Verify Product record is immutable...');
    try {
        const product = await req('GET', `${GATEWAY_URL}/api/products/${productId}`);
        assert(product.ID === productId, 'ID is correct');
        assert(product.RefID === refId, 'RefID is correct');
        assert(product.FarmerID === ACTORS.farmer.id, 'FarmerID is correct');
        assert(product.Status === undefined, 'Status does NOT exist on Product');
        assert(product.CurrentOwner === undefined, 'CurrentOwner does NOT exist on Product');
        console.log('       -> Product record unchanged (immutable)');
    } catch (e) {
        assert(false, `ReadProduct failed: ${e.response?.data?.error || e.message}`);
    }

    // ─── Results ──────────────────────────────────────────────────────────
    console.log('\n========================================');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    console.log('========================================');
    if (failed > 0) process.exit(1);
}

main().catch(err => {
    console.error('Runner error:', err.message);
    process.exit(1);
});

/**
 * Test 04: Status Changes & Mark as Sold
 *
 * Tests the UpdateProductStatus function and specific scenarios:
 * - Delivered → Sold (normal flow)
 * - Ownership does NOT change when status changes
 * - Sold is terminal - no further changes allowed
 */

const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const now = () => new Date().toISOString();

const ACTORS = {
    farmer:      { id: 'farmer-sold',      name: 'Farmer Sold' },
    inspector:   { id: 'inspector-sold',   name: 'Inspector Sold' },
    distributor: { id: 'distributor-sold', name: 'Distributor Sold' },
    retailer:    { id: 'retailer-sold',    name: 'Retailer Sold' },
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

async function expectError(fn, expectedStatus = 500) {
    try {
        await fn();
        return false;
    } catch (e) {
        return e.response && e.response.status === expectedStatus;
    }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Get latest event from history (sorted by timestamp, last item is latest)
async function getLatestEvent(productId) {
    const history = await req('GET', `${GATEWAY_URL}/api/products/${productId}/history`);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
}

async function createAndAdvanceToDelivered(productId) {
    await req('POST', `${GATEWAY_URL}/api/products`, {
        id: productId,
        refID: `ref-${productId}`,
        farmerID: ACTORS.farmer.id,
        farmerName: ACTORS.farmer.name,
        qrCode: `https://x.com/${productId}`,
        createdAt: now(),
    });
    await delay(200);

    await req('POST', `${GATEWAY_URL}/api/products/${productId}/approve`, {
        inspectorID: ACTORS.inspector.id,
        inspectorName: ACTORS.inspector.name,
        timestamp: now(),
        location: 'X',
    });
    await delay(200);

    await req('POST', `${GATEWAY_URL}/api/products/${productId}/ship`, {
        distributorID: ACTORS.distributor.id,
        distributorName: ACTORS.distributor.name,
        timestamp: now(),
        location: 'Route',
    });
    await delay(200);

    await req('POST', `${GATEWAY_URL}/api/products/${productId}/receive`, {
        retailerID: ACTORS.retailer.id,
        retailerName: ACTORS.retailer.name,
        timestamp: now(),
        location: 'HCM',
    });
    await delay(200);
}

async function main() {
    console.log('========================================');
    console.log('  TEST 04: Status Changes & Sold       ');
    console.log('========================================\n');

    // ─── TC-01: Mark as Sold ────────────────────────────────────────────────
    console.log('[TC-01] Mark product as Sold (Delivered → Sold)...');
    const id1 = `TEST-SOLD01-${Date.now()}`;
    await createAndAdvanceToDelivered(id1);

    // Get owner before sold
    const eventBefore = await getLatestEvent(id1);
    const ownerBefore = eventBefore.NewOwner;
    assert(ownerBefore === ACTORS.retailer.id, `Owner before sold: Retailer`);

    try {
        const res = await req('PUT', `${GATEWAY_URL}/api/products/${id1}/status`, {
            newStatus: 'Sold',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
        assert(res.success === true, 'UpdateProductStatus returns success');
    } catch (e) {
        assert(false, `Mark as Sold failed: ${e.response?.data?.error || e.message}`);
    }

    await delay(500);

    // Verify owner unchanged after Sold
    const eventAfter = await getLatestEvent(id1);
    const ownerAfter = eventAfter.NewOwner;
    assert(ownerAfter === ACTORS.retailer.id, `Owner after sold: Retailer (unchanged)`);

    // Verify Sold event
    assert(eventAfter.EventType === 'Sold', 'Latest event is Sold');
    assert(eventAfter.Description.includes('Sold'), 'Description mentions "Sold"');
    console.log('       -> Product marked as Sold, owner unchanged');

    // ─── TC-02: Verify ownership is immutable during status change ───────────
    console.log('\n[TC-02] Ownership unchanged during status change...');
    const id2 = `TEST-SOLD02-${Date.now()}`;
    await createAndAdvanceToDelivered(id2);

    const evBefore = await getLatestEvent(id2);
    const ownerBefore2 = evBefore.NewOwner;
    assert(ownerBefore2 === ACTORS.retailer.id, 'Owner before status change: Retailer');

    await req('PUT', `${GATEWAY_URL}/api/products/${id2}/status`, {
        newStatus: 'Sold',
        updatedAt: now(),
        actorID: ACTORS.retailer.id,
        actorName: ACTORS.retailer.name,
    });
    await delay(300);

    const evAfter = await getLatestEvent(id2);
    const ownerAfter2 = evAfter.NewOwner;
    assert(ownerAfter2 === ACTORS.retailer.id, 'Owner after status change: Retailer (same)');
    assert(evAfter.PrevOwner === ACTORS.retailer.id, 'PrevOwner === Retailer');
    assert(evAfter.NewOwner === ACTORS.retailer.id, 'NewOwner === Retailer (same)');
    console.log('       -> Ownership preserved during status change');

    // ─── TC-03: Sold product cannot be transferred ───────────────────────────
    console.log('\n[TC-03] Sold product cannot be transferred...');
    const id3 = `TEST-SOLD03-${Date.now()}`;
    await createAndAdvanceToDelivered(id3);
    await req('PUT', `${GATEWAY_URL}/api/products/${id3}/status`, {
        newStatus: 'Sold',
        updatedAt: now(),
        actorID: ACTORS.retailer.id,
        actorName: ACTORS.retailer.name,
    });
    await delay(300);

    const err3 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products/${id3}/transfer`, {
            newOwner: 'new-owner-001',
            newOwnerRole: 'Retailer',
            newOwnerName: 'New Retailer',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
    });
    assert(err3, 'Transfer sold product returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-04: Sold product cannot be shipped ──────────────────────────────
    console.log('\n[TC-04] Sold product cannot be shipped...');
    const err4 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products/${id3}/ship`, {
            distributorID: 'new-dist-001',
            distributorName: 'New Distributor',
            timestamp: now(),
            location: 'X',
        });
    });
    assert(err4, 'Ship sold product returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-05: Sold product cannot be delivered ────────────────────────────
    console.log('\n[TC-05] Sold product cannot be delivered...');
    const err5 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products/${id3}/receive`, {
            retailerID: 'new-ret-001',
            retailerName: 'New Retailer',
            timestamp: now(),
            location: 'X',
        });
    });
    assert(err5, 'Deliver sold product returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-06: Cannot skip status (Sold → Delivered invalid) ──────────────
    console.log('\n[TC-06] Invalid transition from Sold...');
    const err6 = await expectError(async () => {
        await req('PUT', `${GATEWAY_URL}/api/products/${id3}/status`, {
            newStatus: 'Delivered',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
    });
    assert(err6, 'Sold → Delivered returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-07: Status change on new product (Registered → Sold invalid) ────
    console.log('\n[TC-07] Status change on product with no events...');
    const id7 = `TEST-SOLD07-${Date.now()}`;
    await req('POST', `${GATEWAY_URL}/api/products`, {
        id: id7,
        refID: `ref-${id7}`,
        farmerID: ACTORS.farmer.id,
        farmerName: ACTORS.farmer.name,
        qrCode: `https://x.com/${id7}`,
        createdAt: now(),
    });
    await delay(300);

    // Try to change to Sold directly from Registered (invalid)
    const err7 = await expectError(async () => {
        await req('PUT', `${GATEWAY_URL}/api/products/${id7}/status`, {
            newStatus: 'Sold',
            updatedAt: now(),
            actorID: ACTORS.farmer.id,
            actorName: ACTORS.farmer.name,
        });
    });
    assert(err7, 'Registered → Sold (invalid) returns error 500');
    console.log('       -> Correctly rejected');

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

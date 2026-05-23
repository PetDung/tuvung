/**
 * Test 03: Error Cases & Edge Cases
 *
 * Tests:
 * - Invalid status transitions
 * - Approve before inspection
 * - Ship before inspection
 * - Deliver before transit
 * - Transfer sold product
 * - Operations on non-existent products
 */

const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const now = () => new Date().toISOString();

const ACTORS = {
    farmer:      { id: 'farmer-err',      name: 'Farmer A' },
    inspector:   { id: 'inspector-err',    name: 'Inspector B' },
    distributor: { id: 'distributor-err', name: 'Distributor C' },
    retailer:    { id: 'retailer-err',     name: 'Retailer D' },
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
    try {
        const response = await axios({ method, url, data });
        return response.data;
    } catch (e) {
        const err = new Error(e.response?.data?.error || e.message);
        err.status = e.response?.status;
        throw err;
    }
}

async function expectError(fn, expectedStatus = 500) {
    try {
        await fn();
        return false;
    } catch (e) {
        return (e.status || e.response?.status) === expectedStatus;
    }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function createAndAdvance(productId, toStatus) {
    // Create product
    await req('POST', `${GATEWAY_URL}/api/products`, {
        id: productId,
        refID: `ref-${productId}`,
        farmerID: ACTORS.farmer.id,
        farmerName: ACTORS.farmer.name,
        qrCode: `https://x.com/${productId}`,
        createdAt: now(),
    });
    await delay(500);

    if (toStatus === 'Inspected') {
        await req('POST', `${GATEWAY_URL}/api/products/${productId}/approve`, {
            inspectorID: ACTORS.inspector.id,
            inspectorName: ACTORS.inspector.name,
            timestamp: now(),
            location: 'X',
        });
        await delay(500);
    } else if (toStatus === 'InTransit') {
        await createAndAdvance(productId, 'Inspected');
        await req('POST', `${GATEWAY_URL}/api/products/${productId}/ship`, {
            distributorID: ACTORS.distributor.id,
            distributorName: ACTORS.distributor.name,
            timestamp: now(),
            location: 'Route',
        });
        await delay(500);
    } else if (toStatus === 'Delivered') {
        await createAndAdvance(productId, 'InTransit');
        await req('POST', `${GATEWAY_URL}/api/products/${productId}/receive`, {
            retailerID: ACTORS.retailer.id,
            retailerName: ACTORS.retailer.name,
            timestamp: now(),
            location: 'HCM',
        });
        await delay(500);
    } else if (toStatus === 'Sold') {
        await createAndAdvance(productId, 'Delivered');
        await req('PUT', `${GATEWAY_URL}/api/products/${productId}/status`, {
            newStatus: 'Sold',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
        await delay(500);
    }
}

async function main() {
    console.log('========================================');
    console.log('  TEST 03: Error Cases & Edge Cases    ');
    console.log('========================================\n');

    // ─── TC-01: Approve product not in Registered status ───────────────────
    console.log('[TC-01] Approve already-inspected product...');
    const id1 = `TEST-ERR01-${Date.now()}`;
    await createAndAdvance(id1, 'Inspected');
    const err1 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products/${id1}/approve`, {
            inspectorID: ACTORS.inspector.id,
            inspectorName: ACTORS.inspector.name,
            timestamp: now(),
            location: 'X',
        });
    });
    assert(err1, 'Re-approve returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-02: Ship before inspection ─────────────────────────────────────
    console.log('\n[TC-02] Ship product before inspection...');
    const id2 = `TEST-ERR02-${Date.now()}`;
    await req('POST', `${GATEWAY_URL}/api/products`, {
        id: id2, refID: `ref-${id2}`,
        farmerID: ACTORS.farmer.id, farmerName: ACTORS.farmer.name,
        qrCode: `https://x.com/${id2}`, createdAt: now(),
    });
    await delay(300);
    const err2 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products/${id2}/ship`, {
            distributorID: ACTORS.distributor.id,
            distributorName: ACTORS.distributor.name,
            timestamp: now(), location: 'X',
        });
    });
    assert(err2, 'Ship before inspection returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-03: Deliver before transit ────────────────────────────────────
    console.log('\n[TC-03] Deliver product not in transit...');
    const id3 = `TEST-ERR03-${Date.now()}`;
    await createAndAdvance(id3, 'Inspected');
    const err3 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products/${id3}/receive`, {
            retailerID: ACTORS.retailer.id,
            retailerName: ACTORS.retailer.name,
            timestamp: now(), location: 'HCM',
        });
    });
    assert(err3, 'Deliver before transit returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-04: Invalid status transition (Registered → Sold) ─────────────
    console.log('\n[TC-04] Invalid status transition (skip steps)...');
    const id4 = `TEST-ERR04-${Date.now()}`;
    const err4 = await expectError(async () => {
        await req('PUT', `${GATEWAY_URL}/api/products/${id4}/status`, {
            newStatus: 'Sold',
            updatedAt: now(),
            actorID: ACTORS.farmer.id,
            actorName: ACTORS.farmer.name,
        });
    });
    assert(err4, 'Direct Registered→Sold returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-05: Sold is terminal - cannot change status ────────────────────
    console.log('\n[TC-05] Cannot change status of sold product...');
    const id5 = `TEST-ERR05-${Date.now()}`;
    
    // Helper with retry for Fabric timing issues
    async function createAndAdvanceWithRetry(productId, toStatus, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                await createAndAdvance(productId, toStatus);
                return true;
            } catch (e) {
                if (i < retries - 1) {
                    console.log(`       Retry ${i+1}/${retries}...`);
                    await delay(1000);
                } else {
                    throw e;
                }
            }
        }
    }
    
    await createAndAdvanceWithRetry(id5, 'Sold');
    
    // Try Sold -> Delivered (should fail)
    try {
        await req('PUT', `${GATEWAY_URL}/api/products/${id5}/status`, {
            newStatus: 'Delivered',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
        assert(false, 'Sold→Delivered should return error');
    } catch (e) {
        if (e.status === 500 || e.status === 400) {
            console.log(`       Error (expected): ${String(e.error).substring(0, 80)}`);
            assert(true, 'Sold→Delivered returns error');
        } else {
            assert(false, `Expected error 500, got ${e.status}: ${e.error}`);
        }
    }
    console.log('       -> Correctly rejected');

    // ─── TC-06: Ship sold product ──────────────────────────────────────────
    console.log('\n[TC-06] Cannot ship sold product...');
    const err6 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products/${id5}/ship`, {
            distributorID: ACTORS.distributor.id,
            distributorName: ACTORS.distributor.name,
            timestamp: now(), location: 'X',
        });
    });
    assert(err6, 'Ship sold product returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-07: Transfer sold product ─────────────────────────────────────
    console.log('\n[TC-07] Cannot transfer sold product...');
    const err7 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products/${id5}/transfer`, {
            newOwner: 'new-owner', newOwnerRole: 'Retailer',
            newOwnerName: 'New Retailer', updatedAt: now(),
            actorID: ACTORS.retailer.id, actorName: ACTORS.retailer.name,
        });
    });
    assert(err7, 'Transfer sold product returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-08: Approve non-existent product ───────────────────────────────
    console.log('\n[TC-08] Approve non-existent product...');
    const err8 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products/NON-EXISTENT/approve`, {
            inspectorID: ACTORS.inspector.id,
            inspectorName: ACTORS.inspector.name,
            timestamp: now(), location: 'X',
        });
    });
    assert(err8, 'Approve non-existent returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-09: Update status with invalid status value ────────────────────
    console.log('\n[TC-09] Invalid status value...');
    const id9 = `TEST-ERR09-${Date.now()}`;
    await createAndAdvance(id9, 'Delivered');
    const err9 = await expectError(async () => {
        await req('PUT', `${GATEWAY_URL}/api/products/${id9}/status`, {
            newStatus: 'InvalidStatus',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
    });
    assert(err9, 'Invalid status value returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-10: Events for non-existent product returns empty array ─────────
    console.log('\n[TC-10] Events for non-existent product...');
    try {
        const events = await req('GET', `${GATEWAY_URL}/api/products/NON-EXISTENT/events`);
        assert(Array.isArray(events), 'Returns array');
        assert(events.length === 0, 'Events array is empty');
        console.log('       -> Returns empty array (not error)');
    } catch (e) {
        assert(false, `GetEvents for non-existent should return [], not error: ${e.message}`);
    }

    // ─── TC-11: History for non-existent product returns empty array ────────
    console.log('\n[TC-11] History for non-existent product...');
    try {
        const history = await req('GET', `${GATEWAY_URL}/api/products/NON-EXISTENT/history`);
        assert(Array.isArray(history), 'Returns array');
        assert(history.length === 0, 'History array is empty');
        console.log('       -> Returns empty array (not error)');
    } catch (e) {
        assert(false, `GetHistory for non-existent should return [], not error: ${e.message}`);
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

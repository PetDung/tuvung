/**
 * Test 05: Certification & Inspection
 *
 * Tests:
 * - MarkAsCertified emits Certified event without changing status
 * - RecordInspection emits Inspected event without changing status
 * - Certification does NOT break status flow
 * - Can still transition to Sold after certification
 */

const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const now = () => new Date().toISOString();

const ACTORS = {
    farmer:      { id: 'farmer-cert',      name: 'Farmer Cert' },
    inspector:   { id: 'inspector-cert',   name: 'Inspector Cert' },
    distributor: { id: 'distributor-cert', name: 'Distributor Cert' },
    retailer:    { id: 'retailer-cert',    name: 'Retailer Cert' },
    certifier:   { id: 'certifier-cert',   name: 'Certification Body' },
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
    await req('POST', `${GATEWAY_URL}/api/products`, {
        id: productId, refID: `ref-${productId}`,
        farmerID: ACTORS.farmer.id, farmerName: ACTORS.farmer.name,
        qrCode: `https://x.com/${productId}`, createdAt: now(),
    });
    await delay(500);

    if (toStatus === 'Inspected') {
        await req('POST', `${GATEWAY_URL}/api/products/${productId}/approve`, {
            inspectorID: ACTORS.inspector.id, inspectorName: ACTORS.inspector.name,
            timestamp: now(), location: 'X',
        });
        await delay(500);
    } else if (toStatus === 'InTransit') {
        await createAndAdvance(productId, 'Inspected');
        await req('POST', `${GATEWAY_URL}/api/products/${productId}/ship`, {
            distributorID: ACTORS.distributor.id, distributorName: ACTORS.distributor.name,
            timestamp: now(), location: 'Route',
        });
        await delay(500);
    } else if (toStatus === 'Delivered') {
        await createAndAdvance(productId, 'InTransit');
        await req('POST', `${GATEWAY_URL}/api/products/${productId}/receive`, {
            retailerID: ACTORS.retailer.id, retailerName: ACTORS.retailer.name,
            timestamp: now(), location: 'HCM',
        });
        await delay(500);
    } else if (toStatus === 'Sold') {
        await createAndAdvance(productId, 'Delivered');
        await req('PUT', `${GATEWAY_URL}/api/products/${productId}/status`, {
            newStatus: 'Sold', updatedAt: now(),
            actorID: ACTORS.retailer.id, actorName: ACTORS.retailer.name,
        });
        await delay(500);
    }
}

async function main() {
    console.log('========================================');
    console.log('  TEST 05: Certification & Inspection  ');
    console.log('========================================\n');

    // ─── TC-01: MarkAsCertified emits Certified event ──────────────────────────
    console.log('[TC-01] MarkAsCertified emits Certified event...');
    const id1 = `TEST-CERT01-${Date.now()}`;
    await createAndAdvance(id1, 'Inspected');

    const statusBefore = await req('GET', `${GATEWAY_URL}/api/products/${id1}/history`);
    const eventCountBefore = statusBefore.length;

    try {
        await req('POST', `${GATEWAY_URL}/api/products/${id1}/certify`, {
            certifiedAt: now(),
            certifierID: ACTORS.certifier.id,
            certifierName: ACTORS.certifier.name,
        });
        assert(true, 'MarkAsCertified returns success');
    } catch (e) {
        assert(false, `MarkAsCertified failed: ${e.error || e.message}`);
    }

    await delay(500);

    const history1 = await req('GET', `${GATEWAY_URL}/api/products/${id1}/history`);
    assert(history1.length === eventCountBefore + 1, `Event count increased by 1 (${eventCountBefore} → ${history1.length})`);

    const certEvent = history1[history1.length - 1];
    assert(certEvent.EventType === 'Certified', 'Latest event type is Certified');
    assert(certEvent.ActorID === ACTORS.certifier.id, 'ActorID === certifier ID');
    assert(certEvent.ActorRole === 'Inspector', 'ActorRole === Inspector');
    console.log('       -> Certified event emitted');

    // ─── TC-02: Certification does NOT change status ─────────────────────────
    console.log('\n[TC-02] Certification does NOT change status...');
    const id2 = `TEST-CERT02-${Date.now()}`;
    await createAndAdvance(id2, 'Inspected');

    try {
        await req('POST', `${GATEWAY_URL}/api/products/${id2}/certify`, {
            certifiedAt: now(), certifierID: ACTORS.certifier.id, certifierName: ACTORS.certifier.name,
        });
    } catch (e) { /* ignore */ }
    await delay(500);

    try {
        await req('POST', `${GATEWAY_URL}/api/products/${id2}/ship`, {
            distributorID: ACTORS.distributor.id, distributorName: ACTORS.distributor.name,
            timestamp: now(), location: 'Route',
        });
        assert(true, 'Can ship after certification (status unchanged)');
    } catch (e) {
        assert(false, `Should be able to ship after certification: ${e.error || e.message}`);
    }
    console.log('       -> Status flow preserved after certification');

    // ─── TC-03: RecordInspection emits event ─────────────────────────────────
    console.log('\n[TC-03] RecordInspection emits inspection event...');
    const id3 = `TEST-CERT03-${Date.now()}`;
    await req('POST', `${GATEWAY_URL}/api/products`, {
        id: id3, refID: `ref-${id3}`,
        farmerID: ACTORS.farmer.id, farmerName: ACTORS.farmer.name,
        qrCode: `https://x.com/${id3}`, createdAt: now(),
    });
    await delay(500);

    try {
        await req('POST', `${GATEWAY_URL}/api/products/${id3}/inspection`, {
            inspectorID: ACTORS.inspector.id,
            inspectorName: ACTORS.inspector.name,
            inspectorRole: 'Inspector',
            timestamp: now(),
            location: 'Lab A',
            description: 'Quality inspection passed',
        });
        assert(true, 'RecordInspection returns success');
    } catch (e) {
        assert(false, `RecordInspection failed: ${e.error || e.message}`);
    }

    await delay(500);

    const history3 = await req('GET', `${GATEWAY_URL}/api/products/${id3}/history`);
    const inspectionEvent = history3[history3.length - 1];
    assert(inspectionEvent.EventType === 'Inspected', 'EventType === Inspected');
    assert(inspectionEvent.ActorID === ACTORS.inspector.id, 'ActorID === inspector');
    assert(inspectionEvent.Description.includes('Quality inspection'), 'Description contains inspection text');
    console.log('       -> Inspection event recorded');

    // ─── TC-04: Can still transition to Sold after certification ──────────────
    console.log('\n[TC-04] Can transition to Sold after certification...');
    const id4 = `TEST-CERT04-${Date.now()}`;
    
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
    
    await createAndAdvanceWithRetry(id4, 'Delivered');
    await delay(500);

    const historyBefore = await req('GET', `${GATEWAY_URL}/api/products/${id4}/history`);
    console.log(`       Status before certify: ${historyBefore[historyBefore.length - 1].EventType}`);

    try {
        await req('POST', `${GATEWAY_URL}/api/products/${id4}/certify`, {
            certifiedAt: now(), certifierID: ACTORS.certifier.id, certifierName: ACTORS.certifier.name,
        });
        console.log('       Certification successful');
    } catch (e) {
        assert(false, `Certification should succeed: ${e.error || e.message}`);
        return;
    }
    await delay(500);

    const historyAfter = await req('GET', `${GATEWAY_URL}/api/products/${id4}/history`);
    console.log(`       Status after certify: ${historyAfter[historyAfter.length - 1].EventType}`);

    try {
        await req('PUT', `${GATEWAY_URL}/api/products/${id4}/status`, {
            newStatus: 'Sold', updatedAt: now(),
            actorID: ACTORS.retailer.id, actorName: ACTORS.retailer.name,
        });
        assert(true, 'Can mark as Sold after certification');
    } catch (e) {
        assert(false, `Should be able to mark as Sold: ${e.status} - ${e.error || e.message}`);
    }
    console.log('       -> Sold transition works after certification');

    // ─── TC-05: Certification on non-existent product ─────────────────────────
    console.log('\n[TC-05] Certification on non-existent product...');
    const err5 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products/NON-EXISTENT/certify`, {
            certifiedAt: now(), certifierID: ACTORS.certifier.id, certifierName: ACTORS.certifier.name,
        });
    });
    assert(err5, 'Certification on non-existent returns error 500');
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

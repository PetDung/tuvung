/**
 * Test 01: Create Product
 *
 * Contract: CreateProduct(id, refID, farmerID, farmerName, qrCode, createdAt)
 *
 * Expected behavior:
 * - Creates immutable Product record with ONLY: ID, RefID, FarmerID, FarmerName, QRCode, CreatedAt
 * - Emits "Registered" event with: ActorID=FarmerID, ActorRole="Farmer", PrevOwner=NewOwner=FarmerID
 * - Returns error if duplicate ID (500)
 * - Returns error if missing required fields (400)
 *
 * Product is IMMUTABLE - NO Status, CurrentOwner, CurrentRole, Certified, UpdatedAt fields
 */

const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const now = () => new Date().toISOString();

const ACTOR = {
    farmer: { id: 'farmer-001', name: 'Nguyen Van A' },
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

// Get latest event by timestamp from history (sorted by timestamp)
async function getLatestEvent(productId) {
    const history = await req('GET', `${GATEWAY_URL}/api/products/${productId}/history`);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
}

async function main() {
    console.log('========================================');
    console.log('  TEST 01: Create Product             ');
    console.log('========================================\n');

    // ─── TC-01: Create valid product ───────────────────────────────────────
    console.log('[TC-01] Create valid product...');
    const productId = `TEST-CREATE-${Date.now()}`;
    const refId = `ref-${Date.now()}`;
    try {
        const res = await req('POST', `${GATEWAY_URL}/api/products`, {
            id: productId,
            refID: refId,
            farmerID: ACTOR.farmer.id,
            farmerName: ACTOR.farmer.name,
            qrCode: `https://agri.trace/v1/${refId}`,
            createdAt: now(),
        });
        assert(res.success === true, 'CreateProduct returns success: true');
        assert(!!res.txId, 'CreateProduct returns txId');
        console.log(`       txId: ${res.txId}`);
    } catch (e) {
        assert(false, `CreateProduct failed: ${e.response?.data?.error || e.message}`);
    }

    await delay(500);

    // ─── TC-02: ReadProduct returns only immutable fields ───────────────────
    console.log('\n[TC-02] ReadProduct returns only immutable fields...');
    try {
        const product = await req('GET', `${GATEWAY_URL}/api/products/${productId}`);
        assert(product.ID === productId, `ID === ${productId}`);
        assert(product.RefID === refId, `RefID === ${refId}`);
        assert(product.FarmerID === ACTOR.farmer.id, `FarmerID === ${ACTOR.farmer.id}`);
        assert(product.FarmerName === ACTOR.farmer.name, `FarmerName === ${ACTOR.farmer.name}`);
        assert(!!product.CreatedAt, 'CreatedAt is set');

        // Product is IMMUTABLE - these fields must NOT exist
        assert(product.Status === undefined, 'Status field does NOT exist on Product');
        assert(product.CurrentOwner === undefined, 'CurrentOwner field does NOT exist on Product');
        assert(product.CurrentRole === undefined, 'CurrentRole field does NOT exist on Product');
        assert(product.Certified === undefined, 'Certified field does NOT exist on Product');
        assert(product.UpdatedAt === undefined, 'UpdatedAt field does NOT exist on Product');
    } catch (e) {
        assert(false, `ReadProduct failed: ${e.response?.data?.error || e.message}`);
    }

    // ─── TC-03: History after creation (sorted by timestamp) ───────────────
    console.log('\n[TC-03] History after creation (sorted by timestamp)...');
    try {
        const history = await req('GET', `${GATEWAY_URL}/api/products/${productId}/history`);
        assert(history.length === 1, `Exactly 1 event (got ${history.length})`);

        const event = history[0];
        assert(event.EventType === 'Registered', `EventType === "Registered"`);
        assert(event.ActorID === ACTOR.farmer.id, `ActorID === farmer ID`);
        assert(event.ActorName === ACTOR.farmer.name, `ActorName === farmer name`);
        assert(event.ActorRole === 'Farmer', `ActorRole === "Farmer"`);
        assert(event.PrevOwner === ACTOR.farmer.id, `PrevOwner === farmer ID`);
        assert(event.NewOwner === ACTOR.farmer.id, `NewOwner === farmer ID`);
        assert(!!event.TxID, 'TxID is set');
        assert(!!event.Timestamp, 'Timestamp is set');
    } catch (e) {
        assert(false, `GetHistory failed: ${e.response?.data?.error || e.message}`);
    }

    // ─── TC-04: Duplicate creation rejected ────────────────────────────────
    console.log('\n[TC-04] Duplicate creation rejected...');
    const isError = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products`, {
            id: productId,
            refID: 'another-ref',
            farmerID: ACTOR.farmer.id,
            farmerName: ACTOR.farmer.name,
            qrCode: 'https://x.com',
        });
    });
    assert(isError, 'Duplicate creation returns error 500');
    console.log('       -> Correctly rejected');

    // ─── TC-05: Missing required fields (400 Bad Request) ───────────────────
    console.log('\n[TC-05] Missing required fields rejected...');

    // Missing id → 400
    const err1 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products`, {
            refID: 'x', farmerID: 'y', qrCode: 'z',
        });
    }, 400);
    assert(err1, 'Missing id returns 400');

    // Missing refID → 400
    const err2 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products`, {
            id: 'x', farmerID: 'y', qrCode: 'z',
        });
    }, 400);
    assert(err2, 'Missing refID returns 400');

    // Missing farmerID → 400
    const err3 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products`, {
            id: 'x', refID: 'y', qrCode: 'z',
        });
    }, 400);
    assert(err3, 'Missing farmerID returns 400');

    // Missing qrCode → 400
    const err4 = await expectError(async () => {
        await req('POST', `${GATEWAY_URL}/api/products`, {
            id: 'x', refID: 'y', farmerID: 'z',
        });
    }, 400);
    assert(err4, 'Missing qrCode returns 400');

    // ─── TC-06: Read non-existent product ─────────────────────────────────
    console.log('\n[TC-06] Read non-existent product...');
    const err404 = await expectError(async () => {
        await req('GET', `${GATEWAY_URL}/api/products/NON-EXISTENT`);
    }, 404);
    assert(err404, 'Read non-existent returns 404');

    // ─── TC-07: QR Payload ───────────────────────────────────────────────
    console.log('\n[TC-07] Generate QR payload...');
    try {
        const qr = await req('GET', `${GATEWAY_URL}/api/products/${productId}/qr-payload`);
        assert(qr.id === productId, `QR id === productId`);
        assert(qr.refId === refId, `QR refId === refId`);
        assert(qr.farm === ACTOR.farmer.name, `QR farm === farmer name`);
        assert(qr.url === `https://agri.trace/v1/${refId}`, `QR url matches`);
        assert(qr.status === undefined, 'QR payload does NOT contain status');
    } catch (e) {
        assert(false, `QR payload failed: ${e.response?.data?.error || e.message}`);
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

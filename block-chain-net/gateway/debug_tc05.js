const axios = require('axios');

const GATEWAY_URL = 'http://localhost:4000';

async function req(method, url, data) {
    const response = await axios({ method, url, data });
    return response.data;
}

async function expectError(fn, expectedStatus = 500) {
    try {
        await fn();
        return false;
    } catch (e) {
        console.log(`     expectError caught: status=${e.response?.status}, hasData=${!!e.response?.data}`);
        console.log(`     Error message: ${e.response?.data?.error || e.message}`);
        return e.response && e.response.status === expectedStatus;
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

async function createAndAdvance(productId, toStatus) {
    await req('POST', `${GATEWAY_URL}/api/products`, {
        id: productId,
        refID: `ref-${productId}`,
        farmerID: ACTORS.farmer.id,
        farmerName: ACTORS.farmer.name,
        qrCode: `https://x.com/${productId}`,
        createdAt: now(),
    });
    await delay(300);

    if (toStatus === 'Inspected') {
        await req('POST', `${GATEWAY_URL}/api/products/${productId}/approve`, {
            inspectorID: ACTORS.inspector.id,
            inspectorName: ACTORS.inspector.name,
            timestamp: now(),
            location: 'X',
        });
        await delay(300);
    } else if (toStatus === 'InTransit') {
        await createAndAdvance(productId, 'Inspected');
        await req('POST', `${GATEWAY_URL}/api/products/${productId}/ship`, {
            distributorID: ACTORS.distributor.id,
            distributorName: ACTORS.distributor.name,
            timestamp: now(),
            location: 'Route',
        });
        await delay(300);
    } else if (toStatus === 'Delivered') {
        await createAndAdvance(productId, 'InTransit');
        await req('POST', `${GATEWAY_URL}/api/products/${productId}/receive`, {
            retailerID: ACTORS.retailer.id,
            retailerName: ACTORS.retailer.name,
            timestamp: now(),
            location: 'HCM',
        });
        await delay(300);
    } else if (toStatus === 'Sold') {
        await createAndAdvance(productId, 'Delivered');
        await req('PUT', `${GATEWAY_URL}/api/products/${productId}/status`, {
            newStatus: 'Sold',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
        await delay(300);
    }
}

async function main() {
    console.log('[TC-05] Cannot change status of sold product...');
    const id5 = `TEST-ERR05-${Date.now()}`;
    console.log(`  Product ID: ${id5}`);
    
    try {
        await createAndAdvance(id5, 'Sold');
    } catch (e) {
        console.log(`  Failed to create/sold product: ${e.message}`);
        return;
    }
    await delay(500);
    
    console.log('  Attempting Sold -> Delivered...');
    const err5 = await expectError(async () => {
        await req('PUT', `${GATEWAY_URL}/api/products/${id5}/status`, {
            newStatus: 'Delivered',
            updatedAt: now(),
            actorID: ACTORS.retailer.id,
            actorName: ACTORS.retailer.name,
        });
    });
    
    console.log(`  expectError returned: ${err5}`);
    
    if (err5) {
        console.log('  -> Correctly rejected');
    } else {
        console.log('  -> FAIL: Expected error but got success!');
    }
}

main().catch(console.error);

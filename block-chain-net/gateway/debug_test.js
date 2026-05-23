const axios = require('axios');

const GATEWAY_URL = 'http://localhost:4000';

async function debug() {
    console.log('=== Debug: Sold->Delivered ===');
    
    // Create product
    const productId = `DEBUG-${Date.now()}`;
    console.log(`Product ID: ${productId}`);
    
    // Create
    await axios.post(`${GATEWAY_URL}/api/products`, {
        id: productId, refID: 'ref', farmerID: 'farmer', farmerName: 'Farmer', qrCode: 'http://x.com'
    });
    console.log('Created');
    
    // Approve
    await axios.post(`${GATEWAY_URL}/api/products/${productId}/approve`, {
        inspectorID: 'insp', inspectorName: 'Ins', timestamp: new Date().toISOString(), location: 'X'
    });
    console.log('Approved');
    
    // Ship
    await axios.post(`${GATEWAY_URL}/api/products/${productId}/ship`, {
        distributorID: 'dist', distributorName: 'Dist', timestamp: new Date().toISOString(), location: 'X'
    });
    console.log('Shipped');
    
    // Receive
    await axios.post(`${GATEWAY_URL}/api/products/${productId}/receive`, {
        retailerID: 'ret', retailerName: 'Ret', timestamp: new Date().toISOString(), location: 'X'
    });
    console.log('Received');
    
    // Mark as Sold
    await axios.put(`${GATEWAY_URL}/api/products/${productId}/status`, {
        newStatus: 'Sold', updatedAt: new Date().toISOString(), actorID: 'ret', actorName: 'Ret'
    });
    console.log('Sold');
    
    // Check history
    const history = await axios.get(`${GATEWAY_URL}/api/products/${productId}/history`);
    console.log('History:', JSON.stringify(history.data, null, 2));
    
    // Try Sold -> Delivered
    console.log('\nTrying Sold -> Delivered...');
    try {
        await axios.put(`${GATEWAY_URL}/api/products/${productId}/status`, {
            newStatus: 'Delivered', updatedAt: new Date().toISOString(), actorID: 'ret', actorName: 'Ret'
        });
        console.log('SUCCESS (unexpected!)');
    } catch (e) {
        console.log(`ERROR ${e.response?.status}: ${e.response?.data?.error}`);
    }
    
    // Now test certification
    console.log('\n=== Debug: Certification -> Sold ===');
    const productId2 = `DEBUG2-${Date.now()}`;
    
    await axios.post(`${GATEWAY_URL}/api/products`, {
        id: productId2, refID: 'ref', farmerID: 'farmer', farmerName: 'Farmer', qrCode: 'http://x.com'
    });
    await axios.post(`${GATEWAY_URL}/api/products/${productId2}/approve`, {
        inspectorID: 'insp', inspectorName: 'Ins', timestamp: new Date().toISOString(), location: 'X'
    });
    await axios.post(`${GATEWAY_URL}/api/products/${productId2}/ship`, {
        distributorID: 'dist', distributorName: 'Dist', timestamp: new Date().toISOString(), location: 'X'
    });
    await axios.post(`${GATEWAY_URL}/api/products/${productId2}/receive`, {
        retailerID: 'ret', retailerName: 'Ret', timestamp: new Date().toISOString(), location: 'X'
    });
    console.log('Advanced to Delivered');
    
    // Certify
    await axios.post(`${GATEWAY_URL}/api/products/${productId2}/certify`, {
        certifiedAt: new Date().toISOString(), certifierID: 'cert', certifierName: 'Cert'
    });
    console.log('Certified');
    
    // Check history
    const history2 = await axios.get(`${GATEWAY_URL}/api/products/${productId2}/history`);
    console.log('History:', JSON.stringify(history2.data, null, 2));
    
    // Try Mark as Sold
    console.log('\nTrying Delivered -> Sold after certification...');
    try {
        await axios.put(`${GATEWAY_URL}/api/products/${productId2}/status`, {
            newStatus: 'Sold', updatedAt: new Date().toISOString(), actorID: 'ret', actorName: 'Ret'
        });
        console.log('SUCCESS');
    } catch (e) {
        console.log(`ERROR ${e.response?.status}: ${e.response?.data?.error}`);
    }
}

debug().catch(console.error);

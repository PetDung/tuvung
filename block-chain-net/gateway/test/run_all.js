/**
 * Test Runner - Runs all tests sequentially
 *
 * Usage:
 *   node test/run_all.js
 *
 * Environment:
 *   GATEWAY_URL=http://localhost:4000
 */

const { spawn } = require('child_process');
const path = require('path');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const tests = [
    '01_create_product.test.js',
    '02_lifecycle.test.js',
    '03_error_cases.test.js',
    '04_status_change.test.js',
    '05_certification.test.js',
];

async function runTest(testFile) {
    return new Promise((resolve) => {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`  Running: ${testFile}`);
        console.log('='.repeat(50) + '\n');

        const env = { ...process.env, GATEWAY_URL };
        const child = spawn('node', [testFile], {
            cwd: path.join(__dirname),
            env,
            stdio: 'inherit',
        });

        child.on('close', (code) => {
            resolve(code);
        });
    });
}

async function main() {
    console.log('========================================');
    console.log('  AgriTrace Gateway Test Suite         ');
    console.log('========================================');
    console.log(`  Gateway: ${GATEWAY_URL}`);
    console.log(`  Tests:   ${tests.length}`);
    console.log('========================================');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const test of tests) {
        const code = await runTest(test);
        if (code === 0) {
            totalPassed++;
        } else {
            totalFailed++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('  FINAL RESULTS');
    console.log('='.repeat(50));
    console.log(`  Tests passed: ${totalPassed}/${tests.length}`);
    console.log(`  Tests failed: ${totalFailed}/${tests.length}`);
    console.log('='.repeat(50));

    if (totalFailed > 0) {
        console.log('\n  Some tests failed!');
        process.exit(1);
    } else {
        console.log('\n  All tests passed!');
    }
}

main().catch((err) => {
    console.error('Runner error:', err.message);
    process.exit(1);
});

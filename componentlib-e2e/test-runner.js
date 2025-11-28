#!/usr/bin/env node

/**
 * Component Library E2E Test Runner
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Find all test files
const testDir = __dirname;
const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js'))
    .sort();

console.log('='.repeat(70));
console.log('Component Library E2E Test Suite');
console.log('='.repeat(70));
console.log(`Found ${testFiles.length} test files\n`);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testFile) {
    return new Promise((resolve) => {
        console.log(`\n📦 Running: ${testFile}`);
        console.log('-'.repeat(70));

        const child = spawn('node', [path.join(testDir, testFile)], {
            stdio: 'inherit',
            env: { ...process.env, FORCE_COLOR: '1' }
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${testFile} passed\n`);
                resolve({ passed: true, file: testFile });
            } else {
                console.log(`❌ ${testFile} failed with code ${code}\n`);
                resolve({ passed: false, file: testFile });
            }
        });
    });
}

async function runAllTests() {
    const results = [];

    for (const testFile of testFiles) {
        const result = await runTest(testFile);
        results.push(result);

        if (result.passed) {
            passedTests++;
        } else {
            failedTests++;
        }
        totalTests++;
    }

    console.log('='.repeat(70));
    console.log('Test Summary');
    console.log('='.repeat(70));
    console.log(`Total: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
    console.log('='.repeat(70));

    if (failedTests > 0) {
        console.log('\nFailed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  ❌ ${r.file}`);
        });
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    }
}

runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

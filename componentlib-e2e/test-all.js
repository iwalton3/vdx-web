#!/usr/bin/env node
/**
 * Run All Tests
 *
 * Runs both framework unit tests and component E2E tests
 */

const { spawn } = require('child_process');
const path = require('path');

function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            stdio: 'inherit',
            shell: true
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`${command} exited with code ${code}`));
            } else {
                resolve();
            }
        });

        proc.on('error', (error) => {
            reject(error);
        });
    });
}

async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          Running All Tests - Framework + E2E              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    let frameworkPassed = false;
    let e2ePassed = false;

    // Run framework unit tests
    try {
        console.log('\n┌─────────────────────────────────────────────────────────┐');
        console.log('│  Step 1/2: Framework Unit Tests                        │');
        console.log('└─────────────────────────────────────────────────────────┘\n');

        await runCommand('node', ['run-framework-tests.js']);
        frameworkPassed = true;
        console.log('\n✅ Framework unit tests passed!\n');
    } catch (error) {
        console.error('\n❌ Framework unit tests failed!\n');
    }

    // Run E2E component tests
    try {
        console.log('\n┌─────────────────────────────────────────────────────────┐');
        console.log('│  Step 2/2: Component E2E Tests                         │');
        console.log('└─────────────────────────────────────────────────────────┘\n');

        await runCommand('node', ['test-runner.js']);
        e2ePassed = true;
        console.log('\n✅ E2E component tests passed!\n');
    } catch (error) {
        console.error('\n❌ E2E component tests failed!\n');
    }

    // Print final summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Final Summary                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`  Framework Unit Tests: ${frameworkPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Component E2E Tests:  ${e2ePassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('');

    if (frameworkPassed && e2ePassed) {
        console.log('🎉 All tests passed!\n');
        process.exit(0);
    } else {
        console.log('💥 Some tests failed\n');
        process.exit(1);
    }
}

runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

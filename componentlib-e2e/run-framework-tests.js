/**
 * Framework Unit Test Runner
 *
 * Uses Puppeteer to run the framework unit tests from /app/tests/index.html
 * and prints the results to console.
 */

const puppeteer = require('puppeteer');
const path = require('path');

const TEST_URL = process.env.TEST_URL || 'http://localhost:9000/tests/';
const VIEWPORT = { width: 1400, height: 900 };

async function runFrameworkTests() {
    console.log('🧪 Running Framework Unit Tests...\n');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport(VIEWPORT);

        // Capture all console output from the page
        const consoleMessages = [];
        page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();
            consoleMessages.push({ text, type });

            // Print console messages in real-time with appropriate formatting
            if (type === 'error') {
                console.error(text);
            } else {
                console.log(text);
            }
        });

        // Capture page errors
        page.on('pageerror', error => {
            console.error(`[PAGE ERROR] ${error.message}`);
        });

        // Navigate to test page
        console.log(`Loading test page: ${TEST_URL}\n`);
        await page.goto(TEST_URL, { waitUntil: 'networkidle2' });

        // Wait for tests to complete by checking for the test results summary
        // The test runner prints "Test Results:" when done
        await page.waitForFunction(
            () => {
                const consoleDiv = document.getElementById('console');
                return consoleDiv && consoleDiv.textContent.includes('Test Results:');
            },
            { timeout: 30000 }
        );

        // Give it a moment to finish printing
        await page.waitForTimeout(500);

        // Extract test results from the results div
        const results = await page.evaluate(() => {
            const resultsDiv = document.getElementById('results');
            if (!resultsDiv) return null;

            const stats = resultsDiv.querySelectorAll('.stat');
            const summary = {};

            stats.forEach(stat => {
                const label = stat.querySelector('.label')?.textContent.trim().replace(':', '');
                const value = stat.querySelector('.value')?.textContent.trim();
                if (label && value) {
                    summary[label] = value;
                }
            });

            return summary;
        });

        // Print summary
        if (results) {
            console.log('\n' + '='.repeat(60));
            console.log('\n📊 Test Summary:');
            console.log(`   Total:        ${results.Total || 0}`);
            console.log(`   Passed:       ${results.Passed || 0} ✅`);
            console.log(`   Failed:       ${results.Failed || 0}${results.Failed !== '0' ? ' ❌' : ''}`);
            console.log(`   Success Rate: ${results['Success Rate'] || '0%'}`);
            console.log('\n' + '='.repeat(60));

            // Exit with error code if tests failed
            if (results.Failed !== '0') {
                console.log('\n💥 Some tests failed\n');
                await browser.close();
                process.exit(1);
            } else {
                console.log('\n🎉 All tests passed!\n');
            }
        }

        await browser.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error running tests:');
        console.error(error.message);

        if (browser) {
            await browser.close();
        }

        process.exit(1);
    }
}

// Run the tests
runFrameworkTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

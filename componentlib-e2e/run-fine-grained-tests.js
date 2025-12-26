/**
 * Fine-Grained Renderer Test Runner
 *
 * Uses Puppeteer to run the fine-grained renderer tests
 */

const puppeteer = require('puppeteer');

const TEST_URL = 'http://localhost:9000/tests/fine-grained.html';

async function runTests() {
    console.log('🧪 Running Fine-Grained Renderer Tests...\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 900 });

        // Capture console output
        page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();
            if (type === 'error') {
                console.error(text);
            } else {
                console.log(text);
            }
        });

        page.on('pageerror', error => {
            console.error('[PAGE ERROR] ' + error.message);
        });

        console.log('Loading test page: ' + TEST_URL + '\n');
        await page.goto(TEST_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for tests to complete
        await page.waitForFunction(
            () => {
                const consoleDiv = document.getElementById('console');
                return consoleDiv && consoleDiv.textContent.includes('Test Results:');
            },
            { timeout: 60000 }
        );

        await new Promise(r => setTimeout(r, 500));

        // Get results
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

        if (results) {
            console.log('\n' + '='.repeat(60));
            console.log('\n📊 Fine-Grained Renderer Test Summary:');
            console.log('   Total:        ' + (results.Total || 0));
            console.log('   Passed:       ' + (results.Passed || 0) + ' ✅');
            console.log('   Failed:       ' + (results.Failed || 0) + (results.Failed !== '0' ? ' ❌' : ''));
            console.log('\n' + '='.repeat(60));

            if (results.Failed !== '0') {
                console.log('\n💥 Some tests failed\n');
            } else {
                console.log('\n🎉 All tests passed!\n');
            }
        }

        await browser.close();
        process.exit(results?.Failed === '0' ? 0 : 1);

    } catch (error) {
        console.error('Error:', error.message);
        await browser.close();
        process.exit(1);
    }
}

runTests();

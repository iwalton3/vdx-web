/**
 * Framework Unit Test Runner
 *
 * Uses Puppeteer to run the framework unit tests from /tests/framework/index.html
 * and prints the results to console.
 *
 * The page's console is streamed for reading along, but the verdict comes from
 * window.__VDX_TEST_RESULTS__, which the page sets from the runner's own state
 * once every test has run. Failing test names are printed from that object, so
 * they cannot be lost to console-stream ordering on the way out.
 */

const puppeteer = require('puppeteer');

const TEST_URL = process.env.TEST_URL || 'http://localhost:9000/tests/framework/';
const VIEWPORT = { width: 1400, height: 900 };
const TIMEOUT_MS = 90000;

async function runFrameworkTests() {
    console.log('🧪 Running Framework Unit Tests...\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport(VIEWPORT);

        let runnerStarted = false;
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('Running tests...')) runnerStarted = true;
            if (msg.type() === 'error') {
                console.error(text);
            } else {
                console.log(text);
            }
        });

        // Nothing will ever set the results flag if a test module fails to
        // load (a 404 is not a page error) or throws while importing, so those
        // end the wait now rather than at the timeout.
        let abort;
        const aborted = new Promise((_, reject) => { abort = reject; });
        aborted.catch(() => {});   // it may fire during goto, before the race below exists
        page.on('pageerror', error => {
            console.error(`[PAGE ERROR] ${error.message}`);
            if (!runnerStarted) abort(new Error(`uncaught before the runner started: ${error.message}`));
        });
        // Only until the runner starts: every test module is a static import,
        // so a load failure lands before then, and some tests deliberately
        // request URLs that must fail.
        page.on('response', res => {
            if (!runnerStarted && res.status() >= 400 && /\.(m?js|html)(\?|$)/.test(res.url())) {
                abort(new Error(`${res.status()} loading ${res.url()}`));
            }
        });
        page.on('requestfailed', req => {
            if (!runnerStarted) {
                abort(new Error(`${req.failure()?.errorText || 'request failed'} loading ${req.url()}`));
            }
        });

        console.log(`Loading test page: ${TEST_URL}\n`);
        await page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });

        let results;
        try {
            await Promise.race([
                page.waitForFunction(
                    () => window.__VDX_TEST_RESULTS__ !== undefined,
                    { timeout: TIMEOUT_MS, polling: 100 }
                ),
                aborted
            ]);
            results = await page.evaluate(() => window.__VDX_TEST_RESULTS__);
        } catch (error) {
            console.error('\n❌ The test page never reported results.');
            console.error(`   ${error.message}`);
            return 1;
        }

        const ok = results.failed === 0;
        console.log('\n' + '='.repeat(60));
        console.log('\n📊 Test Summary:');
        console.log(`   Total:        ${results.total}`);
        console.log(`   Passed:       ${results.passed} ✅`);
        console.log(`   Failed:       ${results.failed}${ok ? '' : ' ❌'}`);
        const rate = results.total > 0 ? Math.floor((results.passed / results.total) * 100) : 0;
        console.log(`   Success Rate: ${rate}%`);

        if (!ok) {
            console.log(`\n❌ Failing tests (${results.failures.length}):`);
            for (const f of results.failures) {
                console.log(`   ${f.suite} > ${f.name}`);
                console.log(`      ${f.message}`);
                if (f.expected !== undefined) {
                    console.log(`      Expected: ${f.expected}`);
                    console.log(`      Received: ${f.actual}`);
                }
            }
        }
        console.log('\n' + '='.repeat(60));
        console.log(ok ? '\n🎉 All tests passed!\n' : '\n💥 Some tests failed\n');
        return ok ? 0 : 1;
    } finally {
        await browser.close();
    }
}

runFrameworkTests().then(
    code => { process.exitCode = code; },
    error => {
        console.error('\n❌ Error running tests:');
        console.error(error.message);
        process.exitCode = 1;
    }
);

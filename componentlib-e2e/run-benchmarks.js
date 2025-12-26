/**
 * Benchmark Runner - Puppeteer
 *
 * Runs VDX benchmarks in headless Chrome and outputs results.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const BENCHMARK_URL = 'http://localhost:9000/benchmarks/';
const TIMEOUT = 10 * 60 * 1000; // 10 minutes max

async function runBenchmarks() {
    console.log('🏎️  VDX Performance Benchmark Runner\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--js-flags=--expose-gc']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 900 });

        // Capture console output
        page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'error') {
                console.error('[PAGE]', text);
            } else {
                console.log('[PAGE]', text);
            }
        });

        page.on('pageerror', error => {
            console.error('[ERROR]', error.message);
        });

        console.log('Loading benchmark page:', BENCHMARK_URL);
        await page.goto(BENCHMARK_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('Starting benchmarks...\n');

        // Click the run button
        await page.click('#runBaselineBtn');

        // Wait for benchmarks to complete
        await page.waitForFunction(
            () => {
                const status = document.getElementById('status');
                return status && (
                    status.textContent.includes('complete') ||
                    status.textContent.includes('failed')
                );
            },
            { timeout: TIMEOUT }
        );

        // Get results from localStorage
        const results = await page.evaluate(() => {
            const saved = localStorage.getItem('benchmark:vdom-baseline');
            return saved ? JSON.parse(saved) : null;
        });

        if (results) {
            console.log('\n' + '='.repeat(70));
            console.log('BENCHMARK RESULTS');
            console.log('='.repeat(70));
            console.log('Timestamp:', results.timestamp);
            console.log('');

            // Print formatted results
            for (const [category, suites] of Object.entries(results.results)) {
                console.log(`\n${category.toUpperCase()}:`);
                console.log('-'.repeat(50));

                for (const [suite, benchmarks] of Object.entries(suites)) {
                    console.log(`\n  ${suite}:`);

                    for (const [bench, stats] of Object.entries(benchmarks)) {
                        if (stats.error) {
                            console.log(`    ${bench}: ERROR - ${stats.error}`);
                        } else if (stats) {
                            const mean = stats.mean.toFixed(3).padStart(8);
                            const p95 = stats.p95.toFixed(3).padStart(8);
                            console.log(`    ${bench}`);
                            console.log(`      Mean: ${mean}ms  P95: ${p95}ms`);
                        }
                    }
                }
            }

            // Save to file
            const filename = `benchmark-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            fs.writeFileSync(filename, JSON.stringify(results, null, 2));
            console.log(`\n✅ Results saved to ${filename}`);
        } else {
            console.error('❌ No results captured');
            process.exit(1);
        }

        await browser.close();
        process.exit(0);

    } catch (error) {
        console.error('Benchmark failed:', error.message);
        await browser.close();
        process.exit(1);
    }
}

runBenchmarks();

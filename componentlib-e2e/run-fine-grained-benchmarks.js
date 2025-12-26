/**
 * Fine-Grained Benchmark Runner
 * Uses Puppeteer to run the fine-grained benchmarks
 */

const puppeteer = require('puppeteer');

const BENCHMARK_URL = 'http://localhost:9000/benchmarks/';

async function runBenchmarks() {
    console.log('🚀 Running Fine-Grained Benchmarks via Puppeteer...\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 900 });

        // Capture console output
        page.on('console', msg => {
            console.log(msg.text());
        });

        page.on('pageerror', error => {
            console.error('[PAGE ERROR] ' + error.message);
        });

        console.log('Loading benchmark page: ' + BENCHMARK_URL + '\n');
        await page.goto(BENCHMARK_URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Click "Run Fine-Grained" button
        await page.click('#runFineGrainedBtn');

        // Wait for benchmarks to complete (look for "FINE-GRAINED BENCHMARK COMPLETE" in console)
        await page.waitForFunction(
            () => {
                const consoleDiv = document.getElementById('console');
                return consoleDiv && consoleDiv.textContent.includes('FINE-GRAINED BENCHMARK COMPLETE');
            },
            { timeout: 600000 }  // 10 minutes max
        );

        console.log('\n✅ Fine-grained benchmarks complete!\n');

        // Get saved results from localStorage
        const results = await page.evaluate(() => {
            return localStorage.getItem('benchmark:fine-grained');
        });

        if (results) {
            const data = JSON.parse(results);
            console.log('Results saved at:', data.timestamp);
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

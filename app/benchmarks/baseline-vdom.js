/**
 * Baseline VDOM Benchmarks
 *
 * Run all benchmark suites and capture baseline (VDOM) performance.
 * Results are saved to localStorage for later comparison with fine-grained.
 */

import { saveResults, formatStats, generateComparison } from './harness.js';
import { runListBenchmarks } from './scenarios/list-benchmarks.js';
import { runComponentBenchmarks } from './scenarios/component-benchmarks.js';

// Import synthetic components (registers them)
import './scenarios/synthetic-components.js';

export async function runAllBenchmarks() {
    console.log('🏁 VDX Baseline Benchmark Suite (VDOM)');
    console.log('======================================\n');
    console.log('This will measure current VDOM performance as baseline.');
    console.log('Results will be saved for comparison after fine-grained migration.\n');

    const startTime = performance.now();
    const results = {};

    try {
        // Run list benchmarks
        console.log('\n📋 Running List Benchmarks...');
        results.lists = await runListBenchmarks();

        // Run component benchmarks
        console.log('\n🧩 Running Component Benchmarks...');
        results.components = await runComponentBenchmarks();

        const totalTime = ((performance.now() - startTime) / 1000).toFixed(1);

        // Save results
        saveResults('vdom-baseline', results);

        // Print summary
        console.log('\n' + '='.repeat(70));
        console.log('BASELINE BENCHMARK COMPLETE');
        console.log('='.repeat(70));
        console.log(`Total time: ${totalTime}s`);
        console.log('\nResults saved to localStorage as "benchmark:vdom-baseline"');
        console.log('Run fine-grained benchmarks after migration to compare.\n');

        return results;

    } catch (error) {
        console.error('Benchmark failed:', error);
        throw error;
    }
}

// Summary report generator
export function printSummary(results) {
    console.log('\n' + '='.repeat(70));
    console.log('BASELINE PERFORMANCE SUMMARY');
    console.log('='.repeat(70));

    for (const [category, suites] of Object.entries(results)) {
        console.log(`\n${category.toUpperCase()}:`);
        for (const [suite, benchmarks] of Object.entries(suites)) {
            console.log(`\n  ${suite}:`);
            for (const [bench, stats] of Object.entries(benchmarks)) {
                if (stats.error) {
                    console.log(`    ${bench}: ERROR - ${stats.error}`);
                } else if (stats) {
                    console.log(`    ${bench}: ${stats.mean.toFixed(3)}ms (p95: ${stats.p95.toFixed(3)}ms)`);
                }
            }
        }
    }
}

// Export for use in HTML
window.runAllBenchmarks = runAllBenchmarks;
window.printSummary = printSummary;

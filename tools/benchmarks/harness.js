/**
 * Benchmark Harness
 *
 * Core utilities for timing, statistics, and benchmark orchestration.
 * Designed to measure both VDOM (baseline) and fine-grained (target) performance.
 */

// Wait for effects/render to settle
export async function waitForRender() {
    await new Promise(r => queueMicrotask(r));
    await new Promise(r => setTimeout(r, 0));
}

// Wait longer for complex component initialization
export async function waitForMount(ms = 50) {
    await new Promise(r => setTimeout(r, ms));
}

/**
 * Calculate statistics from timing array
 */
export function calcStats(times) {
    if (times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);

    return {
        mean: sum / times.length,
        median: sorted[Math.floor(sorted.length / 2)],
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        stdDev: Math.sqrt(times.reduce((sq, t) => sq + Math.pow(t - sum / times.length, 2), 0) / times.length),
        samples: times.length
    };
}

/**
 * Format stats for display
 */
export function formatStats(stats, label = '') {
    if (!stats) return `${label}: No data`;
    return `${label}
  Mean:   ${stats.mean.toFixed(3)}ms
  Median: ${stats.median.toFixed(3)}ms
  P95:    ${stats.p95.toFixed(3)}ms
  P99:    ${stats.p99.toFixed(3)}ms
  Min:    ${stats.min.toFixed(3)}ms
  Max:    ${stats.max.toFixed(3)}ms
  StdDev: ${stats.stdDev.toFixed(3)}ms
  Samples: ${stats.samples}`;
}

/**
 * Benchmark initial component render time
 */
export async function benchmarkInitialRender(componentTag, setupFn = null, iterations = 50, warmup = 5) {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
    document.body.appendChild(container);

    const times = [];

    try {
        // Warmup runs (not counted)
        for (let i = 0; i < warmup; i++) {
            const el = document.createElement(componentTag);
            if (setupFn) setupFn(el, i);
            container.appendChild(el);
            await waitForMount();
            container.removeChild(el);
        }

        // Timed runs
        for (let i = 0; i < iterations; i++) {
            const el = document.createElement(componentTag);
            if (setupFn) setupFn(el, i);

            const start = performance.now();
            container.appendChild(el);
            await waitForRender();
            times.push(performance.now() - start);

            container.removeChild(el);
            await waitForRender();
        }
    } finally {
        document.body.removeChild(container);
    }

    return calcStats(times);
}

/**
 * Benchmark state update performance
 */
export async function benchmarkStateUpdate(componentTag, setupFn, updateFn, iterations = 100, warmup = 10) {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
    document.body.appendChild(container);

    const times = [];

    try {
        // Create and setup component
        const el = document.createElement(componentTag);
        if (setupFn) await setupFn(el);
        container.appendChild(el);
        await waitForMount(100);

        // Warmup
        for (let i = 0; i < warmup; i++) {
            updateFn(el, i);
            await waitForRender();
        }

        // Timed runs
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            updateFn(el, i);
            await waitForRender();
            times.push(performance.now() - start);
        }

        container.removeChild(el);
    } finally {
        document.body.removeChild(container);
    }

    return calcStats(times);
}

/**
 * Benchmark list operations
 */
export async function benchmarkListOperation(componentTag, setupFn, operation, iterations = 50, warmup = 5) {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
    document.body.appendChild(container);

    const times = [];

    try {
        for (let i = 0; i < warmup + iterations; i++) {
            // Fresh component each iteration
            const el = document.createElement(componentTag);
            container.appendChild(el);
            await waitForMount(50);

            if (setupFn) await setupFn(el);
            await waitForRender();

            const start = performance.now();
            await operation(el, i);
            await waitForRender();
            const elapsed = performance.now() - start;

            if (i >= warmup) {
                times.push(elapsed);
            }

            container.removeChild(el);
        }
    } finally {
        document.body.removeChild(container);
    }

    return calcStats(times);
}

/**
 * Measure memory usage (Chrome only)
 */
export function measureMemory() {
    if (performance.memory) {
        return {
            usedHeap: performance.memory.usedJSHeapSize,
            totalHeap: performance.memory.totalJSHeapSize,
            heapLimit: performance.memory.jsHeapSizeLimit
        };
    }
    return null;
}

/**
 * Measure memory delta around an operation
 */
export async function benchmarkMemory(setupFn, cleanupFn = null) {
    // Force GC if available
    if (window.gc) window.gc();
    await waitForMount(100);

    const before = measureMemory();
    await setupFn();

    // Let memory settle
    await waitForMount(100);
    const after = measureMemory();

    if (cleanupFn) await cleanupFn();

    if (before && after) {
        return {
            before: before.usedHeap,
            after: after.usedHeap,
            delta: after.usedHeap - before.usedHeap,
            deltaKB: (after.usedHeap - before.usedHeap) / 1024,
            deltaMB: (after.usedHeap - before.usedHeap) / (1024 * 1024)
        };
    }
    return null;
}

/**
 * Count effects on a component (for fine-grained comparison)
 */
export function countEffects(component) {
    // This will need to be updated once fine-grained is implemented
    // For now, VDOM has 1 effect per component (the render effect)
    let count = component._effects?.length || 0;

    // Count child component effects
    const children = component.querySelectorAll('*');
    for (const child of children) {
        if (child._effects) {
            count += child._effects.length;
        }
    }

    return count;
}

/**
 * Run a benchmark suite and return results
 */
export async function runSuite(name, benchmarks) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${name}`);
    console.log('='.repeat(60));

    const results = {};

    for (const [benchName, benchFn] of Object.entries(benchmarks)) {
        console.log(`\n  ${benchName}...`);
        try {
            const stats = await benchFn();
            results[benchName] = stats;
            if (stats) {
                console.log(`    Mean: ${stats.mean.toFixed(3)}ms, Median: ${stats.median.toFixed(3)}ms, P95: ${stats.p95.toFixed(3)}ms`);
            } else {
                console.log(`    (no data)`);
            }
        } catch (error) {
            console.error(`    ERROR: ${error.message}`);
            results[benchName] = { error: error.message };
        }
    }

    return results;
}

/**
 * Generate comparison report between baseline and target
 */
export function generateComparison(baseline, target) {
    const report = [];
    report.push('\n' + '='.repeat(70));
    report.push('PERFORMANCE COMPARISON: VDOM vs Fine-Grained');
    report.push('='.repeat(70));

    for (const [suite, benchmarks] of Object.entries(baseline)) {
        report.push(`\n${suite}:`);
        report.push('-'.repeat(50));

        for (const [bench, baseStats] of Object.entries(benchmarks)) {
            const targetStats = target[suite]?.[bench];

            if (!targetStats || baseStats.error || targetStats.error) {
                report.push(`  ${bench}: Unable to compare`);
                continue;
            }

            const speedup = baseStats.mean / targetStats.mean;
            const speedupPercent = ((speedup - 1) * 100).toFixed(1);
            const indicator = speedup > 1.1 ? '✅' : speedup < 0.9 ? '❌' : '≈';

            report.push(`  ${bench}:`);
            report.push(`    VDOM:        ${baseStats.mean.toFixed(3)}ms`);
            report.push(`    Fine-Grained: ${targetStats.mean.toFixed(3)}ms`);
            report.push(`    ${indicator} ${speedup.toFixed(2)}x (${speedup > 1 ? '+' : ''}${speedupPercent}%)`);
        }
    }

    return report.join('\n');
}

/**
 * Save results to localStorage for later comparison
 */
export function saveResults(key, results) {
    localStorage.setItem(`benchmark:${key}`, JSON.stringify({
        timestamp: new Date().toISOString(),
        results
    }));
}

/**
 * Load saved results
 */
export function loadResults(key) {
    const data = localStorage.getItem(`benchmark:${key}`);
    return data ? JSON.parse(data) : null;
}

# VDX Performance Benchmarks

Comprehensive performance benchmarks comparing VDOM baseline against fine-grained reactivity.

## Overview

This benchmark suite measures rendering performance across different patterns:

- **List rendering** - Simple/complex lists, updates, append/prepend/remove operations
- **Dynamic bindings** - Components with many reactive bindings
- **Conditionals** - Conditional rendering with `when()`
- **Grids/Tables** - Table-like rendering with nested loops
- **Forms** - Form input rendering and updates

## Files

### Core Infrastructure

- **harness.js** - Benchmark utilities, timing, statistics, comparison reports
- **baseline-vdom.js** - Current VDOM baseline benchmarks
- **fine-grained.js** - Fine-grained renderer benchmarks (direct `instantiateTemplate()` usage)
- **index.html** - Web UI for running benchmarks and viewing results

### Test Scenarios

- **scenarios/synthetic-components.js** - Synthetic test components designed to stress-test specific patterns
- **scenarios/list-benchmarks.js** - List rendering benchmark suite
- **scenarios/component-benchmarks.js** - Component pattern benchmark suite

## Running Benchmarks

### Via Web UI

1. Start the test server:
```bash
cd app
python3 test-server.py
```

2. Open http://localhost:9000/benchmarks/

3. Click one of:
   - **Run Baseline (VDOM)** - Current VDOM performance
   - **Run Fine-Grained** - Fine-grained renderer performance
   - **Run Comparison** - Runs both and generates comparison report

Results are saved to localStorage for later comparison.

### Via Console

```javascript
// Run baseline
import('./baseline-vdom.js').then(m => m.runAllBenchmarks());

// Run fine-grained
import('./fine-grained.js').then(m => m.runAllBenchmarks());

// Compare saved results
import('./harness.js').then(m => {
    const baseline = JSON.parse(localStorage.getItem('benchmark:vdom-baseline')).results;
    const fineGrained = JSON.parse(localStorage.getItem('benchmark:fine-grained')).results;
    console.log(m.generateComparison(baseline, fineGrained));
});
```

## Benchmark Scenarios

### List Rendering

Tests `each()` and `memoEach()` performance:

- **Initial render** - 100/500/1000 items, simple and complex items
- **Append** - Add item to end (cheap operation)
- **Prepend** - Add item to beginning (expensive for non-keyed)
- **Remove** - Remove item from middle
- **Update single item** - Change one item's data
- **Update multiple items** - Change 10 items
- **Replace all** - Completely new array
- **Shuffle** - Reorder items (tests keyed rendering)

**Expected results:**
- Fine-grained should excel at **single/multiple item updates** (O(1) per binding)
- VDOM may be faster at **complete replacements** (no diffing overhead)
- Keyed operations (memoEach) should have similar performance

### Dynamic Bindings

Component with 20+ reactive bindings:

- **Initial render** - Create component with many bindings
- **Update 1 binding** - Change single value
- **Update all bindings** - Change all values

**Expected results:**
- Fine-grained should be **much faster** at single binding updates
- VDOM will re-render entire component, fine-grained updates only changed binding

### Conditionals

5 `when()` conditionals:

- **Initial render** - All conditions true
- **Toggle 1** - Show/hide one section
- **Toggle all** - Cycle through different visibility states

**Expected results:**
- Similar performance - both create/destroy DOM elements
- Fine-grained may be slightly faster due to targeted effects

### Grid/Table

Table with nested `each()` loops:

- **Initial render** - 10x10, 50x10, 100x10 grids
- **Update cell** - Change single cell value
- **Update row** - Change entire row

**Expected results:**
- Fine-grained **much faster** at cell/row updates
- VDOM re-renders entire table, fine-grained updates only changed cells

### Forms

Form with 5 inputs + preview:

- **Initial render** - Create form
- **Single field update** - Update one field
- **Multiple field updates** - Update 3 fields

**Expected results:**
- Fine-grained **significantly faster** at field updates
- Each field binding is independent, no re-render needed

## Understanding Results

### Key Metrics

- **Mean** - Average time across all iterations
- **Median** - Middle value (less affected by outliers)
- **P95** - 95th percentile (worst case performance)
- **P99** - 99th percentile (rare worst cases)
- **Min/Max** - Best and worst times
- **StdDev** - Consistency (lower = more predictable)

### Comparison Report

The comparison report shows:
- Side-by-side mean times
- Speedup ratio (e.g., 2.5x means fine-grained is 2.5x faster)
- Visual indicators:
  - ✅ Fine-grained is >10% faster
  - ❌ Fine-grained is >10% slower
  - ≈ Within 10% (similar performance)

### Expected Fine-Grained Wins

Fine-grained should be **much faster** at:
1. Single/multiple binding updates (no re-render)
2. Partial list updates (update only changed items)
3. Form field updates (independent effects per field)
4. Grid cell updates (O(1) per cell)

### Scenarios Where VDOM May Win

VDOM might be faster at:
1. Complete replacements (no diffing needed)
2. Very small components (effect overhead)
3. Initial render of simple components (less setup)

## Adding New Benchmarks

### 1. Add synthetic component (if needed)

```javascript
// scenarios/synthetic-components.js
defineComponent('bench-new-pattern', {
    props: { data: {} },
    template() {
        return html`<div>${this.props.data.value}</div>`;
    }
});
```

### 2. Add baseline benchmark

```javascript
// scenarios/component-benchmarks.js (or new file)
results['New Pattern'] = await runSuite('New Pattern Tests', {
    'Test case name': async () => {
        return benchmarkInitialRender('bench-new-pattern', (el) => {
            el.data = { value: 'test' };
        });
    }
});
```

### 3. Add fine-grained benchmark

```javascript
// fine-grained.js
results['New Pattern'] = await runSuite('New Pattern (Fine-Grained)', {
    'Test case name': async () => {
        return benchmarkFineGrainedRender(
            ({ state }) => html`<div>${state.data.value}</div>`,
            () => ({ data: { value: 'test' } })
        );
    }
});
```

## Notes

- Benchmarks run in hidden off-screen containers to avoid layout thrashing
- Each benchmark includes warmup runs (not counted) to stabilize JIT
- Results include ~50-100 iterations for statistical significance
- Large operations (1000+ items) use fewer iterations
- Results are saved to localStorage for comparison across runs

## Performance Targets

After fine-grained migration, we expect:

- **2-5x faster** updates for components with many bindings
- **5-10x faster** single item updates in large lists
- **Similar** performance for initial renders
- **Lower memory** usage (fewer VDOM objects)
- **More predictable** performance (less GC pressure)

The goal is not to make everything faster, but to make **updates** O(1) per changed binding instead of O(n) for entire component tree.

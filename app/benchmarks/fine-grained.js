/**
 * Fine-Grained Renderer Benchmarks
 *
 * Run all benchmark suites using the fine-grained renderer directly.
 * Results are saved to localStorage for comparison with VDOM baseline.
 *
 * These benchmarks test instantiateTemplate() directly, bypassing the component system.
 */

import { instantiateTemplate } from '../lib/core/template-renderer.js';
import { compileTemplate } from '../lib/core/template-compiler.js';
import { html, reactive, when, each, memoEach } from '../lib/framework.js';
import {
    waitForRender,
    waitForMount,
    calcStats,
    saveResults,
    runSuite
} from './harness.js';
import {
    generateItems,
    generateBindingsData,
    generateConditionsData,
    generateGridData
} from './scenarios/synthetic-components.js';

/**
 * Benchmark fine-grained template instantiation
 * Unlike VDOM which re-renders the whole component, fine-grained only updates changed bindings
 */
async function benchmarkFineGrainedRender(templateFn, setupStateFn, iterations = 50, warmup = 5) {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
    document.body.appendChild(container);

    const times = [];

    try {
        // Warmup runs
        for (let i = 0; i < warmup; i++) {
            const state = reactive(setupStateFn(i));
            const template = templateFn({ state });
            const compiled = compileTemplate(template);
            const { fragment, cleanup } = instantiateTemplate(compiled, template.values, { state });
            container.appendChild(fragment);
            await waitForRender();
            cleanup();
            container.innerHTML = '';
        }

        // Timed runs
        for (let i = 0; i < iterations; i++) {
            const state = reactive(setupStateFn(i));
            const template = templateFn({ state });
            const compiled = compileTemplate(template);

            const start = performance.now();
            const { fragment, cleanup } = instantiateTemplate(compiled, template.values, { state });
            container.appendChild(fragment);
            await waitForRender();
            times.push(performance.now() - start);

            cleanup();
            container.innerHTML = '';
        }
    } finally {
        document.body.removeChild(container);
    }

    return calcStats(times);
}

/**
 * Benchmark fine-grained update performance
 * This is where fine-grained shines - updates only changed bindings
 */
async function benchmarkFineGrainedUpdate(templateFn, setupStateFn, updateFn, iterations = 100, warmup = 10) {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
    document.body.appendChild(container);

    const times = [];

    try {
        // Create state and template once
        const state = reactive(setupStateFn());
        const template = templateFn({ state });
        const compiled = compileTemplate(template);
        const { fragment, cleanup } = instantiateTemplate(compiled, template.values, { state });
        container.appendChild(fragment);
        await waitForMount(100);

        // Warmup updates
        for (let i = 0; i < warmup; i++) {
            updateFn(state, i);
            await waitForRender();
        }

        // Timed updates
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            updateFn(state, i);
            await waitForRender();
            times.push(performance.now() - start);
        }

        cleanup();
    } finally {
        document.body.removeChild(container);
    }

    return calcStats(times);
}

/**
 * Benchmark list operations with fine-grained renderer
 */
async function benchmarkFineGrainedListOp(templateFn, setupStateFn, operation, iterations = 50, warmup = 5) {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; visibility: hidden;';
    document.body.appendChild(container);

    const times = [];

    try {
        for (let i = 0; i < warmup + iterations; i++) {
            // Fresh state and template each iteration
            const state = reactive(setupStateFn());
            const template = templateFn({ state });
            const compiled = compileTemplate(template);
            const { fragment, cleanup } = instantiateTemplate(compiled, template.values, { state });
            container.appendChild(fragment);
            await waitForMount(50);

            const start = performance.now();
            await operation(state, i);
            await waitForRender();
            const elapsed = performance.now() - start;

            if (i >= warmup) {
                times.push(elapsed);
            }

            cleanup();
            container.innerHTML = '';
        }
    } finally {
        document.body.removeChild(container);
    }

    return calcStats(times);
}

// ============================================================================
// BENCHMARK SUITES
// ============================================================================

async function runListBenchmarks() {
    const results = {};

    // === Initial Render Benchmarks ===
    results['Initial Render'] = await runSuite('List Initial Render (Fine-Grained)', {
        'Simple list (100 items)': async () => {
            const items = generateItems(100, 'simple');
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <div class="simple-list">
                        ${each(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `)}
                    </div>
                `,
                () => ({ items })
            );
        },

        'Simple list (500 items)': async () => {
            const items = generateItems(500, 'simple');
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <div class="simple-list">
                        ${each(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `)}
                    </div>
                `,
                () => ({ items }),
                20
            );
        },

        'Simple list (1000 items)': async () => {
            const items = generateItems(1000, 'simple');
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <div class="simple-list">
                        ${each(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `)}
                    </div>
                `,
                () => ({ items }),
                10
            );
        },

        'Complex list (100 items)': async () => {
            const items = generateItems(100, 'complex');
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <div class="complex-list">
                        ${each(state.items, item => html`
                            <div class="item ${item.active ? 'active' : ''}"
                                 data-id="${item.id}"
                                 title="${item.description}">
                                <span class="name">${item.name}</span>
                                <span class="value">${item.value}</span>
                                <span class="status ${item.status}">${item.status}</span>
                                ${when(item.badge, html`<span class="badge">${item.badge}</span>`)}
                            </div>
                        `)}
                    </div>
                `,
                () => ({ items })
            );
        },

        'Complex list (500 items)': async () => {
            const items = generateItems(500, 'complex');
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <div class="complex-list">
                        ${each(state.items, item => html`
                            <div class="item ${item.active ? 'active' : ''}"
                                 data-id="${item.id}"
                                 title="${item.description}">
                                <span class="name">${item.name}</span>
                                <span class="value">${item.value}</span>
                                <span class="status ${item.status}">${item.status}</span>
                                ${when(item.badge, html`<span class="badge">${item.badge}</span>`)}
                            </div>
                        `)}
                    </div>
                `,
                () => ({ items }),
                20
            );
        },

        'Memoized list (100 items)': async () => {
            const items = generateItems(100, 'simple');
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <div class="memo-list">
                        ${memoEach(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `, item => item.id)}
                    </div>
                `,
                () => ({ items })
            );
        },

        'Memoized list (500 items)': async () => {
            const items = generateItems(500, 'simple');
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <div class="memo-list">
                        ${memoEach(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `, item => item.id)}
                    </div>
                `,
                () => ({ items }),
                20
            );
        }
    });

    // === List Update Benchmarks ===
    results['List Updates'] = await runSuite('List Updates (Fine-Grained)', {
        'Append 1 item to 100': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkFineGrainedListOp(
                ({ state }) => html`
                    <div class="simple-list">
                        ${each(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `)}
                    </div>
                `,
                () => ({ items: [...baseItems] }),
                async (state, i) => {
                    state.items = [...state.items, { id: 100 + i, name: `New ${i}`, value: i }];
                },
                50
            );
        },

        'Append 1 item to 500': async () => {
            const baseItems = generateItems(500, 'simple');
            return benchmarkFineGrainedListOp(
                ({ state }) => html`
                    <div class="simple-list">
                        ${each(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `)}
                    </div>
                `,
                () => ({ items: [...baseItems] }),
                async (state, i) => {
                    state.items = [...state.items, { id: 500 + i, name: `New ${i}`, value: i }];
                },
                30
            );
        },

        'Prepend 1 item to 100': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkFineGrainedListOp(
                ({ state }) => html`
                    <div class="simple-list">
                        ${each(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `)}
                    </div>
                `,
                () => ({ items: [...baseItems] }),
                async (state, i) => {
                    state.items = [{ id: -i - 1, name: `New ${i}`, value: i }, ...state.items];
                },
                50
            );
        },

        'Remove middle item from 100': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkFineGrainedListOp(
                ({ state }) => html`
                    <div class="simple-list">
                        ${each(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `)}
                    </div>
                `,
                () => ({ items: [...baseItems] }),
                async (state, i) => {
                    const items = [...state.items];
                    items.splice(50, 1);
                    state.items = items;
                },
                50
            );
        },

        'Update single item in 100': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkFineGrainedListOp(
                ({ state }) => html`
                    <div class="simple-list">
                        ${each(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `)}
                    </div>
                `,
                () => ({ items: [...baseItems] }),
                async (state, i) => {
                    const items = [...state.items];
                    items[50] = { ...items[50], name: `Updated ${i}` };
                    state.items = items;
                },
                50
            );
        },

        'Update 10 items in 100': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkFineGrainedListOp(
                ({ state }) => html`
                    <div class="simple-list">
                        ${each(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `)}
                    </div>
                `,
                () => ({ items: [...baseItems] }),
                async (state, iter) => {
                    const items = [...state.items];
                    for (let i = 0; i < 10; i++) {
                        items[i * 10] = { ...items[i * 10], name: `Updated ${iter}-${i}` };
                    }
                    state.items = items;
                },
                50
            );
        },

        'Replace all 100 items': async () => {
            return benchmarkFineGrainedListOp(
                ({ state }) => html`
                    <div class="simple-list">
                        ${each(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `)}
                    </div>
                `,
                () => ({ items: generateItems(100, 'simple') }),
                async (state, i) => {
                    state.items = generateItems(100, 'simple');
                },
                30
            );
        },

        'Shuffle 100 items': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkFineGrainedListOp(
                ({ state }) => html`
                    <div class="memo-list">
                        ${memoEach(state.items, item => html`
                            <div class="item">${item.name} - ${item.value}</div>
                        `, item => item.id)}
                    </div>
                `,
                () => ({ items: [...baseItems] }),
                async (state, i) => {
                    const items = [...state.items];
                    // Fisher-Yates shuffle
                    for (let j = items.length - 1; j > 0; j--) {
                        const k = Math.floor(Math.random() * (j + 1));
                        [items[j], items[k]] = [items[k], items[j]];
                    }
                    state.items = items;
                },
                30
            );
        }
    });

    return results;
}

async function runComponentBenchmarks() {
    const results = {};

    // === Many Bindings ===
    results['Bindings'] = await runSuite('Dynamic Bindings (Fine-Grained)', {
        'Component with 20 bindings (initial)': async () => {
            const data = generateBindingsData();
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <div class="many-bindings"
                         data-a="${state.data.a}" data-b="${state.data.b}" data-c="${state.data.c}"
                         data-d="${state.data.d}" data-e="${state.data.e}" data-f="${state.data.f}"
                         data-g="${state.data.g}" data-h="${state.data.h}" data-i="${state.data.i}"
                         data-j="${state.data.j}">
                        <span class="${state.data.class1}">${state.data.text1}</span>
                        <span class="${state.data.class2}">${state.data.text2}</span>
                        <span class="${state.data.class3}">${state.data.text3}</span>
                        <span class="${state.data.class4}">${state.data.text4}</span>
                        <span class="${state.data.class5}">${state.data.text5}</span>
                        <span class="${state.data.class6}">${state.data.text6}</span>
                        <span class="${state.data.class7}">${state.data.text7}</span>
                        <span class="${state.data.class8}">${state.data.text8}</span>
                        <span class="${state.data.class9}">${state.data.text9}</span>
                        <span class="${state.data.class10}">${state.data.text10}</span>
                    </div>
                `,
                () => ({ data })
            );
        },

        'Component with 20 bindings (update 1)': async () => {
            const data = generateBindingsData();
            return benchmarkFineGrainedUpdate(
                ({ state }) => html`
                    <div class="many-bindings"
                         data-a="${state.data.a}" data-b="${state.data.b}" data-c="${state.data.c}"
                         data-d="${state.data.d}" data-e="${state.data.e}" data-f="${state.data.f}"
                         data-g="${state.data.g}" data-h="${state.data.h}" data-i="${state.data.i}"
                         data-j="${state.data.j}">
                        <span class="${state.data.class1}">${state.data.text1}</span>
                        <span class="${state.data.class2}">${state.data.text2}</span>
                        <span class="${state.data.class3}">${state.data.text3}</span>
                        <span class="${state.data.class4}">${state.data.text4}</span>
                        <span class="${state.data.class5}">${state.data.text5}</span>
                        <span class="${state.data.class6}">${state.data.text6}</span>
                        <span class="${state.data.class7}">${state.data.text7}</span>
                        <span class="${state.data.class8}">${state.data.text8}</span>
                        <span class="${state.data.class9}">${state.data.text9}</span>
                        <span class="${state.data.class10}">${state.data.text10}</span>
                    </div>
                `,
                () => ({ data: { ...data } }),
                (state, i) => {
                    state.data.text1 = `Updated ${i}`;
                }
            );
        },

        'Component with 20 bindings (update all)': async () => {
            return benchmarkFineGrainedUpdate(
                ({ state }) => html`
                    <div class="many-bindings"
                         data-a="${state.data.a}" data-b="${state.data.b}" data-c="${state.data.c}"
                         data-d="${state.data.d}" data-e="${state.data.e}" data-f="${state.data.f}"
                         data-g="${state.data.g}" data-h="${state.data.h}" data-i="${state.data.i}"
                         data-j="${state.data.j}">
                        <span class="${state.data.class1}">${state.data.text1}</span>
                        <span class="${state.data.class2}">${state.data.text2}</span>
                        <span class="${state.data.class3}">${state.data.text3}</span>
                        <span class="${state.data.class4}">${state.data.text4}</span>
                        <span class="${state.data.class5}">${state.data.text5}</span>
                        <span class="${state.data.class6}">${state.data.text6}</span>
                        <span class="${state.data.class7}">${state.data.text7}</span>
                        <span class="${state.data.class8}">${state.data.text8}</span>
                        <span class="${state.data.class9}">${state.data.text9}</span>
                        <span class="${state.data.class10}">${state.data.text10}</span>
                    </div>
                `,
                () => ({ data: generateBindingsData() }),
                (state, i) => {
                    state.data.a = `a-${i}`;
                    state.data.b = `b-${i}`;
                    state.data.c = `c-${i}`;
                    state.data.d = `d-${i}`;
                    state.data.e = `e-${i}`;
                    state.data.f = `f-${i}`;
                    state.data.g = `g-${i}`;
                    state.data.h = `h-${i}`;
                    state.data.i = `i-${i}`;
                    state.data.j = `j-${i}`;
                    state.data.class1 = `c1-${i}`;
                    state.data.class2 = `c2-${i}`;
                    state.data.class3 = `c3-${i}`;
                    state.data.class4 = `c4-${i}`;
                    state.data.class5 = `c5-${i}`;
                    state.data.class6 = `c6-${i}`;
                    state.data.class7 = `c7-${i}`;
                    state.data.class8 = `c8-${i}`;
                    state.data.class9 = `c9-${i}`;
                    state.data.class10 = `c10-${i}`;
                    state.data.text1 = `T1-${i}`;
                    state.data.text2 = `T2-${i}`;
                    state.data.text3 = `T3-${i}`;
                    state.data.text4 = `T4-${i}`;
                    state.data.text5 = `T5-${i}`;
                    state.data.text6 = `T6-${i}`;
                    state.data.text7 = `T7-${i}`;
                    state.data.text8 = `T8-${i}`;
                    state.data.text9 = `T9-${i}`;
                    state.data.text10 = `T10-${i}`;
                }
            );
        }
    });

    // === Conditionals ===
    results['Conditionals'] = await runSuite('Conditional Rendering (Fine-Grained)', {
        'when() - 5 conditions (initial all true)': async () => {
            const conditions = generateConditionsData(5);
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <div class="conditionals">
                        ${when(state.conditions.show1, html`<div class="section1">Section 1 content with ${state.conditions.value1}</div>`)}
                        ${when(state.conditions.show2, html`<div class="section2">Section 2 content with ${state.conditions.value2}</div>`)}
                        ${when(state.conditions.show3, html`<div class="section3">Section 3 content with ${state.conditions.value3}</div>`)}
                        ${when(state.conditions.show4, html`<div class="section4">Section 4 content with ${state.conditions.value4}</div>`)}
                        ${when(state.conditions.show5, html`<div class="section5">Section 5 content with ${state.conditions.value5}</div>`)}
                    </div>
                `,
                () => ({ conditions })
            );
        },

        'when() - toggle 1 condition': async () => {
            return benchmarkFineGrainedUpdate(
                ({ state }) => html`
                    <div class="conditionals">
                        ${when(state.conditions.show1, html`<div class="section1">Section 1 content with ${state.conditions.value1}</div>`)}
                        ${when(state.conditions.show2, html`<div class="section2">Section 2 content with ${state.conditions.value2}</div>`)}
                        ${when(state.conditions.show3, html`<div class="section3">Section 3 content with ${state.conditions.value3}</div>`)}
                        ${when(state.conditions.show4, html`<div class="section4">Section 4 content with ${state.conditions.value4}</div>`)}
                        ${when(state.conditions.show5, html`<div class="section5">Section 5 content with ${state.conditions.value5}</div>`)}
                    </div>
                `,
                () => ({ conditions: generateConditionsData(5) }),
                (state, i) => {
                    state.conditions.show1 = i % 2 === 0;
                }
            );
        },

        'when() - toggle all conditions': async () => {
            return benchmarkFineGrainedUpdate(
                ({ state }) => html`
                    <div class="conditionals">
                        ${when(state.conditions.show1, html`<div class="section1">Section 1 content with ${state.conditions.value1}</div>`)}
                        ${when(state.conditions.show2, html`<div class="section2">Section 2 content with ${state.conditions.value2}</div>`)}
                        ${when(state.conditions.show3, html`<div class="section3">Section 3 content with ${state.conditions.value3}</div>`)}
                        ${when(state.conditions.show4, html`<div class="section4">Section 4 content with ${state.conditions.value4}</div>`)}
                        ${when(state.conditions.show5, html`<div class="section5">Section 5 content with ${state.conditions.value5}</div>`)}
                    </div>
                `,
                () => ({ conditions: generateConditionsData(5) }),
                (state, i) => {
                    const visible = i % 6;  // 0-5
                    const newConds = generateConditionsData(visible);
                    state.conditions.show1 = newConds.show1;
                    state.conditions.show2 = newConds.show2;
                    state.conditions.show3 = newConds.show3;
                    state.conditions.show4 = newConds.show4;
                    state.conditions.show5 = newConds.show5;
                }
            );
        }
    });

    // === Grid (table-like) ===
    results['Grid'] = await runSuite('Grid/Table Rendering (Fine-Grained)', {
        'Grid 10x10 (initial)': async () => {
            const { columns, rows } = generateGridData(10, 10);
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <table class="bench-grid">
                        <thead>
                            <tr>
                                ${each(state.columns, col => html`
                                    <th>${col.header}</th>
                                `)}
                            </tr>
                        </thead>
                        <tbody>
                            ${each(state.rows, row => html`
                                <tr>
                                    ${each(state.columns, col => html`
                                        <td>${row[col.field]}</td>
                                    `)}
                                </tr>
                            `)}
                        </tbody>
                    </table>
                `,
                () => ({ columns, rows })
            );
        },

        'Grid 50x10 (initial)': async () => {
            const { columns, rows } = generateGridData(50, 10);
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <table class="bench-grid">
                        <thead>
                            <tr>
                                ${each(state.columns, col => html`
                                    <th>${col.header}</th>
                                `)}
                            </tr>
                        </thead>
                        <tbody>
                            ${each(state.rows, row => html`
                                <tr>
                                    ${each(state.columns, col => html`
                                        <td>${row[col.field]}</td>
                                    `)}
                                </tr>
                            `)}
                        </tbody>
                    </table>
                `,
                () => ({ columns, rows })
            );
        },

        'Grid 100x10 (initial)': async () => {
            const { columns, rows } = generateGridData(100, 10);
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <table class="bench-grid">
                        <thead>
                            <tr>
                                ${each(state.columns, col => html`
                                    <th>${col.header}</th>
                                `)}
                            </tr>
                        </thead>
                        <tbody>
                            ${each(state.rows, row => html`
                                <tr>
                                    ${each(state.columns, col => html`
                                        <td>${row[col.field]}</td>
                                    `)}
                                </tr>
                            `)}
                        </tbody>
                    </table>
                `,
                () => ({ columns, rows }),
                30
            );
        },

        'Grid 100x10 (update cell)': async () => {
            const { columns, rows } = generateGridData(100, 10);
            return benchmarkFineGrainedUpdate(
                ({ state }) => html`
                    <table class="bench-grid">
                        <thead>
                            <tr>
                                ${each(state.columns, col => html`
                                    <th>${col.header}</th>
                                `)}
                            </tr>
                        </thead>
                        <tbody>
                            ${each(state.rows, row => html`
                                <tr>
                                    ${each(state.columns, col => html`
                                        <td>${row[col.field]}</td>
                                    `)}
                                </tr>
                            `)}
                        </tbody>
                    </table>
                `,
                () => ({ columns, rows: [...rows] }),
                (state, i) => {
                    const newRows = [...state.rows];
                    newRows[50] = { ...newRows[50], col5: `Updated-${i}` };
                    state.rows = newRows;
                }
            );
        },

        'Grid 100x10 (update row)': async () => {
            const { columns, rows } = generateGridData(100, 10);
            return benchmarkFineGrainedUpdate(
                ({ state }) => html`
                    <table class="bench-grid">
                        <thead>
                            <tr>
                                ${each(state.columns, col => html`
                                    <th>${col.header}</th>
                                `)}
                            </tr>
                        </thead>
                        <tbody>
                            ${each(state.rows, row => html`
                                <tr>
                                    ${each(state.columns, col => html`
                                        <td>${row[col.field]}</td>
                                    `)}
                                </tr>
                            `)}
                        </tbody>
                    </table>
                `,
                () => ({ columns, rows: [...rows] }),
                (state, i) => {
                    const newRows = [...state.rows];
                    const newRow = { id: 50 };
                    for (let c = 0; c < 10; c++) {
                        newRow[`col${c}`] = `U${i}C${c}`;
                    }
                    newRows[50] = newRow;
                    state.rows = newRows;
                }
            );
        }
    });

    // === Forms ===
    results['Forms'] = await runSuite('Form Rendering (Fine-Grained)', {
        'Form initial render': async () => {
            return benchmarkFineGrainedRender(
                ({ state }) => html`
                    <form class="bench-form">
                        <input type="text" value="${state.field1}" placeholder="Field 1">
                        <input type="text" value="${state.field2}" placeholder="Field 2">
                        <input type="text" value="${state.field3}" placeholder="Field 3">
                        <input type="text" value="${state.field4}" placeholder="Field 4">
                        <input type="text" value="${state.field5}" placeholder="Field 5">
                        <div class="preview">
                            ${state.field1} | ${state.field2} | ${state.field3}
                        </div>
                    </form>
                `,
                () => ({
                    field1: '',
                    field2: '',
                    field3: '',
                    field4: '',
                    field5: ''
                })
            );
        },

        'Form state update (single field)': async () => {
            return benchmarkFineGrainedUpdate(
                ({ state }) => html`
                    <form class="bench-form">
                        <input type="text" value="${state.field1}" placeholder="Field 1">
                        <input type="text" value="${state.field2}" placeholder="Field 2">
                        <input type="text" value="${state.field3}" placeholder="Field 3">
                        <input type="text" value="${state.field4}" placeholder="Field 4">
                        <input type="text" value="${state.field5}" placeholder="Field 5">
                        <div class="preview">
                            ${state.field1} | ${state.field2} | ${state.field3}
                        </div>
                    </form>
                `,
                () => ({
                    field1: '',
                    field2: '',
                    field3: '',
                    field4: '',
                    field5: ''
                }),
                (state, i) => {
                    state.field1 = `Value ${i}`;
                }
            );
        },

        'Form multiple field updates': async () => {
            return benchmarkFineGrainedUpdate(
                ({ state }) => html`
                    <form class="bench-form">
                        <input type="text" value="${state.field1}" placeholder="Field 1">
                        <input type="text" value="${state.field2}" placeholder="Field 2">
                        <input type="text" value="${state.field3}" placeholder="Field 3">
                        <input type="text" value="${state.field4}" placeholder="Field 4">
                        <input type="text" value="${state.field5}" placeholder="Field 5">
                        <div class="preview">
                            ${state.field1} | ${state.field2} | ${state.field3}
                        </div>
                    </form>
                `,
                () => ({
                    field1: '',
                    field2: '',
                    field3: '',
                    field4: '',
                    field5: ''
                }),
                (state, i) => {
                    state.field1 = `F1-${i}`;
                    state.field2 = `F2-${i}`;
                    state.field3 = `F3-${i}`;
                }
            );
        }
    });

    return results;
}

// ============================================================================
// MAIN BENCHMARK RUNNER
// ============================================================================

export async function runAllBenchmarks() {
    console.log('🚀 VDX Fine-Grained Benchmark Suite');
    console.log('====================================\n');
    console.log('This measures fine-grained renderer performance.');
    console.log('Each binding creates its own effect - updates are O(1) per binding.\n');

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
        saveResults('fine-grained', results);

        // Print summary
        console.log('\n' + '='.repeat(70));
        console.log('FINE-GRAINED BENCHMARK COMPLETE');
        console.log('='.repeat(70));
        console.log(`Total time: ${totalTime}s`);
        console.log('\nResults saved to localStorage as "benchmark:fine-grained"');
        console.log('Compare with baseline VDOM results to see improvements.\n');

        return results;

    } catch (error) {
        console.error('Benchmark failed:', error);
        throw error;
    }
}

// Summary report generator
export function printSummary(results) {
    console.log('\n' + '='.repeat(70));
    console.log('FINE-GRAINED PERFORMANCE SUMMARY');
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
window.runFineGrainedBenchmarks = runAllBenchmarks;
window.printFineGrainedSummary = printSummary;

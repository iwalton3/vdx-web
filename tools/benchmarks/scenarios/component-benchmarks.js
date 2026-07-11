/**
 * Component Rendering Benchmarks
 *
 * Tests performance of various component patterns: bindings, conditionals, nesting, forms.
 */

import {
    benchmarkInitialRender,
    benchmarkStateUpdate,
    benchmarkListOperation,
    runSuite,
    waitForRender,
    waitForMount
} from '../harness.js';
import { generateBindingsData, generateConditionsData, generateGridData } from './synthetic-components.js';

export async function runComponentBenchmarks() {
    const results = {};

    // === Many Bindings ===
    results['Bindings'] = await runSuite('Dynamic Bindings', {
        'Component with 20 bindings (initial)': async () => {
            const data = generateBindingsData();
            return benchmarkInitialRender('bench-many-bindings', (el) => {
                el.data = data;
            });
        },

        'Component with 20 bindings (update 1)': async () => {
            const data = generateBindingsData();
            return benchmarkStateUpdate('bench-many-bindings',
                async (el) => {
                    el.data = { ...data };
                },
                (el, i) => {
                    el.data = { ...el.data, text1: `Updated ${i}` };
                }
            );
        },

        'Component with 20 bindings (update all)': async () => {
            return benchmarkStateUpdate('bench-many-bindings',
                async (el) => {
                    el.data = generateBindingsData();
                },
                (el, i) => {
                    el.data = {
                        a: `a-${i}`, b: `b-${i}`, c: `c-${i}`, d: `d-${i}`, e: `e-${i}`,
                        f: `f-${i}`, g: `g-${i}`, h: `h-${i}`, i: `i-${i}`, j: `j-${i}`,
                        class1: `c1-${i}`, class2: `c2-${i}`, class3: `c3-${i}`, class4: `c4-${i}`, class5: `c5-${i}`,
                        class6: `c6-${i}`, class7: `c7-${i}`, class8: `c8-${i}`, class9: `c9-${i}`, class10: `c10-${i}`,
                        text1: `T1-${i}`, text2: `T2-${i}`, text3: `T3-${i}`, text4: `T4-${i}`, text5: `T5-${i}`,
                        text6: `T6-${i}`, text7: `T7-${i}`, text8: `T8-${i}`, text9: `T9-${i}`, text10: `T10-${i}`
                    };
                }
            );
        }
    });

    // === Conditionals ===
    results['Conditionals'] = await runSuite('Conditional Rendering', {
        'when() - 5 conditions (initial all true)': async () => {
            const conditions = generateConditionsData(5);
            return benchmarkInitialRender('bench-conditionals', (el) => {
                el.conditions = conditions;
            });
        },

        'when() - toggle 1 condition': async () => {
            return benchmarkStateUpdate('bench-conditionals',
                async (el) => {
                    el.conditions = generateConditionsData(5);
                },
                (el, i) => {
                    el.conditions = { ...el.conditions, show1: i % 2 === 0 };
                }
            );
        },

        'when() - toggle all conditions': async () => {
            return benchmarkStateUpdate('bench-conditionals',
                async (el) => {
                    el.conditions = generateConditionsData(5);
                },
                (el, i) => {
                    const visible = i % 6;  // 0-5
                    el.conditions = generateConditionsData(visible);
                }
            );
        }
    });

    // === Nested Components ===
    results['Nesting'] = await runSuite('Component Nesting', {
        'Nested 5 levels deep': async () => {
            return benchmarkInitialRender('bench-nested-level', (el) => {
                el.depth = 0;
                el.maxDepth = 5;
                el.value = 'Test';
            });
        },

        'Nested 10 levels deep': async () => {
            return benchmarkInitialRender('bench-nested-level', (el) => {
                el.depth = 0;
                el.maxDepth = 10;
                el.value = 'Test';
            });
        },

        'Nested 20 levels deep': async () => {
            return benchmarkInitialRender('bench-nested-level', (el) => {
                el.depth = 0;
                el.maxDepth = 20;
                el.value = 'Test';
            }, 30);
        }
    });

    // === Grid (table-like) ===
    results['Grid'] = await runSuite('Grid/Table Rendering', {
        'Grid 10x10 (initial)': async () => {
            const { columns, rows } = generateGridData(10, 10);
            return benchmarkInitialRender('bench-grid', (el) => {
                el.columns = columns;
                el.rows = rows;
            });
        },

        'Grid 50x10 (initial)': async () => {
            const { columns, rows } = generateGridData(50, 10);
            return benchmarkInitialRender('bench-grid', (el) => {
                el.columns = columns;
                el.rows = rows;
            });
        },

        'Grid 100x10 (initial)': async () => {
            const { columns, rows } = generateGridData(100, 10);
            return benchmarkInitialRender('bench-grid', (el) => {
                el.columns = columns;
                el.rows = rows;
            }, 30);
        },

        'Grid 100x10 (update cell)': async () => {
            const { columns, rows } = generateGridData(100, 10);
            return benchmarkStateUpdate('bench-grid',
                async (el) => {
                    el.columns = columns;
                    el.rows = [...rows];
                },
                (el, i) => {
                    const newRows = [...el.rows];
                    newRows[50] = { ...newRows[50], col5: `Updated-${i}` };
                    el.rows = newRows;
                }
            );
        },

        'Grid 100x10 (update row)': async () => {
            const { columns, rows } = generateGridData(100, 10);
            return benchmarkStateUpdate('bench-grid',
                async (el) => {
                    el.columns = columns;
                    el.rows = [...rows];
                },
                (el, i) => {
                    const newRows = [...el.rows];
                    const newRow = { id: 50 };
                    for (let c = 0; c < 10; c++) {
                        newRow[`col${c}`] = `U${i}C${c}`;
                    }
                    newRows[50] = newRow;
                    el.rows = newRows;
                }
            );
        }
    });

    // === Forms ===
    results['Forms'] = await runSuite('Form Rendering', {
        'Form initial render': async () => {
            return benchmarkInitialRender('bench-form');
        },

        'Form state update (x-model simulation)': async () => {
            return benchmarkStateUpdate('bench-form',
                async (el) => {
                    // Wait for mount
                },
                (el, i) => {
                    // Simulate x-model update by directly setting state
                    el.state.field1 = `Value ${i}`;
                }
            );
        },

        'Form multiple field updates': async () => {
            return benchmarkStateUpdate('bench-form',
                async (el) => {
                    // Wait for mount
                },
                (el, i) => {
                    el.state.field1 = `F1-${i}`;
                    el.state.field2 = `F2-${i}`;
                    el.state.field3 = `F3-${i}`;
                }
            );
        }
    });

    return results;
}

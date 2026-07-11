/**
 * List Rendering Benchmarks
 *
 * Tests performance of list operations: initial render, updates, add, remove, reorder.
 */

import {
    benchmarkInitialRender,
    benchmarkStateUpdate,
    benchmarkListOperation,
    runSuite,
    waitForRender
} from '../harness.js';
import { generateItems } from './synthetic-components.js';

export async function runListBenchmarks() {
    const results = {};

    // === Initial Render Benchmarks ===
    results['Initial Render'] = await runSuite('List Initial Render', {
        'Simple list (100 items)': async () => {
            const items = generateItems(100, 'simple');
            return benchmarkInitialRender('bench-simple-list', (el) => {
                el.items = items;
            });
        },

        'Simple list (500 items)': async () => {
            const items = generateItems(500, 'simple');
            return benchmarkInitialRender('bench-simple-list', (el) => {
                el.items = items;
            }, 20);  // Fewer iterations for large lists
        },

        'Simple list (1000 items)': async () => {
            const items = generateItems(1000, 'simple');
            return benchmarkInitialRender('bench-simple-list', (el) => {
                el.items = items;
            }, 10);
        },

        'Complex list (100 items)': async () => {
            const items = generateItems(100, 'complex');
            return benchmarkInitialRender('bench-complex-list', (el) => {
                el.items = items;
            });
        },

        'Complex list (500 items)': async () => {
            const items = generateItems(500, 'complex');
            return benchmarkInitialRender('bench-complex-list', (el) => {
                el.items = items;
            }, 20);
        },

        'Memoized list (100 items)': async () => {
            const items = generateItems(100, 'simple');
            return benchmarkInitialRender('bench-memo-list', (el) => {
                el.items = items;
            });
        },

        'Memoized list (500 items)': async () => {
            const items = generateItems(500, 'simple');
            return benchmarkInitialRender('bench-memo-list', (el) => {
                el.items = items;
            }, 20);
        }
    });

    // === List Update Benchmarks ===
    results['List Updates'] = await runSuite('List Updates', {
        'Append 1 item to 100': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkListOperation('bench-simple-list',
                async (el) => {
                    el.items = [...baseItems];
                },
                async (el, i) => {
                    el.items = [...el.items, { id: 100 + i, name: `New ${i}`, value: i }];
                },
                50
            );
        },

        'Append 1 item to 500': async () => {
            const baseItems = generateItems(500, 'simple');
            return benchmarkListOperation('bench-simple-list',
                async (el) => {
                    el.items = [...baseItems];
                },
                async (el, i) => {
                    el.items = [...el.items, { id: 500 + i, name: `New ${i}`, value: i }];
                },
                30
            );
        },

        'Prepend 1 item to 100': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkListOperation('bench-simple-list',
                async (el) => {
                    el.items = [...baseItems];
                },
                async (el, i) => {
                    el.items = [{ id: -i - 1, name: `New ${i}`, value: i }, ...el.items];
                },
                50
            );
        },

        'Remove middle item from 100': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkListOperation('bench-simple-list',
                async (el) => {
                    el.items = [...baseItems];
                },
                async (el, i) => {
                    const items = [...el.items];
                    items.splice(50, 1);
                    el.items = items;
                },
                50
            );
        },

        'Update single item in 100': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkListOperation('bench-simple-list',
                async (el) => {
                    el.items = [...baseItems];
                },
                async (el, i) => {
                    const items = [...el.items];
                    items[50] = { ...items[50], name: `Updated ${i}` };
                    el.items = items;
                },
                50
            );
        },

        'Update 10 items in 100': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkListOperation('bench-simple-list',
                async (el) => {
                    el.items = [...baseItems];
                },
                async (el, iter) => {
                    const items = [...el.items];
                    for (let i = 0; i < 10; i++) {
                        items[i * 10] = { ...items[i * 10], name: `Updated ${iter}-${i}` };
                    }
                    el.items = items;
                },
                50
            );
        },

        'Replace all 100 items': async () => {
            return benchmarkListOperation('bench-simple-list',
                async (el) => {
                    el.items = generateItems(100, 'simple');
                },
                async (el, i) => {
                    el.items = generateItems(100, 'simple');
                },
                30
            );
        },

        'Shuffle 100 items': async () => {
            const baseItems = generateItems(100, 'simple');
            return benchmarkListOperation('bench-memo-list',  // Use memoized for keyed shuffle
                async (el) => {
                    el.items = [...baseItems];
                },
                async (el, i) => {
                    const items = [...el.items];
                    // Fisher-Yates shuffle
                    for (let j = items.length - 1; j > 0; j--) {
                        const k = Math.floor(Math.random() * (j + 1));
                        [items[j], items[k]] = [items[k], items[j]];
                    }
                    el.items = items;
                },
                30
            );
        }
    });

    return results;
}

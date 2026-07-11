/**
 * Tests for the component-level computed: option
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, flushSync } from '../../lib/framework.js';

describe('Component computed: option', function(it) {
    it('exposes computed values as instance properties', () => {
        defineComponent('test-computed-basic', {
            data() {
                return { a: 2, b: 3 };
            },
            computed: {
                sum() { return this.state.a + this.state.b; }
            },
            template() {
                return html`<div>${this.sum}</div>`;
            }
        });

        const el = document.createElement('test-computed-basic');
        document.body.appendChild(el);

        assert.equal(el.sum, 5, 'Should compute initial value');

        flushSync(() => { el.state.a = 10; });
        assert.equal(el.sum, 13, 'Should recompute after dependency change');

        document.body.removeChild(el);
    });

    it('updates the DOM when a computed dependency changes', (done) => {
        defineComponent('test-computed-dom', {
            data() {
                return { items: [{ price: 2 }, { price: 3 }] };
            },
            computed: {
                total() { return this.state.items.reduce((s, i) => s + i.price, 0); }
            },
            template() {
                return html`<div id="total">${this.total}</div>`;
            }
        });

        const el = document.createElement('test-computed-dom');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.ok(el.querySelector('#total').textContent.includes('5'),
                'Should render initial computed value');

            el.state.items.push({ price: 10 });

            setTimeout(() => {
                assert.ok(el.querySelector('#total').textContent.includes('15'),
                    'Should re-render when computed dependency changes');
                document.body.removeChild(el);
                done();
            }, 100);
        }, 100);
    });

    it('caches values and recomputes lazily', () => {
        let computeCount = 0;
        defineComponent('test-computed-cache', {
            data() {
                return { x: 1 };
            },
            computed: {
                doubled() {
                    computeCount++;
                    return this.state.x * 2;
                }
            },
            template() {
                return html`<div></div>`;
            }
        });

        const el = document.createElement('test-computed-cache');
        document.body.appendChild(el);

        assert.equal(computeCount, 1, 'Getter runs once at creation');

        assert.equal(el.doubled, 2, 'Returns computed value');
        assert.equal(el.doubled, 2, 'Repeated reads hit the cache');
        assert.equal(computeCount, 1, 'Cached reads do not recompute');

        // Invalidation is lazy - no recompute until the next read
        flushSync(() => { el.state.x = 5; });
        assert.equal(computeCount, 1, 'Invalidation alone does not recompute');
        assert.equal(el.doubled, 10, 'Next read recomputes');
        assert.equal(computeCount, 2, 'Recomputed exactly once');

        document.body.removeChild(el);
    });

    it('is fresh when read synchronously after a state write (event-emit pattern)', () => {
        let emittedTotal = null;
        defineComponent('test-computed-sync-read', {
            data() {
                return { items: [] };
            },
            computed: {
                total() { return this.state.items.reduce((s, i) => s + i.price, 0); }
            },
            methods: {
                addItem(price) {
                    this.state.items = [...this.state.items, { price }];
                    // Read the computed synchronously after the write, as an
                    // event-emitting method would
                    emittedTotal = this.total;
                }
            },
            template() {
                return html`<div></div>`;
            }
        });

        const el = document.createElement('test-computed-sync-read');
        document.body.appendChild(el);

        el.addItem(4.99);
        assert.equal(emittedTotal, 4.99, 'First synchronous read reflects the write');
        el.addItem(3.50);
        assert.equal(emittedTotal, 8.49, 'Second synchronous read is not stale');

        document.body.removeChild(el);
    });

    it('recomputes when props change', (done) => {
        defineComponent('test-computed-props', {
            props: { factor: '2' },
            data() {
                return { x: 3 };
            },
            computed: {
                scaled() { return this.state.x * Number(this.props.factor); }
            },
            template() {
                return html`<div id="scaled">${this.scaled}</div>`;
            }
        });

        const el = document.createElement('test-computed-props');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.ok(el.querySelector('#scaled').textContent.includes('6'),
                'Should compute from initial prop');

            el.factor = '10';

            setTimeout(() => {
                assert.ok(el.querySelector('#scaled').textContent.includes('30'),
                    'Should recompute when a prop changes');
                document.body.removeChild(el);
                done();
            }, 100);
        }, 100);
    });

    it('warns and skips names conflicting with methods or props', () => {
        const originalWarn = console.warn;
        const warnings = [];
        console.warn = (...args) => { warnings.push(String(args[0])); };

        try {
            defineComponent('test-computed-conflict', {
                props: { label: 'hi' },
                data() {
                    return { n: 1 };
                },
                methods: {
                    getValue() { return 'method'; }
                },
                computed: {
                    getValue() { return 'computed'; },  // conflicts with method
                    label() { return 'computed'; },     // conflicts with prop
                    valid() { return this.state.n + 1; }
                },
                template() {
                    return html`<div></div>`;
                }
            });

            const el = document.createElement('test-computed-conflict');
            document.body.appendChild(el);

            assert.equal(el.getValue(), 'method', 'Method should win over conflicting computed');
            assert.equal(el.label, 'hi', 'Prop should win over conflicting computed');
            assert.equal(el.valid, 2, 'Non-conflicting computed still works');
            assert.ok(warnings.some(w => w.includes('getValue')), 'Should warn about method conflict');
            assert.ok(warnings.some(w => w.includes('label')), 'Should warn about prop conflict');

            document.body.removeChild(el);
        } finally {
            console.warn = originalWarn;
        }
    });

    it('disposes on unmount and recreates on reconnect', () => {
        let computeCount = 0;
        defineComponent('test-computed-lifecycle', {
            data() {
                return { x: 1 };
            },
            computed: {
                doubled() {
                    computeCount++;
                    return this.state.x * 2;
                }
            },
            template() {
                return html`<div></div>`;
            }
        });

        const el = document.createElement('test-computed-lifecycle');
        document.body.appendChild(el);
        assert.equal(el.doubled, 2, 'Works while connected');

        document.body.removeChild(el);
        assert.ok(!el._computeds, 'Computed instances disposed on disconnect');

        // State changes while disconnected must not recompute (effect disposed)
        const countWhileDetached = computeCount;
        el.state.x = 7;
        assert.equal(computeCount, countWhileDetached, 'No recompute while disconnected');

        document.body.appendChild(el);
        assert.equal(el.doubled, 14, 'Recreated computed sees current state after reconnect');

        document.body.removeChild(el);
    });
});

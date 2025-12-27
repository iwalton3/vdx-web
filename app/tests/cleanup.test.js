/**
 * Cleanup and Memory Leak Prevention Tests
 * Tests for proper resource cleanup on component unmount
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, createStore } from '../lib/framework.js';

describe('Component Cleanup', function(it) {
    it('calls unmounted lifecycle hook', (done) => {
        let unmountedCalled = false;

        const TestComponent = defineComponent('test-unmounted-hook', {
            unmounted() {
                unmountedCalled = true;
            },
            template() {
                return html`<div>Test</div>`;
            }
        });

        const el = document.createElement('test-unmounted-hook');
        document.body.appendChild(el);

        setTimeout(() => {
            document.body.removeChild(el);

            setTimeout(() => {
                assert.ok(unmountedCalled, 'unmounted() should be called when component is removed');
                done();
            }, 50);
        }, 100);
    });

    it('cleans up store subscriptions via stores option', (done) => {
        const testStore = createStore({ value: 0 });
        let subscriptionActive = false;

        const TestComponent = defineComponent('test-store-cleanup', {
            stores: { testStore },

            mounted() {
                subscriptionActive = true;
            },

            unmounted() {
                subscriptionActive = false;
            },

            template() {
                return html`<div>${this.stores.testStore.value}</div>`;
            }
        });

        const el = document.createElement('test-store-cleanup');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.ok(subscriptionActive, 'Subscription should be active while mounted');

            document.body.removeChild(el);

            setTimeout(() => {
                // Component should have unsubscribed
                assert.ok(!subscriptionActive, 'Component unmounted hook should have run');

                // Update store - should not cause errors
                testStore.set({ value: 1 });

                done();
            }, 100);
        }, 100);
    });

    it('cleans up manual store subscriptions in unmounted', (done) => {
        const testStore = createStore({ count: 0 });
        let updateCount = 0;

        const TestComponent = defineComponent('test-manual-store-cleanup', {
            mounted() {
                this._unsubscribe = testStore.subscribe(state => {
                    void state.count;  // Fine-grained: must access to track
                    updateCount++;
                });
            },

            unmounted() {
                if (this._unsubscribe) {
                    this._unsubscribe();
                }
            },

            template() {
                return html`<div>Test</div>`;
            }
        });

        const el = document.createElement('test-manual-store-cleanup');
        document.body.appendChild(el);

        setTimeout(() => {
            const countAfterMount = updateCount;

            // Update store while mounted
            testStore.set({ count: 1 });

            setTimeout(() => {
                const countAfterUpdate = updateCount;
                assert.ok(countAfterUpdate > countAfterMount, 'Store updates should trigger callback while mounted');

                // Remove component
                document.body.removeChild(el);

                setTimeout(() => {
                    const countAfterUnmount = updateCount;

                    // Update store after unmount
                    testStore.set({ count: 2 });
                    testStore.set({ count: 3 });

                    setTimeout(() => {
                        assert.equal(updateCount, countAfterUnmount,
                            'Store updates should not trigger callback after unmount');
                        done();
                    }, 50);
                }, 100);
            }, 50);
        }, 100);
    });

    it('component is destroyed on unmount', (done) => {
        let isDestroyed = false;

        const TestComponent = defineComponent('test-destroy-flag', {
            unmounted() {
                isDestroyed = true;
            },
            template() {
                return html`<button>Click</button>`;
            }
        });

        const el = document.createElement('test-destroy-flag');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.ok(!isDestroyed, 'Component should not be destroyed while mounted');

            // Remove component
            document.body.removeChild(el);

            setTimeout(() => {
                assert.ok(isDestroyed, 'Component should be destroyed after unmount');
                done();
            }, 100);
        }, 100);
    });

    it('cleans up intervals created in mounted', (done) => {
        let tickCount = 0;

        const TestComponent = defineComponent('test-interval-cleanup', {
            mounted() {
                this._interval = setInterval(() => {
                    tickCount++;
                }, 50);
            },

            unmounted() {
                if (this._interval) {
                    clearInterval(this._interval);
                }
            },

            template() {
                return html`<div>Test</div>`;
            }
        });

        const el = document.createElement('test-interval-cleanup');
        document.body.appendChild(el);

        setTimeout(() => {
            const countAfterMount = tickCount;
            assert.ok(countAfterMount > 0, 'Interval should be running');

            document.body.removeChild(el);

            const countAfterUnmount = tickCount;

            setTimeout(() => {
                // After waiting, count should not have increased much (maybe 1 more tick)
                const countAfterWait = tickCount;
                assert.ok(countAfterWait <= countAfterUnmount + 1,
                    'Interval should stop after unmount');
                done();
            }, 200);
        }, 200);
    });

    it('cleans up document event listeners in unmounted', (done) => {
        let keydownCount = 0;

        const TestComponent = defineComponent('test-doc-listener-cleanup', {
            mounted() {
                this._handleKeydown = (e) => {
                    keydownCount++;
                };
                document.addEventListener('keydown', this._handleKeydown);
            },

            unmounted() {
                document.removeEventListener('keydown', this._handleKeydown);
            },

            template() {
                return html`<div>Test</div>`;
            }
        });

        const el = document.createElement('test-doc-listener-cleanup');
        document.body.appendChild(el);

        setTimeout(() => {
            // Trigger keydown while mounted
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
            assert.equal(keydownCount, 1, 'Keydown should trigger while mounted');

            document.body.removeChild(el);

            setTimeout(() => {
                // Trigger keydown after unmount
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
                assert.equal(keydownCount, 1, 'Keydown should not trigger after unmount');

                done();
            }, 100);
        }, 100);
    });
});

describe('Effect Cleanup', function(it) {
    it('disposes effects when component unmounts', (done) => {
        let effectRunCount = 0;

        const TestComponent = defineComponent('test-effect-dispose', {
            data() {
                return { count: 0 };
            },

            mounted() {
                // The component's reactive effect runs on state changes
                effectRunCount = 0;
            },

            template() {
                effectRunCount++;
                return html`<div>${this.state.count}</div>`;
            }
        });

        const el = document.createElement('test-effect-dispose');
        document.body.appendChild(el);

        setTimeout(() => {
            const initialCount = effectRunCount;

            // Update state
            el.state.count = 1;

            setTimeout(() => {
                assert.ok(effectRunCount > initialCount, 'Effect should run on state change');

                document.body.removeChild(el);

                setTimeout(() => {
                    const countAfterUnmount = effectRunCount;

                    // Try to update state on unmounted component
                    // This should not cause errors or run effects
                    try {
                        el.state.count = 2;
                    } catch (e) {
                        // May throw, which is fine
                    }

                    setTimeout(() => {
                        // Effect should not have run again
                        assert.equal(effectRunCount, countAfterUnmount,
                            'Effects should not run after unmount');
                        done();
                    }, 50);
                }, 100);
            }, 50);
        }, 100);
    });
});

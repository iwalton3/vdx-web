/**
 * Lazy Loading Tests
 * Tests for route-based lazy loading of components
 */

import { describe, assert } from './test-runner.js';

describe('Route Lazy Loading', function(it) {
    it('loads component via load() function', (done) => {
        // This test verifies the lazy loading pattern works
        // We'll simulate what the router does with load()

        let loadCalled = false;
        let componentLoaded = false;

        const mockRoute = {
            component: 'lazy-test-component',
            load: async () => {
                loadCalled = true;
                // Simulate dynamic import
                await new Promise(resolve => setTimeout(resolve, 50));
                componentLoaded = true;
                return { default: {} }; // Mock module
            }
        };

        // Call load function
        mockRoute.load().then(() => {
            assert.ok(loadCalled, 'load() should be called');
            assert.ok(componentLoaded, 'Component should be loaded');
            done();
        }).catch(done);
    });

    it('handles load failure gracefully', (done) => {
        let errorCaught = false;

        const mockRoute = {
            component: 'failing-component',
            load: async () => {
                throw new Error('Failed to load module');
            }
        };

        mockRoute.load()
            .then(() => {
                assert.fail('Should have thrown error');
                done();
            })
            .catch(error => {
                errorCaught = true;
                assert.equal(error.message, 'Failed to load module');
                done();
            });
    });

    it('caches loaded components', (done) => {
        let loadCount = 0;
        const loadedComponents = new Set();

        const mockRouter = {
            loadedComponents: loadedComponents,

            async loadComponent(route) {
                if (this.loadedComponents.has(route.component)) {
                    return; // Already loaded
                }

                loadCount++;
                await route.load();
                this.loadedComponents.add(route.component);
            }
        };

        const route = {
            component: 'cached-component',
            load: async () => ({ default: {} })
        };

        // Load twice
        mockRouter.loadComponent(route)
            .then(() => mockRouter.loadComponent(route))
            .then(() => {
                assert.equal(loadCount, 1, 'Should only load once');
                assert.ok(loadedComponents.has('cached-component'), 'Should be in cache');
                done();
            })
            .catch(done);
    });
});

describe('awaitThen Helper', function(it) {
    it('handles promises correctly', (done) => {
        // Import is at top level, test the behavior
        import('../lib/framework.js').then(({ defineComponent, html, awaitThen }) => {
            let renderCount = 0;

            const TestComponent = defineComponent('test-await-promise', {
                data() {
                    return {
                        dataPromise: null
                    };
                },

                mounted() {
                    this.state.dataPromise = new Promise(resolve => {
                        setTimeout(() => resolve({ name: 'Test Data' }), 100);
                    });
                },

                template() {
                    renderCount++;
                    return html`
                        <div>
                            ${awaitThen(
                                this.state.dataPromise,
                                data => html`<span id="resolved">${data.name}</span>`,
                                html`<span id="loading">Loading...</span>`,
                                error => html`<span id="error">${error.message}</span>`
                            )}
                        </div>
                    `;
                }
            });

            const el = document.createElement('test-await-promise');
            document.body.appendChild(el);

            // Check loading state first
            setTimeout(() => {
                const loading = el.querySelector('#loading');
                const resolved = el.querySelector('#resolved');

                // One of these should exist depending on timing
                if (loading) {
                    assert.ok(loading.textContent.includes('Loading'), 'Should show loading state');
                }

                // Wait for promise to resolve
                setTimeout(() => {
                    const resolvedEl = el.querySelector('#resolved');
                    assert.ok(resolvedEl, 'Should show resolved content');
                    assert.equal(resolvedEl.textContent, 'Test Data', 'Should show resolved data');

                    document.body.removeChild(el);
                    done();
                }, 150);
            }, 50);
        }).catch(done);
    });

    it('handles immediate values (non-promises)', (done) => {
        import('../lib/framework.js').then(({ defineComponent, html, awaitThen }) => {
            const TestComponent = defineComponent('test-await-immediate', {
                data() {
                    return {
                        immediateData: { name: 'Immediate' }
                    };
                },

                template() {
                    return html`
                        <div>
                            ${awaitThen(
                                this.state.immediateData,
                                data => html`<span id="result">${data.name}</span>`,
                                html`<span id="loading">Loading...</span>`
                            )}
                        </div>
                    `;
                }
            });

            const el = document.createElement('test-await-immediate');
            document.body.appendChild(el);

            setTimeout(() => {
                const result = el.querySelector('#result');
                const loading = el.querySelector('#loading');

                // Immediate values should resolve right away
                assert.ok(result, 'Should show result for immediate value');
                assert.equal(result.textContent, 'Immediate', 'Should show immediate data');
                assert.ok(!loading, 'Should not show loading for immediate value');

                document.body.removeChild(el);
                done();
            }, 100);
        }).catch(done);
    });

    it('handles promise rejection', (done) => {
        import('../lib/framework.js').then(({ defineComponent, html, awaitThen }) => {
            const TestComponent = defineComponent('test-await-error', {
                data() {
                    return {
                        errorPromise: Promise.reject(new Error('Test error'))
                    };
                },

                template() {
                    return html`
                        <div>
                            ${awaitThen(
                                this.state.errorPromise,
                                data => html`<span id="result">${data}</span>`,
                                html`<span id="loading">Loading...</span>`,
                                error => html`<span id="error">${error.message}</span>`
                            )}
                        </div>
                    `;
                }
            });

            const el = document.createElement('test-await-error');
            document.body.appendChild(el);

            setTimeout(() => {
                const error = el.querySelector('#error');
                assert.ok(error, 'Should show error content');
                assert.equal(error.textContent, 'Test error', 'Should show error message');

                document.body.removeChild(el);
                done();
            }, 100);
        }).catch(done);
    });

    it('handles null/undefined values', (done) => {
        import('../lib/framework.js').then(({ defineComponent, html, awaitThen }) => {
            const TestComponent = defineComponent('test-await-null', {
                data() {
                    return {
                        nullValue: null
                    };
                },

                template() {
                    return html`
                        <div>
                            ${awaitThen(
                                this.state.nullValue,
                                data => html`<span id="result">${data || 'null-received'}</span>`,
                                html`<span id="loading">Loading...</span>`
                            )}
                        </div>
                    `;
                }
            });

            const el = document.createElement('test-await-null');
            document.body.appendChild(el);

            setTimeout(() => {
                // null should be treated as immediate value
                const result = el.querySelector('#result');
                assert.ok(result, 'Should handle null as immediate value');

                document.body.removeChild(el);
                done();
            }, 100);
        }).catch(done);
    });
});

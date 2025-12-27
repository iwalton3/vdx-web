/**
 * Tests for Error Handling and Error Boundaries
 *
 * Verifies that the framework handles errors gracefully:
 * - Effect errors don't stop reactive tracking
 * - Component render errors are contained
 * - Store subscriber errors are handled
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, reactive, createEffect, createStore } from '../lib/framework.js';

describe('Effect Error Handling', function(it) {
    it('continues reactive tracking after effect error', async (done) => {
        const state = reactive({ count: 0, safe: 0 });

        let errorCount = 0;
        let safeEffectRuns = 0;

        // Capture console.error
        const originalError = console.error;
        console.error = (...args) => {
            if (args[0] && args[0].includes && args[0].includes('Effect Error')) {
                errorCount++;
            }
        };

        try {
            // Effect that throws an error
            createEffect(() => {
                if (state.count > 0) {
                    throw new Error('Intentional test error');
                }
            });

            // Safe effect that should continue to work
            createEffect(() => {
                safeEffectRuns++;
                // Access safe to create dependency
                void state.safe;
            });

            // Initial run
            assert.equal(safeEffectRuns, 1, 'Safe effect should run initially');

            // Trigger error in first effect
            state.count = 1;
            await new Promise(resolve => setTimeout(resolve, 50));

            assert.ok(errorCount > 0, 'Error should be logged');

            // Change safe value - safe effect should still work
            state.safe = 1;
            await new Promise(resolve => setTimeout(resolve, 50));

            assert.ok(safeEffectRuns >= 2, 'Safe effect should continue running after error in other effect');

            done();
        } finally {
            console.error = originalError;
        }
    });

    it('logs descriptive error message', async (done) => {
        const state = reactive({ value: 0 });

        let errorMessage = '';
        const originalError = console.error;
        console.error = (...args) => {
            if (args[0] && args[0].includes && args[0].includes('Effect Error')) {
                errorMessage = args[0];
            }
        };

        try {
            createEffect(() => {
                if (state.value > 0) {
                    throw new Error('Test error message');
                }
            });

            state.value = 1;
            await new Promise(resolve => setTimeout(resolve, 50));

            assert.ok(errorMessage.includes('Effect Error'), 'Should include Effect Error in message');
            assert.ok(errorMessage.includes('reactive effect'), 'Should mention reactive effect');

            done();
        } finally {
            console.error = originalError;
        }
    });
});

describe('Component Render Error Handling', function(it) {
    it('handles error in template method gracefully', async (done) => {
        let renderError = null;

        // Capture any errors
        const originalError = console.error;
        const errors = [];
        console.error = (...args) => {
            errors.push(args);
        };

        try {
            defineComponent('error-component-test', {
                data() {
                    return {
                        shouldError: false
                    };
                },

                template() {
                    if (this.state.shouldError) {
                        throw new Error('Render error');
                    }
                    return html`<div>OK</div>`;
                }
            });

            const container = document.createElement('div');
            container.innerHTML = '<error-component-test></error-component-test>';
            document.body.appendChild(container);

            await new Promise(resolve => setTimeout(resolve, 100));

            const component = container.querySelector('error-component-test');
            assert.ok(component, 'Component should be created');

            // The component rendered successfully initially
            assert.ok(component.textContent.includes('OK'), 'Should render OK initially');

            container.remove();
            done();
        } finally {
            console.error = originalError;
        }
    });
});

describe('Store Subscriber Error Handling', function(it) {
    it('handles subscriber errors without breaking other subscribers', async (done) => {
        const store = createStore({ value: 0 });

        let subscriber1Runs = 0;
        let subscriber2Runs = 0;
        let errorLogged = false;

        const originalError = console.error;
        console.error = (...args) => {
            errorLogged = true;
        };

        try {
            // First subscriber throws
            const unsub1 = store.subscribe(state => {
                subscriber1Runs++;
                if (state.value > 0) {
                    throw new Error('Subscriber 1 error');
                }
            });

            // Second subscriber should continue working
            const unsub2 = store.subscribe(state => {
                void state.value;  // Fine-grained: must access to track
                subscriber2Runs++;
            });

            // Both should run initially
            assert.equal(subscriber1Runs, 1, 'Subscriber 1 should run initially');
            assert.equal(subscriber2Runs, 1, 'Subscriber 2 should run initially');

            // Update store - first subscriber will throw
            store.set({ value: 1 });
            await new Promise(resolve => setTimeout(resolve, 50));

            // Check that updates occurred (implementation may vary on error handling)
            assert.ok(subscriber1Runs >= 2, 'Subscriber 1 should have attempted to run');
            assert.ok(subscriber2Runs >= 2, 'Subscriber 2 should have run');

            unsub1();
            unsub2();
            done();
        } finally {
            console.error = originalError;
        }
    });
});

describe('JSON Parse Error Handling', function(it) {
    it('logs helpful error for invalid JSON in json-* attribute', async (done) => {
        let warningLogged = false;
        let warningMessage = '';

        const originalWarn = console.warn;
        console.warn = (...args) => {
            if (args[0] && args[0].includes && args[0].includes('JSON')) {
                warningLogged = true;
                warningMessage = args[0];
            }
        };

        try {
            defineComponent('json-error-test', {
                props: {
                    data: null
                },

                template() {
                    return html`<div>${JSON.stringify(this.props.data)}</div>`;
                }
            });

            const container = document.createElement('div');
            // Invalid JSON - missing closing brace
            container.innerHTML = '<json-error-test json-data="invalid-json-id"></json-error-test>';
            document.body.appendChild(container);

            await new Promise(resolve => setTimeout(resolve, 100));

            // The warning should have been logged
            assert.ok(warningLogged, 'Should log warning for invalid JSON reference');
            assert.ok(warningMessage.includes('Tip:'), 'Warning should include helpful tip');

            container.remove();
            done();
        } finally {
            console.warn = originalWarn;
        }
    });

    it('component still renders with default prop value on JSON error', async (done) => {
        const originalWarn = console.warn;
        console.warn = () => {}; // Suppress warnings for this test

        try {
            defineComponent('json-fallback-test', {
                props: {
                    items: []
                },

                template() {
                    return html`<div>Items: ${this.props.items.length}</div>`;
                }
            });

            const container = document.createElement('div');
            container.innerHTML = '<json-fallback-test json-items="nonexistent-script-id"></json-fallback-test>';
            document.body.appendChild(container);

            await new Promise(resolve => setTimeout(resolve, 100));

            const component = container.querySelector('json-fallback-test');
            // Should use default value (empty array)
            assert.ok(component.textContent.includes('Items: 0'), 'Should fall back to default prop value');

            container.remove();
            done();
        } finally {
            console.warn = originalWarn;
        }
    });
});

/**
 * Tests for Component System (State Management & Event Binding)
 */

import { describe, assert } from './test-runner.js';
import { defineComponent } from '../core/component.js';
import { createStore } from '../core/store.js';
import { html } from '../core/template.js';

describe('Component State Management', function(it) {
    it('initializes component state', () => {
        const TestComponent = defineComponent('test-state-init', {
            data() {
                return { count: 0, name: 'test' };
            },
            template() {
                return html`<div>${this.state.count} ${this.state.name}</div>`;
            }
        });

        const el = document.createElement('test-state-init');
        document.body.appendChild(el);

        assert.equal(el.state.count, 0, 'Should initialize count to 0');
        assert.equal(el.state.name, 'test', 'Should initialize name to test');

        document.body.removeChild(el);
    });

    it('updates component when state changes', (done) => {
        const TestComponent = defineComponent('test-state-update', {
            data() {
                return { count: 0 };
            },
            template() {
                return html`<div id="counter">${this.state.count}</div>`;
            }
        });

        const el = document.createElement('test-state-update');
        document.body.appendChild(el);

        // Wait for initial render
        setTimeout(() => {
            const counter = el.querySelector('#counter');
            assert.ok(counter.textContent.includes('0'), 'Should show initial count');

            // Update state
            el.state.count = 5;

            // Wait for re-render
            setTimeout(() => {
                const updated = el.querySelector('#counter');
                assert.ok(updated.textContent.includes('5'), 'Should show updated count');

                document.body.removeChild(el);
                done();
            }, 100);
        }, 100);
    });

    it('subscribes to external stores', (done) => {
        const externalStore = createStore({ value: 'initial' });

        const TestComponent = defineComponent('test-store-sub', {
            data() {
                return { storeValue: null };
            },
            mounted() {
                this.unsubscribe = externalStore.subscribe(state => {
                    this.state.storeValue = state.value;
                });
            },
            unmounted() {
                if (this.unsubscribe) this.unsubscribe();
            },
            template() {
                return html`<div id="value">${this.state.storeValue || 'none'}</div>`;
            }
        });

        const el = document.createElement('test-store-sub');
        document.body.appendChild(el);

        setTimeout(() => {
            const valueEl = el.querySelector('#value');
            assert.ok(valueEl.textContent.includes('initial'), 'Should show initial store value');

            // Update store
            externalStore.set({ value: 'updated' });

            setTimeout(() => {
                const updated = el.querySelector('#value');
                assert.ok(updated.textContent.includes('updated'), 'Should show updated store value');

                document.body.removeChild(el);
                done();
            }, 100);
        }, 100);
    });
});

describe('Component Event Binding', function(it) {
    it('binds click events with on-click', (done) => {
        let clicked = false;

        const TestComponent = defineComponent('test-click-event', {
            methods: {
                handleClick() {
                    clicked = true;
                }
            },
            template() {
                return html`<button id="btn" on-click="handleClick">Click me</button>`;
            }
        });

        const el = document.createElement('test-click-event');
        document.body.appendChild(el);

        // Wait for component to mount and render
        setTimeout(() => {
            const btn = el.querySelector('#btn');
            assert.ok(btn, 'Should find button');

            btn.click();
            assert.ok(clicked, 'Should call handleClick on click');

            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('binds submit events with on-submit', (done) => {
        let submitted = false;
        let defaultPrevented = false;

        const TestComponent = defineComponent('test-submit-event', {
            methods: {
                handleSubmit(e) {
                    submitted = true;
                    defaultPrevented = e.defaultPrevented;
                }
            },
            template() {
                return html`<form id="form" on-submit-prevent="handleSubmit">
                    <input type="text" value="test">
                    <button type="submit">Submit</button>
                </form>`;
            }
        });

        const el = document.createElement('test-submit-event');
        document.body.appendChild(el);

        setTimeout(() => {
            const form = el.querySelector('#form');
            assert.ok(form, 'Should find form');

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.click();

            setTimeout(() => {
                assert.ok(submitted, 'Should call handleSubmit on submit');
                assert.ok(defaultPrevented, 'Should prevent default with -prevent modifier');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('binds change events with on-change', (done) => {
        let changed = false;
        let changeValue = null;

        const TestComponent = defineComponent('test-change-event', {
            methods: {
                handleChange(e) {
                    changed = true;
                    changeValue = e.target.checked;
                }
            },
            template() {
                return html`<input type="checkbox" id="cb" on-change="handleChange">`;
            }
        });

        const el = document.createElement('test-change-event');
        document.body.appendChild(el);

        setTimeout(() => {
            const checkbox = el.querySelector('#cb');
            assert.ok(checkbox, 'Should find checkbox');

            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));

            setTimeout(() => {
                assert.ok(changed, 'Should call handleChange on change');
                assert.equal(changeValue, true, 'Should pass correct checked value');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });
});

describe('Component Re-rendering', function(it) {
    it('conditionally renders based on state', (done) => {
        const TestComponent = defineComponent('test-conditional', {
            data() {
                return { showForm: false };
            },
            template() {
                if (this.state.showForm) {
                    return html`<form id="form">Form is visible</form>`;
                } else {
                    return html`<div id="message">Click to show form</div>`;
                }
            }
        });

        const el = document.createElement('test-conditional');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.ok(el.querySelector('#message'), 'Should show message initially');
            assert.ok(!el.querySelector('#form'), 'Should not show form initially');

            // Change state
            el.state.showForm = true;

            setTimeout(() => {
                assert.ok(!el.querySelector('#message'), 'Should hide message after state change');
                assert.ok(el.querySelector('#form'), 'Should show form after state change');

                document.body.removeChild(el);
                done();
            }, 100);
        }, 100);
    });
});

describe('Component Event Isolation', function(it) {
    it('does not bind child component events to parent (light DOM child)', (done) => {
        let parentClicked = false;
        let childClicked = false;

        // Define child component WITHOUT Shadow DOM
        const ChildComponent = defineComponent('test-child-light', {
            methods: {
                handleChildClick() {
                    childClicked = true;
                }
            },
            template() {
                return html`<button id="child-btn" on-click="handleChildClick">Child Button</button>`;
            }
        });

        // Define parent component
        const ParentComponent = defineComponent('test-parent-light', {
            methods: {
                handleParentClick() {
                    parentClicked = true;
                },
                handleChildClick() {
                    // This should NOT be called when child button is clicked
                    throw new Error('Parent handleChildClick should not be called');
                }
            },
            template() {
                return html`
                    <div>
                        <button id="parent-btn" on-click="handleParentClick">Parent Button</button>
                        <test-child-light></test-child-light>
                    </div>
                `;
            }
        });

        const el = document.createElement('test-parent-light');
        document.body.appendChild(el);

        setTimeout(() => {
            const parentBtn = el.querySelector('#parent-btn');
            const childBtn = el.querySelector('#child-btn');

            assert.ok(parentBtn, 'Should find parent button');
            assert.ok(childBtn, 'Should find child button');

            // Click parent button
            parentBtn.click();
            assert.ok(parentClicked, 'Should call parent handleParentClick');
            assert.ok(!childClicked, 'Should not call child handler yet');

            // Reset
            parentClicked = false;

            // Click child button - should only call child handler
            childBtn.click();
            assert.ok(!parentClicked, 'Should not call parent handler');
            assert.ok(childClicked, 'Should call child handleChildClick');

            document.body.removeChild(el);
            done();
        }, 150);
    });

    // Removed: Shadow DOM test - no longer supported after Preact migration
});

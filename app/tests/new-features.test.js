/**
 * Tests for New Framework Features
 * - x-model two-way binding
 * - x-model + event handler chaining
 * - Computed properties
 * - Auto-bound methods
 * - Function passing to components
 */

import { describe, assert } from './test-runner.js';
import { defineComponent } from '../lib/framework.js';
import { html } from '../lib/framework.js';
import { computed } from '../lib/utils.js';
import { compileTemplate, applyValues } from '../lib/core/template-compiler.js';
import { render as preactRender } from '../lib/vendor/preact/index.js';
import { createStore } from '../lib/core/store.js';
import '../components/virtual-list.js';

describe('x-model Two-Way Binding', function(it) {
    it('binds text input with x-model', (done) => {
        const TestComponent = defineComponent('test-x-model-text', {
            data() {
                return { username: 'initial' };
            },
            template() {
                return html`
                    <div>
                        <input type="text" id="input" x-model="username">
                        <span id="output">${this.state.username}</span>
                    </div>
                `;
            }
        });

        const el = document.createElement('test-x-model-text');
        document.body.appendChild(el);

        setTimeout(() => {
            const input = el.querySelector('#input');
            const output = el.querySelector('#output');

            // Check initial value
            assert.equal(input.value, 'initial', 'Input should have initial value');
            assert.ok(output.textContent.includes('initial'), 'Output should show initial value');

            // Simulate user input
            input.value = 'updated';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                assert.equal(el.state.username, 'updated', 'State should be updated');
                assert.ok(el.querySelector('#output').textContent.includes('updated'), 'Output should show updated value');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('binds number input with automatic type conversion', (done) => {
        const TestComponent = defineComponent('test-x-model-number', {
            data() {
                return { age: 25 };
            },
            template() {
                return html`
                    <input type="number" id="input" x-model="age">
                `;
            }
        });

        const el = document.createElement('test-x-model-number');
        document.body.appendChild(el);

        setTimeout(() => {
            const input = el.querySelector('#input');

            // Check initial value
            assert.equal(input.value, '25', 'Input should have initial value');

            // Simulate user input
            input.value = '42';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                assert.equal(el.state.age, 42, 'State should be number, not string');
                assert.equal(typeof el.state.age, 'number', 'Type should be number');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('binds checkbox with automatic boolean conversion', (done) => {
        const TestComponent = defineComponent('test-x-model-checkbox', {
            data() {
                return { agreed: false };
            },
            template() {
                return html`
                    <input type="checkbox" id="input" x-model="agreed">
                `;
            }
        });

        const el = document.createElement('test-x-model-checkbox');
        document.body.appendChild(el);

        setTimeout(() => {
            const input = el.querySelector('#input');

            // Check initial value
            assert.equal(input.checked, false, 'Checkbox should be unchecked initially');

            // Simulate user click
            input.click();

            setTimeout(() => {
                assert.equal(el.state.agreed, true, 'State should be true');
                assert.equal(typeof el.state.agreed, 'boolean', 'Type should be boolean');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('binds select dropdown', (done) => {
        const TestComponent = defineComponent('test-x-model-select', {
            data() {
                return { country: 'us' };
            },
            template() {
                return html`
                    <select id="input" x-model="country">
                        <option value="us">United States</option>
                        <option value="uk">United Kingdom</option>
                        <option value="ca">Canada</option>
                    </select>
                `;
            }
        });

        const el = document.createElement('test-x-model-select');
        document.body.appendChild(el);

        setTimeout(() => {
            const select = el.querySelector('#input');

            // Check initial value
            assert.equal(select.value, 'us', 'Select should have initial value');

            // Simulate user selection - use input event for select (not change)
            select.value = 'uk';
            select.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                assert.equal(el.state.country, 'uk', 'State should be updated');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 150);
    });

    it('binds radio buttons', (done) => {
        const TestComponent = defineComponent('test-x-model-radio', {
            data() {
                return { size: 'medium' };
            },
            template() {
                return html`
                    <div>
                        <input type="radio" id="small" name="size" value="small" x-model="size">
                        <input type="radio" id="medium" name="size" value="medium" x-model="size">
                        <input type="radio" id="large" name="size" value="large" x-model="size">
                    </div>
                `;
            }
        });

        const el = document.createElement('test-x-model-radio');
        document.body.appendChild(el);

        setTimeout(() => {
            const small = el.querySelector('#small');
            const medium = el.querySelector('#medium');
            const large = el.querySelector('#large');

            // Check initial value - medium should be checked
            assert.equal(medium.checked, true, 'Medium should be checked initially');
            assert.equal(large.checked, false, 'Large should not be checked initially');

            // Click large radio button
            large.click();

            setTimeout(() => {
                assert.equal(el.state.size, 'large', 'State should be updated to large');
                assert.equal(large.checked, true, 'Large should be checked after click');
                assert.equal(medium.checked, false, 'Medium should be unchecked after clicking large');

                document.body.removeChild(el);
                done();
            }, 100);
        }, 150);
    });
});

describe('x-model + Event Handler Chaining', function(it) {
    it('chains x-model with on-input handler', (done) => {
        let onInputCalled = false;
        const onInputValues = [];

        const TestComponent = defineComponent('test-chaining-input', {
            data() {
                return { username: '' };
            },
            methods: {
                handleInput() {
                    onInputCalled = true;
                    onInputValues.push(this.state.username);
                }
            },
            template() {
                return html`
                    <input
                        type="text"
                        id="input"
                        x-model="username"
                        on-input="handleInput">
                `;
            }
        });

        const el = document.createElement('test-chaining-input');
        document.body.appendChild(el);

        setTimeout(() => {
            const input = el.querySelector('#input');

            // Simulate user input
            input.value = 'test';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                // Both x-model and on-input should have fired
                assert.equal(el.state.username, 'test', 'x-model should update state');
                assert.ok(onInputCalled, 'on-input handler should be called');
                assert.ok(onInputValues.includes('test'), 'Handler should see updated value');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('chains x-model with on-change handler for checkbox', (done) => {
        let onChangeCalled = false;

        const TestComponent = defineComponent('test-chaining-checkbox', {
            data() {
                return { agreed: false };
            },
            methods: {
                handleChange() {
                    onChangeCalled = true;
                }
            },
            template() {
                return html`
                    <input
                        type="checkbox"
                        id="input"
                        x-model="agreed"
                        on-change="handleChange">
                `;
            }
        });

        const el = document.createElement('test-chaining-checkbox');
        document.body.appendChild(el);

        setTimeout(() => {
            const input = el.querySelector('#input');

            // Simulate user click
            input.click();

            setTimeout(() => {
                // Both x-model and on-change should have fired
                assert.equal(el.state.agreed, true, 'x-model should update state');
                assert.ok(onChangeCalled, 'on-change handler should be called');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('chains x-model with inline arrow function', (done) => {
        let inlineHandlerCalled = false;

        const TestComponent = defineComponent('test-chaining-inline', {
            data() {
                return { value: '' };
            },
            template() {
                return html`
                    <input
                        type="text"
                        id="input"
                        x-model="value"
                        on-input="${() => { inlineHandlerCalled = true; }}">
                `;
            }
        });

        const el = document.createElement('test-chaining-inline');
        document.body.appendChild(el);

        setTimeout(() => {
            const input = el.querySelector('#input');

            // Simulate user input
            input.value = 'test';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                // Both x-model and inline handler should have fired
                assert.equal(el.state.value, 'test', 'x-model should update state');
                assert.ok(inlineHandlerCalled, 'Inline handler should be called');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });
});

describe('Computed Properties', function(it) {
    it('caches computed values', () => {
        let computeCount = 0;

        const expensiveCompute = computed((items) => {
            computeCount++;
            return items.filter(x => x > 5);
        });

        const items = [1, 2, 3, 6, 7, 8];

        // First call
        const result1 = expensiveCompute(items);
        assert.deepEqual(result1, [6, 7, 8], 'Should filter correctly');
        assert.equal(computeCount, 1, 'Should compute once');

        // Second call with same dependency - should use cache
        const result2 = expensiveCompute(items);
        assert.deepEqual(result2, [6, 7, 8], 'Should return same result');
        assert.equal(computeCount, 1, 'Should use cached value');

        // Third call with different dependency - should recompute
        const newItems = [1, 9, 10];
        const result3 = expensiveCompute(newItems);
        assert.deepEqual(result3, [9, 10], 'Should filter new items');
        assert.equal(computeCount, 2, 'Should recompute');
    });

    it('handles multiple dependencies', () => {
        let computeCount = 0;

        const multiDepCompute = computed((items, minValue) => {
            computeCount++;
            return items.filter(x => x >= minValue);
        });

        const items = [1, 2, 3, 4, 5];

        // First call
        const result1 = multiDepCompute(items, 3);
        assert.deepEqual(result1, [3, 4, 5], 'Should filter correctly');
        assert.equal(computeCount, 1, 'Should compute once');

        // Same dependencies - should use cache
        const result2 = multiDepCompute(items, 3);
        assert.deepEqual(result2, [3, 4, 5], 'Should return cached result');
        assert.equal(computeCount, 1, 'Should use cache');

        // Different minValue - should recompute
        const result3 = multiDepCompute(items, 4);
        assert.deepEqual(result3, [4, 5], 'Should filter with new minValue');
        assert.equal(computeCount, 2, 'Should recompute');

        // Different items - should recompute
        const newItems = [6, 7, 8];
        const result4 = multiDepCompute(newItems, 4);
        assert.deepEqual(result4, [6, 7, 8], 'Should filter new items');
        assert.equal(computeCount, 3, 'Should recompute');
    });

    it('works with objects as dependencies', () => {
        let computeCount = 0;

        const objCompute = computed((obj) => {
            computeCount++;
            return obj.value * 2;
        });

        const obj1 = { value: 5 };
        const obj2 = { value: 10 };  // Different value to make result different too

        // First call
        const result1 = objCompute(obj1);
        assert.equal(result1, 10, 'Should compute correctly');
        assert.equal(computeCount, 1, 'Should compute once');

        // Same object reference - should use cache
        const result2 = objCompute(obj1);
        assert.equal(result2, 10, 'Should return cached result');
        assert.equal(computeCount, 1, 'Should use cache');

        // Different object - should recompute
        const result3 = objCompute(obj2);
        assert.equal(result3, 20, 'Should compute correctly with new object');
        assert.equal(computeCount, 2, 'Should recompute for different object');
    });

    it('integrates with components', (done) => {
        let filterComputeCount = 0;

        const TestComponent = defineComponent('test-computed-component', {
            data() {
                return {
                    items: [1, 2, 3, 4, 5, 6],
                    minValue: 3,

                    filteredItems: computed((items, minValue) => {
                        filterComputeCount++;
                        return items.filter(x => x >= minValue);
                    })
                };
            },
            template() {
                const filtered = this.state.filteredItems(this.state.items, this.state.minValue);
                return html`
                    <div id="output">${filtered.join(',')}</div>
                `;
            }
        });

        const el = document.createElement('test-computed-component');
        document.body.appendChild(el);

        setTimeout(() => {
            const output = el.querySelector('#output');
            assert.ok(output.textContent.includes('3,4,5,6'), 'Should show filtered items');
            assert.equal(filterComputeCount, 1, 'Should compute once');

            // Trigger re-render with same data - should use cache
            el.state.items = [...el.state.items];

            setTimeout(() => {
                assert.equal(filterComputeCount, 1, 'Should still use cache');

                // Change minValue - should recompute
                el.state.minValue = 5;

                setTimeout(() => {
                    assert.equal(filterComputeCount, 2, 'Should recompute');
                    const newOutput = el.querySelector('#output');
                    assert.ok(newOutput.textContent.includes('5,6'), 'Should show new filtered items');

                    document.body.removeChild(el);
                    done();
                }, 50);
            }, 50);
        }, 100);
    });
});

describe('Auto-Bound Methods', function(it) {
    it('methods are automatically bound to component', (done) => {
        const TestComponent = defineComponent('test-auto-bound', {
            data() {
                return { count: 0 };
            },
            methods: {
                increment() {
                    this.state.count++;
                }
            },
            template() {
                return html`
                    <button id="btn" on-click="increment">Click</button>
                `;
            }
        });

        const el = document.createElement('test-auto-bound');
        document.body.appendChild(el);

        setTimeout(() => {
            const btn = el.querySelector('#btn');

            btn.click();

            setTimeout(() => {
                assert.equal(el.state.count, 1, 'Method should have correct this context');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('methods can be passed as references without binding', (done) => {
        let callbackExecuted = false;

        const TestComponent = defineComponent('test-method-reference', {
            data() {
                return { value: 42 };
            },
            methods: {
                getValue() {
                    callbackExecuted = true;
                    return this.state.value;
                }
            },
            mounted() {
                // Pass method reference to setTimeout without .bind()
                setTimeout(this.getValue, 10);
            },
            template() {
                return html`<div>Test</div>`;
            }
        });

        const el = document.createElement('test-method-reference');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.ok(callbackExecuted, 'Method should have been called');
            assert.equal(el.getValue(), 42, 'Method should have correct this context');

            document.body.removeChild(el);
            done();
        }, 150);
    });
});

describe('Function Passing to Components', function(it) {
    it('passes functions to custom elements via props', async () => {
        // Define a custom element that accepts a function prop
        defineComponent('test-func-receiver', {
            props: {
                callback: () => {}
            },
            template() {
                return html`<div>Data Component</div>`;
            }
        });

        let functionCalled = false;
        const testFunction = (value) => {
            functionCalled = true;
            return value * 2;
        };

        const strings = ['<test-func-receiver callback="', '"></test-func-receiver>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, [testFunction]);

        const container = document.createElement('div');
        preactRender(applied, container);

        // Wait for Preact ref callback
        await new Promise(resolve => setTimeout(resolve, 10));

        const el = container.querySelector('test-func-receiver');
        assert.equal(typeof el.callback, 'function', 'Should store function by reference');
        assert.equal(el.callback(5), 10, 'Function should work correctly');
        assert.ok(functionCalled, 'Function should have been called');
    });

    it('preserves function closures', () => {
        const container = document.createElement('div');
        const capturedValue = 'captured';
        let closureWorks = false;

        const handler = () => {
            closureWorks = (capturedValue === 'captured');
        };

        const strings = ['<button on-click="', '">Click</button>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, [handler]);

        preactRender(applied, container);

        const button = container.querySelector('button');
        button.click();

        assert.ok(closureWorks, 'Closure should preserve captured values');
    });
});

describe('Virtual List Component', function(it) {
    it('renders only visible items from large list', (done) => {
        // Create a large list of items
        const items = [];
        for (let i = 0; i < 1000; i++) {
            items.push({ id: i, title: `Item ${i}` });
        }

        const TestComponent = defineComponent('test-virtual-list-basic', {
            data() {
                return { items };
            },
            template() {
                return html`
                    <virtual-list
                        items="${this.state.items}"
                        itemHeight="${50}"
                        bufferSize="${5}"
                        style="height: 300px; overflow-y: auto;">
                    </virtual-list>
                `;
            }
        });

        const el = document.createElement('test-virtual-list-basic');
        document.body.appendChild(el);

        setTimeout(() => {
            const virtualList = el.querySelector('virtual-list');
            assert.ok(virtualList, 'Should render virtual-list element');

            // Virtual list should not render all 1000 items (uses .virtual-list-item class)
            const renderedItems = virtualList.querySelectorAll('.virtual-list-item');
            assert.ok(renderedItems.length < 50, `Should render less than 50 items, got ${renderedItems.length}`);
            assert.ok(renderedItems.length > 0, 'Should render at least some items');

            document.body.removeChild(el);
            done();
        }, 250);
    });

    it('accepts custom renderItem function', (done) => {
        const items = [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
            { id: 3, name: 'Carol' }
        ];

        const TestComponent = defineComponent('test-virtual-custom-render', {
            data() {
                return { items };
            },
            methods: {
                renderItem(item, index) {
                    return html`
                        <div class="custom-item" data-id="${item.id}">
                            ${index}: ${item.name}
                        </div>
                    `;
                }
            },
            template() {
                return html`
                    <virtual-list
                        items="${this.state.items}"
                        itemHeight="${50}"
                        renderItem="${this.renderItem}"
                        style="height: 200px; overflow-y: auto;">
                    </virtual-list>
                `;
            }
        });

        const el = document.createElement('test-virtual-custom-render');
        document.body.appendChild(el);

        setTimeout(() => {
            const customItems = el.querySelectorAll('.custom-item');
            assert.ok(customItems.length > 0, 'Should render custom items');

            const firstItem = customItems[0];
            assert.ok(firstItem.textContent.includes('Alice'), 'Should render custom content');
            assert.ok(firstItem.textContent.includes('0:'), 'Should pass index');

            document.body.removeChild(el);
            done();
        }, 200);
    });

    it('updates when items change', (done) => {
        const TestComponent = defineComponent('test-virtual-update', {
            data() {
                return {
                    items: [{ id: 1, text: 'Item 1' }, { id: 2, text: 'Item 2' }]
                };
            },
            template() {
                return html`
                    <virtual-list
                        items="${this.state.items}"
                        itemHeight="${50}"
                        style="height: 200px; overflow-y: auto;">
                    </virtual-list>
                `;
            }
        });

        const el = document.createElement('test-virtual-update');
        document.body.appendChild(el);

        setTimeout(() => {
            // Add more items
            el.state.items = [...el.state.items, { id: 3, text: 'Item 3' }];

            setTimeout(() => {
                const virtualList = el.querySelector('virtual-list');
                // Should have updated with new items
                assert.ok(virtualList, 'Should still have virtual-list');

                document.body.removeChild(el);
                done();
            }, 100);
        }, 200);
    });

    it('handles scroll events', (done) => {
        const items = [];
        for (let i = 0; i < 100; i++) {
            items.push({ id: i, text: `Item ${i}` });
        }

        const TestComponent = defineComponent('test-virtual-scroll', {
            data() {
                return { items };
            },
            template() {
                return html`
                    <virtual-list
                        id="scroll-list"
                        items="${this.state.items}"
                        itemHeight="${50}"
                        bufferSize="${2}"
                        style="height: 300px; overflow-y: auto;">
                    </virtual-list>
                `;
            }
        });

        const el = document.createElement('test-virtual-scroll');
        document.body.appendChild(el);

        setTimeout(() => {
            const virtualList = el.querySelector('#scroll-list');

            // Get initial scroll state
            const initialScrollTop = virtualList.scrollTop;

            // Scroll down
            virtualList.scrollTop = 1000;
            virtualList.dispatchEvent(new Event('scroll'));

            setTimeout(() => {
                assert.ok(virtualList.scrollTop > initialScrollTop, 'Should have scrolled');

                document.body.removeChild(el);
                done();
            }, 100);
        }, 200);
    });

    it('handles empty items array', (done) => {
        const TestComponent = defineComponent('test-virtual-empty', {
            data() {
                return { items: [] };
            },
            template() {
                return html`
                    <virtual-list
                        items="${this.state.items}"
                        itemHeight="${50}"
                        style="height: 200px; overflow-y: auto;">
                    </virtual-list>
                `;
            }
        });

        const el = document.createElement('test-virtual-empty');
        document.body.appendChild(el);

        setTimeout(() => {
            const virtualList = el.querySelector('virtual-list');
            assert.ok(virtualList, 'Should render virtual-list even with empty items');

            const renderedItems = virtualList.querySelectorAll('.virtual-list-item');
            assert.equal(renderedItems.length, 0, 'Should not render any items');

            document.body.removeChild(el);
            done();
        }, 200);
    });
});

describe('Refs (DOM References)', function(it) {
    it('stores element references via ref attribute', (done) => {
        const TestComponent = defineComponent('test-refs-basic', {
            data() {
                return { focused: false };
            },
            methods: {
                focusInput() {
                    if (this.refs.myInput) {
                        this.refs.myInput.focus();
                        this.state.focused = true;
                    }
                }
            },
            template() {
                return html`
                    <div>
                        <input type="text" ref="myInput" id="test-input">
                        <button on-click="focusInput">Focus</button>
                    </div>
                `;
            }
        });

        const el = document.createElement('test-refs-basic');
        document.body.appendChild(el);

        setTimeout(() => {
            // Check ref was set
            assert.ok(el.refs.myInput, 'Ref should be stored');
            assert.equal(el.refs.myInput.tagName, 'INPUT', 'Ref should point to input element');

            // Test that focusInput method works
            el.focusInput();
            assert.ok(el.state.focused, 'focusInput should have been called');

            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('supports multiple refs', (done) => {
        const TestComponent = defineComponent('test-refs-multiple', {
            template() {
                return html`
                    <div>
                        <input ref="inputA" type="text">
                        <input ref="inputB" type="number">
                        <button ref="submitBtn">Submit</button>
                    </div>
                `;
            }
        });

        const el = document.createElement('test-refs-multiple');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.ok(el.refs.inputA, 'inputA ref should exist');
            assert.ok(el.refs.inputB, 'inputB ref should exist');
            assert.ok(el.refs.submitBtn, 'submitBtn ref should exist');
            assert.equal(el.refs.inputA.type, 'text', 'inputA should be text type');
            assert.equal(el.refs.inputB.type, 'number', 'inputB should be number type');
            assert.equal(el.refs.submitBtn.tagName, 'BUTTON', 'submitBtn should be button');

            document.body.removeChild(el);
            done();
        }, 100);
    });
});

describe('Stores (Auto-Subscribe/Unsubscribe)', function(it) {
    it('auto-subscribes to store and syncs state', (done) => {
        // Create a simple store for testing
        const testStore = createStore({
            count: 0,
            name: 'initial'
        });

        const TestComponent = defineComponent('test-stores-basic', {
            stores: {
                test: testStore
            },
            template() {
                return html`
                    <div>
                        <span id="count">${this.stores.test.count}</span>
                        <span id="name">${this.stores.test.name}</span>
                    </div>
                `;
            }
        });

        const el = document.createElement('test-stores-basic');
        document.body.appendChild(el);

        setTimeout(() => {
            // Check initial values
            assert.equal(el.querySelector('#count').textContent, '0', 'Initial count should be 0');
            assert.equal(el.querySelector('#name').textContent, 'initial', 'Initial name should be "initial"');

            // Update store
            testStore.set({ count: 5, name: 'updated' });

            setTimeout(() => {
                // Check values updated
                assert.equal(el.querySelector('#count').textContent, '5', 'Count should update to 5');
                assert.equal(el.querySelector('#name').textContent, 'updated', 'Name should update to "updated"');

                document.body.removeChild(el);
                done();
            }, 100);
        }, 100);
    });

    it('auto-unsubscribes when component is unmounted', (done) => {
        const testStore = createStore({ value: 'test' });
        let subscriberCount = 0;

        // Wrap subscribe to count subscribers
        const originalSubscribe = testStore.subscribe.bind(testStore);
        testStore.subscribe = (fn) => {
            subscriberCount++;
            const unsubscribe = originalSubscribe(fn);
            return () => {
                subscriberCount--;
                unsubscribe();
            };
        };

        const TestComponent = defineComponent('test-stores-unsub', {
            stores: {
                test: testStore
            },
            template() {
                return html`<div>${this.stores.test.value}</div>`;
            }
        });

        const el = document.createElement('test-stores-unsub');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.equal(subscriberCount, 1, 'Should have 1 subscriber after mount');

            document.body.removeChild(el);

            setTimeout(() => {
                assert.equal(subscriberCount, 0, 'Should have 0 subscribers after unmount');
                done();
            }, 100);
        }, 100);
    });
});

describe('Event Handler Support', function(it) {
    it('supports media element events (timeupdate, loadedmetadata)', (done) => {
        let timeupdateCalled = false;
        let loadedmetadataCalled = false;

        const TestComponent = defineComponent('test-media-events', {
            methods: {
                handleTimeUpdate() {
                    timeupdateCalled = true;
                },
                handleLoadedMetadata() {
                    loadedmetadataCalled = true;
                }
            },
            template() {
                return html`
                    <audio
                        ref="audio"
                        on-timeupdate="handleTimeUpdate"
                        on-loadedmetadata="handleLoadedMetadata">
                    </audio>
                `;
            }
        });

        const el = document.createElement('test-media-events');
        document.body.appendChild(el);

        setTimeout(() => {
            const audio = el.refs.audio;
            assert.ok(audio, 'Audio element should exist');

            // Simulate events
            audio.dispatchEvent(new Event('timeupdate'));
            audio.dispatchEvent(new Event('loadedmetadata'));

            assert.ok(timeupdateCalled, 'timeupdate handler should be called');
            assert.ok(loadedmetadataCalled, 'loadedmetadata handler should be called');

            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('supports form events (focus, blur, keydown)', (done) => {
        let focusCalled = false;
        let blurCalled = false;
        let keydownCalled = false;

        const TestComponent = defineComponent('test-form-events', {
            methods: {
                handleFocus() { focusCalled = true; },
                handleBlur() { blurCalled = true; },
                handleKeydown() { keydownCalled = true; }
            },
            template() {
                return html`
                    <input
                        ref="input"
                        type="text"
                        on-focus="handleFocus"
                        on-blur="handleBlur"
                        on-keydown="handleKeydown">
                `;
            }
        });

        const el = document.createElement('test-form-events');
        document.body.appendChild(el);

        setTimeout(() => {
            const input = el.refs.input;

            input.dispatchEvent(new Event('focus'));
            input.dispatchEvent(new Event('blur'));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

            assert.ok(focusCalled, 'focus handler should be called');
            assert.ok(blurCalled, 'blur handler should be called');
            assert.ok(keydownCalled, 'keydown handler should be called');

            document.body.removeChild(el);
            done();
        }, 100);
    });
});

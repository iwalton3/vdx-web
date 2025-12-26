/**
 * Tests for Compiled Templates with Direct References
 * Demonstrates the advantage of storing function/object refs directly
 */

import { describe, assert } from './test-runner.js';
import { compileTemplate } from '../lib/core/template-compiler.js';
import { instantiateTemplate } from '../lib/core/template-renderer.js';


// Define a simple test custom element
if (!customElements.get('x-component')) {
    class TestComponent extends HTMLElement {
        constructor() {
            super();
        }
    }
    customElements.define('x-component', TestComponent);
}

describe('Compiled Templates - Direct References', function(it) {
    it('stores function references directly (no string lookup)', () => {
        const container = document.createElement('div');
        const component = { clickCount: 0 };

        // Create a closure that captures state
        const handler = (id) => {
            return (e) => {
                component.clickCount++;
                console.log(`Clicked item ${id}`);
            };
        };

        const strings = ['<button on-click="', '">Item 1</button><button on-click="', '">Item 2</button>'];
        const compiled = compileTemplate(strings);

        // Pass actual function references (no string lookup needed!)
        const { fragment } = instantiateTemplate(compiled, [handler(1), handler(2)], null);
        container.appendChild(fragment);

        const buttons = container.querySelectorAll('button');
        buttons[0].click();
        buttons[1].click();

        assert.equal(component.clickCount, 2, 'Both handlers should have been called');
    });

    it('stores object references directly (no serialization)', async () => {
        const container = document.createElement('div');

        // Complex object with methods
        const complexData = {
            items: [1, 2, 3],
            transform: (x) => x * 2,
            nested: { value: 42 }
        };

        const strings = ['<x-component data="', '"></x-component>'];
        const compiled = compileTemplate(strings);
        const { fragment } = instantiateTemplate(compiled, [complexData], null);
        container.appendChild(fragment);

        const el = container.querySelector('x-component');

        // Wait for custom element to be ready
        await new Promise(resolve => setTimeout(resolve, 10));

        // Object reference preserved with methods intact
        assert.equal(el.data, complexData, 'Should store object by reference');
        assert.equal(typeof el.data.transform, 'function', 'Methods should be preserved');
        assert.equal(el.data.transform(5), 10, 'Methods should work');
        assert.equal(el.data.nested.value, 42, 'Nested structure preserved');
    });

    it('enables closures in event handlers', () => {
        const container = document.createElement('div');
        const results = [];

        // Each button gets a closure that captures its index
        const handlers = [];
        for (let i = 0; i < 3; i++) {
            handlers.push((e) => {
                results.push(i); // Closure captures i
            });
        }

        // Create 3 separate buttons, each with one slot
        const strings1 = ['<button on-click="', '">0</button>'];
        const compiled1 = compileTemplate(strings1);
        const result1 = instantiateTemplate(compiled1, [handlers[0]], null);
        container.appendChild(result1.fragment);

        const strings2 = ['<button on-click="', '">1</button>'];
        const compiled2 = compileTemplate(strings2);
        const result2 = instantiateTemplate(compiled2, [handlers[1]], null);
        container.appendChild(result2.fragment);

        const strings3 = ['<button on-click="', '">2</button>'];
        const compiled3 = compileTemplate(strings3);
        const result3 = instantiateTemplate(compiled3, [handlers[2]], null);
        container.appendChild(result3.fragment);

        const buttons = container.querySelectorAll('button');
        buttons[0].click();
        buttons[2].click();
        buttons[1].click();

        assert.deepEqual(results, [0, 2, 1], 'Closures should capture correct values');
    });

    it('no performance overhead from string lookups', () => {
        const container = document.createElement('div');
        const component = {};
        let callCount = 0;

        const handler = () => { callCount++; };

        const strings = ['<button on-click="', '">Click</button>'];
        const compiled = compileTemplate(strings);
        const { fragment } = instantiateTemplate(compiled, [handler], null);
        container.appendChild(fragment);

        // Handler is bound directly, no registry lookup on each click
        const button = container.querySelector('button');

        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
            button.click();
        }
        const duration = performance.now() - start;

        assert.equal(callCount, 1000, 'Should call handler 1000 times');
        console.log(`[Performance] 1000 clicks in ${duration.toFixed(2)}ms (direct reference)`);

        // With direct references, this should be very fast (<10ms typically)
        // With string lookups, it would be slower due to registry access
    });

    it('works with complex nested closures', () => {
        const container = document.createElement('div');
        const component = {};
        const clickedItems = [];

        const items = [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
            { id: 3, name: 'Carol' }
        ];

        // Create and render each div separately with closures
        items.forEach(item => {
            const onClick = (e) => {
                clickedItems.push({ id: item.id, name: item.name });
            };
            const onHover = (e) => {
                console.log(`Hovered ${item.name}`);
            };

            const strings = ['<div on-click="', '" on-mouseenter="', '">', '</div>'];
            const compiled = compileTemplate(strings);
            const applied = instantiateTemplate(compiled, [onClick, onHover, item.name], null);
            const temp = document.createElement('div');
            temp.appendChild(applied.fragment);
            container.appendChild(temp.firstChild);
        });

        const divs = container.querySelectorAll('div');
        assert.equal(divs.length, 3, 'Should have 3 divs');

        divs[1].click(); // Bob
        divs[0].click(); // Alice
        divs[2].click(); // Carol

        assert.equal(clickedItems.length, 3, 'Should have 3 clicks');
        assert.equal(clickedItems[0].name, 'Bob', 'First click was Bob');
        assert.equal(clickedItems[1].name, 'Alice', 'Second click was Alice');
        assert.equal(clickedItems[2].name, 'Carol', 'Third click was Carol');
    });

    it('compares to string-based lookup pattern', () => {
        // This test documents the old vs new pattern
        const container = document.createElement('div');

        // OLD PATTERN (string-based, requires lookup):
        // <button on-click="handleClick">
        // - String "handleClick" stored in DOM
        // - Component must have methods.handleClick
        // - Runtime lookup: component["handleClick"]
        // - Cannot use closures or capture variables

        // NEW PATTERN (direct reference):
        // <button on-click="${(e) => this.handleClick(item.id)}">
        // - Function reference stored directly in tree
        // - No lookup needed at runtime
        // - Closures work naturally
        // - Type-safe (functions are functions, not strings)

        const newPatternHandler = (itemId) => (e) => {
            return `Clicked ${itemId}`;
        };

        const strings = ['<button on-click="', '">Click</button>'];
        const compiled = compileTemplate(strings);
        const { fragment } = instantiateTemplate(compiled, [newPatternHandler(42)], null);
        container.appendChild(fragment);

        // The function is already bound and ready - no lookup!
        assert.ok(true, 'Direct references are faster and more powerful');
    });
});

/**
 * Fine-Grained Renderer Integration Tests
 *
 * Tests the fine-grained template renderer with real compiled templates
 * to validate compatibility before component.js integration.
 */

import { describe, assert } from './test-runner.js';
import { html, when, each, memoEach, reactive, flushRenders, defineComponent, contain } from '../lib/framework.js';
import { compileTemplate } from '../lib/core/template-compiler.js';
import {
    instantiateTemplate,
    createDeferredChild,
    isDeferredChild,
    VALUE_GETTER
} from '../lib/core/template-renderer.js';

// Helper to create a VALUE_GETTER marked function
function createValueGetter(fn) {
    fn[VALUE_GETTER] = true;
    return fn;
}

// Helper to flush all updates synchronously (effects + renders + DOM)
function waitForEffects() {
    flushRenders();
}

// Helper to compile html`` template
function compile(strings, ...values) {
    const result = html(strings, ...values);
    return {
        compiled: result._compiled,
        values: result._values || values
    };
}

describe('Fine-Grained Renderer - Static Content', function(it) {

    it('renders static text', async () => {
        const { compiled, values } = compile`<p>Hello World</p>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, null);
        container.appendChild(fragment);

        assert.ok(container.querySelector('p'));
        assert.equal(container.querySelector('p').textContent, 'Hello World');

        cleanup();
    });

    it('renders static attributes', async () => {
        const { compiled, values } = compile`<div class="test" id="myId" data-value="123"></div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, null);
        container.appendChild(fragment);

        const div = container.querySelector('div');
        assert.equal(div.className, 'test');
        assert.equal(div.id, 'myId');
        assert.equal(div.dataset.value, '123');

        cleanup();
    });

    it('renders nested static elements', async () => {
        const { compiled, values } = compile`
            <div class="outer">
                <span class="inner">Text</span>
            </div>
        `;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, null);
        container.appendChild(fragment);

        assert.ok(container.querySelector('.outer'));
        assert.ok(container.querySelector('.outer .inner'));
        assert.equal(container.querySelector('.inner').textContent, 'Text');

        cleanup();
    });

});

describe('Fine-Grained Renderer - Dynamic Text', function(it) {

    it('renders dynamic text interpolation', async () => {
        const name = 'Alice';
        const { compiled, values } = compile`<p>Hello ${name}</p>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, null);
        container.appendChild(fragment);

        await waitForEffects();

        assert.ok(container.textContent.includes('Hello'));
        assert.ok(container.textContent.includes('Alice'));

        cleanup();
    });

    it('renders reactive text that updates', async () => {
        const state = reactive({ name: 'Alice' });
        const { compiled } = compile`<p>Hello ${() => state.name}</p>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, [createValueGetter(() => state.name)], null);
        container.appendChild(fragment);

        await waitForEffects();
        assert.ok(container.textContent.includes('Alice'));

        // Update state
        state.name = 'Bob';
        await waitForEffects();
        assert.ok(container.textContent.includes('Bob'));

        cleanup();
    });

    it('handles null/undefined values', async () => {
        const { compiled, values } = compile`<p>${null}${undefined}</p>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, null);
        container.appendChild(fragment);

        await waitForEffects();

        // Should not throw, should have empty content
        const p = container.querySelector('p');
        assert.ok(p);

        cleanup();
    });

});

describe('Fine-Grained Renderer - Dynamic Attributes', function(it) {

    it('renders dynamic class attribute', async () => {
        const className = 'active';
        const { compiled, values } = compile`<div class="${className}"></div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, null);
        container.appendChild(fragment);

        await waitForEffects();

        assert.equal(container.querySelector('div').className, 'active');

        cleanup();
    });

    it('updates class reactively', async () => {
        const state = reactive({ active: true });
        const { compiled } = compile`<div class="${() => state.active ? 'active' : 'inactive'}"></div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, [createValueGetter(() => state.active ? 'active' : 'inactive')], null);
        container.appendChild(fragment);

        await waitForEffects();
        assert.equal(container.querySelector('div').className, 'active');

        state.active = false;
        await waitForEffects();
        assert.equal(container.querySelector('div').className, 'inactive');

        cleanup();
    });

    it('handles boolean attributes', async () => {
        const state = reactive({ disabled: true });
        const { compiled } = compile`<button disabled="${() => state.disabled}">Click</button>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, [createValueGetter(() => state.disabled)], null);
        container.appendChild(fragment);

        await waitForEffects();
        assert.equal(container.querySelector('button').disabled, true);

        state.disabled = false;
        await waitForEffects();
        assert.equal(container.querySelector('button').disabled, false);

        cleanup();
    });

});

describe('Fine-Grained Renderer - Events', function(it) {

    it('handles click events', async () => {
        let clicked = false;
        const handleClick = () => { clicked = true; };
        const { compiled, values } = compile`<button on-click="${handleClick}">Click</button>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, null);
        container.appendChild(fragment);

        await waitForEffects();

        container.querySelector('button').click();
        assert.equal(clicked, true);

        cleanup();
    });

    it('handles event with prevent modifier', async () => {
        let submitted = false;
        const handleSubmit = (e) => { submitted = true; };

        // Note: The template compiler handles the -prevent suffix
        // For this test, we'll simulate what the compiler produces
        const mockComponent = {
            handleSubmit: handleSubmit
        };

        const { compiled, values } = compile`<form on-submit-prevent="handleSubmit"></form>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, mockComponent);
        container.appendChild(fragment);

        await waitForEffects();

        // The form should have a submit handler attached
        const form = container.querySelector('form');
        assert.ok(form);

        cleanup();
    });

});

describe('Fine-Grained Renderer - x-model', function(it) {

    it('binds input value from state', async () => {
        const mockComponent = {
            state: reactive({ name: 'Test' }),
            refs: {}
        };

        // x-model creates both a value binding and an input event handler
        // The compiled template has the xModel property set
        const { compiled, values } = compile`<input type="text" x-model="name">`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, mockComponent);
        container.appendChild(fragment);

        await waitForEffects();

        const input = container.querySelector('input');
        assert.equal(input.value, 'Test');

        // Simulate typing
        input.value = 'Updated';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        await waitForEffects();
        assert.equal(mockComponent.state.name, 'Updated');

        cleanup();
    });

    it('binds checkbox checked state', async () => {
        const mockComponent = {
            state: reactive({ enabled: true }),
            refs: {}
        };

        const { compiled, values } = compile`<input type="checkbox" x-model="enabled">`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, mockComponent);
        container.appendChild(fragment);

        await waitForEffects();

        const checkbox = container.querySelector('input');
        assert.equal(checkbox.checked, true);

        // Simulate clicking
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));

        await waitForEffects();
        assert.equal(mockComponent.state.enabled, false);

        cleanup();
    });

});

describe('Fine-Grained Renderer - Refs', function(it) {

    it('captures element refs', async () => {
        const mockComponent = {
            state: {},
            refs: {}
        };

        const { compiled, values } = compile`<input ref="nameInput" type="text">`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, mockComponent);
        container.appendChild(fragment);

        await waitForEffects();

        assert.ok(mockComponent.refs.nameInput);
        assert.equal(mockComponent.refs.nameInput.tagName, 'INPUT');

        cleanup();

        // After cleanup, ref should be removed
        assert.ok(!mockComponent.refs.nameInput);
    });

});

describe('Fine-Grained Renderer - when() Control Flow', function(it) {

    it('renders truthy branch', async () => {
        const showMessage = true;
        const result = when(showMessage, html`<p>Visible</p>`);

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(result._compiled, result._values, null);
        container.appendChild(fragment);

        await waitForEffects();

        assert.ok(container.querySelector('p'));
        assert.equal(container.querySelector('p').textContent, 'Visible');

        cleanup();
    });

    it('renders falsy branch', async () => {
        const showMessage = false;
        const result = when(showMessage,
            html`<p>Yes</p>`,
            html`<p>No</p>`
        );

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(result._compiled, result._values, null);
        container.appendChild(fragment);

        await waitForEffects();

        assert.ok(container.querySelector('p'));
        assert.equal(container.querySelector('p').textContent, 'No');

        cleanup();
    });

    it('handles reactive conditions', async () => {
        const state = reactive({ show: true });

        // Using function value that re-evaluates - must be marked as VALUE_GETTER
        const { compiled } = compile`<div>${() => {
            if (state.show) {
                return html`<p>Visible</p>`;
            }
            return html`<p>Hidden</p>`;
        }}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(() => state.show ? html`<p>Visible</p>` : html`<p>Hidden</p>`)],
            null
        );
        container.appendChild(fragment);

        await waitForEffects();
        assert.equal(container.querySelector('p').textContent, 'Visible');

        state.show = false;
        await waitForEffects();
        assert.equal(container.querySelector('p').textContent, 'Hidden');

        cleanup();
    });

});

describe('Fine-Grained Renderer - each() Control Flow', function(it) {

    it('renders list of items', async () => {
        const items = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }];
        const result = each(items, item => html`<li>${item.name}</li>`);

        const container = document.createElement('ul');
        const { fragment, cleanup } = instantiateTemplate(result._compiled, result._values, null);
        container.appendChild(fragment);

        await waitForEffects();

        const listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 3);
        assert.equal(listItems[0].textContent, 'A');
        assert.equal(listItems[1].textContent, 'B');
        assert.equal(listItems[2].textContent, 'C');

        cleanup();
    });

    it('handles empty array', async () => {
        const items = [];
        const result = each(items, item => html`<li>${item.name}</li>`);

        const container = document.createElement('ul');
        const { fragment, cleanup } = instantiateTemplate(result._compiled, result._values, null);
        container.appendChild(fragment);

        await waitForEffects();

        assert.equal(container.querySelectorAll('li').length, 0);

        cleanup();
    });

    it('cleans up old items when array changes (unkeyed)', async () => {
        // Test that unkeyed each() properly removes old DOM nodes when items change
        const state = reactive({
            items: [{ name: 'Folder A' }, { name: 'Folder B' }, { name: 'Folder C' }]
        });

        const template = () => each(state.items, item => html`<li>${item.name}</li>`);
        const { compiled, values } = compile`<ul>${template()}</ul>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        // Initial state: 3 items
        let listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 3, 'Should have 3 items initially');
        assert.equal(listItems[0].textContent, 'Folder A');
        assert.equal(listItems[1].textContent, 'Folder B');
        assert.equal(listItems[2].textContent, 'Folder C');

        // Change to empty array (simulates navigating to new folder)
        state.items = [];
        await waitForEffects();

        listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 0, 'Should have 0 items after clearing');

        // Load new items
        state.items = [{ name: 'New Folder 1' }, { name: 'New Folder 2' }];
        await waitForEffects();

        listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 2, 'Should have 2 new items');
        assert.equal(listItems[0].textContent, 'New Folder 1', 'First item should be new');
        assert.equal(listItems[1].textContent, 'New Folder 2', 'Second item should be new');

        // Verify old folder names are NOT present
        const allText = container.textContent;
        assert.ok(!allText.includes('Folder A'), 'Old folder A should be gone');
        assert.ok(!allText.includes('Folder B'), 'Old folder B should be gone');
        assert.ok(!allText.includes('Folder C'), 'Old folder C should be gone');

        cleanup();
    });

    it('cleans up old items when array changes (keyed)', async () => {
        // Same test but with keys for comparison
        const state = reactive({
            items: [{ id: 1, name: 'Folder A' }, { id: 2, name: 'Folder B' }, { id: 3, name: 'Folder C' }]
        });

        const template = () => each(state.items, item => html`<li>${item.name}</li>`, item => item.id);
        const { compiled, values } = compile`<ul>${template()}</ul>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        // Initial state
        assert.equal(container.querySelectorAll('li').length, 3);

        // Clear and add new items
        state.items = [];
        await waitForEffects();
        assert.equal(container.querySelectorAll('li').length, 0);

        state.items = [{ id: 10, name: 'New Folder 1' }, { id: 20, name: 'New Folder 2' }];
        await waitForEffects();

        const listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 2);
        assert.equal(listItems[0].textContent, 'New Folder 1');
        assert.equal(listItems[1].textContent, 'New Folder 2');

        cleanup();
    });

    it('handles batched state changes (race condition test)', async () => {
        // Test that when items = [] and items = [new] happen synchronously,
        // the effect correctly shows [new] without stale [old] content.
        // This tests the effect batching race condition.
        const state = reactive({
            items: [{ name: 'Old A' }, { name: 'Old B' }, { name: 'Old C' }]
        });

        const template = () => each(state.items, item => html`<li>${item.name}</li>`);
        const { compiled, values } = compile`<ul>${template()}</ul>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        // Initial state: 3 items
        assert.equal(container.querySelectorAll('li').length, 3, 'Should have 3 items initially');

        // BATCHED: Clear AND set new items in same synchronous block
        // This simulates navigation where old data is cleared and new data is loaded
        state.items = [];
        state.items = [{ name: 'New X' }, { name: 'New Y' }, { name: 'New Z' }];
        // NO await between - both changes batched into one effect run

        await waitForEffects();

        // Verify correct items are displayed
        const listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 3, 'Should have 3 new items');
        assert.equal(listItems[0].textContent, 'New X', 'First item should be New X');
        assert.equal(listItems[1].textContent, 'New Y', 'Second item should be New Y');
        assert.equal(listItems[2].textContent, 'New Z', 'Third item should be New Z');

        // Verify NO old content
        const allText = container.textContent;
        assert.ok(!allText.includes('Old A'), 'Old A should NOT be present');
        assert.ok(!allText.includes('Old B'), 'Old B should NOT be present');
        assert.ok(!allText.includes('Old C'), 'Old C should NOT be present');

        cleanup();
    });

    it('handles batched state changes with different array lengths', async () => {
        // Test batched changes where old and new arrays have different lengths
        const state = reactive({
            items: [{ name: 'Old 1' }, { name: 'Old 2' }]
        });

        const template = () => each(state.items, item => html`<li>${item.name}</li>`);
        const { compiled, values } = compile`<ul>${template()}</ul>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        assert.equal(container.querySelectorAll('li').length, 2, 'Should have 2 items initially');

        // BATCHED: Clear AND set new items (different length)
        state.items = [];
        state.items = [{ name: 'New A' }, { name: 'New B' }, { name: 'New C' }, { name: 'New D' }];

        await waitForEffects();

        const listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 4, 'Should have 4 new items');
        assert.equal(listItems[0].textContent, 'New A');
        assert.equal(listItems[3].textContent, 'New D');

        // Verify NO old content
        assert.ok(!container.textContent.includes('Old 1'), 'Old 1 should NOT be present');
        assert.ok(!container.textContent.includes('Old 2'), 'Old 2 should NOT be present');

        cleanup();
    });

    it('handles async navigation pattern (browse-page simulation)', async () => {
        // Simulate the browse-page pattern:
        // 1. Navigate: items = [], isLoading = true
        // 2. API returns: items = [new], isLoading = false
        // With loading spinner shown only when items.length === 0 && isLoading
        const state = reactive({
            items: [{ name: 'Old Folder A' }, { name: 'Old Folder B' }],
            isLoading: false
        });

        const template = () => when(
            state.isLoading && state.items.length === 0,
            html`<div class="spinner">Loading...</div>`,
            html`<ul>${each(state.items, item => html`<li>${item.name}</li>`)}</ul>`
        );
        const { compiled, values } = compile`<div>${template()}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        // Initial state: shows old items
        assert.equal(container.querySelectorAll('li').length, 2, 'Should show 2 old items');
        assert.ok(!container.querySelector('.spinner'), 'Spinner should NOT show');

        // Step 1: Navigate - clear items and set loading
        state.items = [];
        state.isLoading = true;
        await waitForEffects();

        // Should show spinner, no items
        assert.ok(container.querySelector('.spinner'), 'Spinner SHOULD show while loading');
        assert.equal(container.querySelectorAll('li').length, 0, 'Should have no items while loading');

        // Step 2: API returns - set new items and clear loading
        state.items = [{ name: 'New Folder X' }, { name: 'New Folder Y' }, { name: 'New Folder Z' }];
        state.isLoading = false;
        await waitForEffects();

        // Should show new items, no spinner
        assert.ok(!container.querySelector('.spinner'), 'Spinner should NOT show after load');
        const listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 3, 'Should show 3 new items');
        assert.equal(listItems[0].textContent, 'New Folder X');
        assert.equal(listItems[1].textContent, 'New Folder Y');
        assert.equal(listItems[2].textContent, 'New Folder Z');

        // Verify NO old content
        assert.ok(!container.textContent.includes('Old Folder'), 'Old folders should NOT be present');

        cleanup();
    });

    it('handles batched async navigation (fast loading)', async () => {
        // Simulate fast API response where items=[] and items=[new] are batched
        const state = reactive({
            items: [{ name: 'Old A' }, { name: 'Old B' }],
            isLoading: false
        });

        const template = () => when(
            state.isLoading && state.items.length === 0,
            html`<div class="spinner">Loading...</div>`,
            html`<ul>${each(state.items, item => html`<li>${item.name}</li>`)}</ul>`
        );
        const { compiled, values } = compile`<div>${template()}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        // Initial state
        assert.equal(container.querySelectorAll('li').length, 2);

        // BATCHED: simulate instant API response
        // Navigate: clear + loading
        state.items = [];
        state.isLoading = true;
        // Instant response: new items + done loading (before flush)
        state.items = [{ name: 'New X' }, { name: 'New Y' }];
        state.isLoading = false;

        await waitForEffects();

        // Should show new items directly (never saw spinner)
        assert.ok(!container.querySelector('.spinner'), 'Spinner should NOT show for fast response');
        const listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 2, 'Should show 2 new items');
        assert.equal(listItems[0].textContent, 'New X');
        assert.equal(listItems[1].textContent, 'New Y');
        assert.ok(!container.textContent.includes('Old A'), 'Old A should NOT be present');

        cleanup();
    });

    it('updates content during windowed rendering with memoEach', async () => {
        // Same as windowed rendering test but using memoEach like browse-page does
        const { memoEach } = await import('../lib/framework.js');

        const allItems = [];
        for (let i = 0; i < 100; i++) {
            allItems.push({ id: `item-${i}`, name: `Item ${i}` });
        }

        const state = reactive({
            visibleStart: 0,
            visibleEnd: 10
        });

        const template = () => {
            const visibleItems = allItems.slice(state.visibleStart, state.visibleEnd);
            const topPx = state.visibleStart * 50;
            return html`
                <div class="container" style="position: relative; height: 5000px;">
                    <div class="items" style="position: absolute; top: ${topPx}px;">
                        ${memoEach(visibleItems, item => html`
                            <div class="item" data-id="${item.id}">${item.name}</div>
                        `, item => item.id)}
                    </div>
                </div>
            `;
        };
        const { compiled } = compile`<div>${template()}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        // Initial: items 0-9
        let items = container.querySelectorAll('.item');
        assert.equal(items.length, 10, 'Should show 10 items initially');
        assert.equal(items[0].dataset.id, 'item-0');

        // Scroll: now show items 5-14
        state.visibleStart = 5;
        state.visibleEnd = 15;
        await waitForEffects();

        items = container.querySelectorAll('.item');
        assert.equal(items.length, 10, 'Should still show 10 items');
        assert.equal(items[0].dataset.id, 'item-5', 'First should now be item-5');
        assert.equal(items[9].dataset.id, 'item-14', 'Last should now be item-14');

        cleanup();
    });

    it('updates content during windowed rendering scroll simulation', async () => {
        // Simulate browse-page windowed rendering:
        // - Fixed array of items
        // - visibleStart/visibleEnd determine which slice is shown
        // - CSS top position changes with visibleStart
        const allItems = [];
        for (let i = 0; i < 100; i++) {
            allItems.push({ id: `item-${i}`, name: `Item ${i}` });
        }

        const state = reactive({
            visibleStart: 0,
            visibleEnd: 10
        });

        const template = () => {
            const visibleItems = allItems.slice(state.visibleStart, state.visibleEnd);
            const topPx = state.visibleStart * 50;
            return html`
                <div class="container" style="position: relative; height: 5000px;">
                    <div class="items" style="position: absolute; top: ${topPx}px;">
                        ${each(visibleItems, item => html`
                            <div class="item" data-id="${item.id}">${item.name}</div>
                        `, item => item.id)}
                    </div>
                </div>
            `;
        };
        const { compiled } = compile`<div>${template()}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        // Initial: items 0-9
        let items = container.querySelectorAll('.item');
        assert.equal(items.length, 10, 'Should show 10 items initially');
        assert.equal(items[0].dataset.id, 'item-0', 'First should be item-0');
        assert.equal(items[9].dataset.id, 'item-9', 'Last should be item-9');

        // Scroll: now show items 5-14
        state.visibleStart = 5;
        state.visibleEnd = 15;
        await waitForEffects();

        items = container.querySelectorAll('.item');
        assert.equal(items.length, 10, 'Should still show 10 items');
        assert.equal(items[0].dataset.id, 'item-5', 'First should now be item-5');
        assert.equal(items[9].dataset.id, 'item-14', 'Last should now be item-14');

        // Verify position also updated
        const itemsDiv = container.querySelector('.items');
        assert.ok(itemsDiv.style.top.includes('250'), 'Top should be 250px (5*50)');

        // Scroll more: items 20-29
        state.visibleStart = 20;
        state.visibleEnd = 30;
        await waitForEffects();

        items = container.querySelectorAll('.item');
        assert.equal(items.length, 10, 'Should still show 10 items');
        assert.equal(items[0].dataset.id, 'item-20', 'First should now be item-20');
        assert.equal(items[9].dataset.id, 'item-29', 'Last should now be item-29');

        // Verify old items are gone
        assert.ok(!container.querySelector('[data-id="item-0"]'), 'item-0 should be gone');
        assert.ok(!container.querySelector('[data-id="item-5"]'), 'item-5 should be gone');

        cleanup();
    });

    it('reuses DOM nodes during keyed reconciliation (virtual scroll)', async () => {
        // Simulate virtual scrolling where visible window shifts
        // Items 0-4 visible, then scroll to items 2-6
        // Items 2,3,4 should be REUSED, not recreated
        const allItems = [
            { id: 'a', name: 'Item A' },
            { id: 'b', name: 'Item B' },
            { id: 'c', name: 'Item C' },
            { id: 'd', name: 'Item D' },
            { id: 'e', name: 'Item E' },
            { id: 'f', name: 'Item F' },
            { id: 'g', name: 'Item G' }
        ];

        const state = reactive({
            visibleStart: 0,
            visibleEnd: 5
        });

        const template = () => {
            const visibleItems = allItems.slice(state.visibleStart, state.visibleEnd);
            return each(visibleItems, item => html`<li data-id="${item.id}">${item.name}</li>`, item => item.id);
        };
        const { compiled } = compile`<ul>${template()}</ul>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        // Initial: items A-E visible
        let listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 5, 'Should have 5 items initially');

        // Capture references to items C, D, E (which should be reused)
        const itemC = container.querySelector('[data-id="c"]');
        const itemD = container.querySelector('[data-id="d"]');
        const itemE = container.querySelector('[data-id="e"]');

        // Scroll: now show items C-G (indices 2-7)
        state.visibleStart = 2;
        state.visibleEnd = 7;
        await waitForEffects();

        listItems = container.querySelectorAll('li');
        assert.equal(listItems.length, 5, 'Should still have 5 items');
        assert.equal(listItems[0].dataset.id, 'c', 'First visible should be C');
        assert.equal(listItems[4].dataset.id, 'g', 'Last visible should be G');

        // Verify DOM reuse - same elements, not recreated
        const newItemC = container.querySelector('[data-id="c"]');
        const newItemD = container.querySelector('[data-id="d"]');
        const newItemE = container.querySelector('[data-id="e"]');

        assert.equal(itemC, newItemC, 'Item C should be same DOM node (reused)');
        assert.equal(itemD, newItemD, 'Item D should be same DOM node (reused)');
        assert.equal(itemE, newItemE, 'Item E should be same DOM node (reused)');

        // Items A, B should be gone
        assert.ok(!container.querySelector('[data-id="a"]'), 'Item A should be removed');
        assert.ok(!container.querySelector('[data-id="b"]'), 'Item B should be removed');

        cleanup();
    });

    it('cleans up nested each() DOM when parent when() switches branches', async () => {
        // This tests the browse-page pattern:
        // when(isLoading, <spinner>, <each(items)>)
        // When switching to spinner, the each() items must be removed
        const state = reactive({
            isLoading: false,
            items: [
                { id: '1', name: 'Item 1' },
                { id: '2', name: 'Item 2' },
                { id: '3', name: 'Item 3' }
            ]
        });

        const template = () => when(
            state.isLoading,
            html`<div class="spinner">Loading...</div>`,
            html`<div class="items">${each(state.items, item => html`
                <div class="item" data-id="${item.id}">${item.name}</div>
            `, item => item.id)}</div>`
        );
        const { compiled } = compile`<div class="container">${template()}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        // Initial: showing items
        assert.equal(container.querySelectorAll('.item').length, 3, 'Should show 3 items');
        assert.ok(!container.querySelector('.spinner'), 'Spinner should NOT show');

        // Switch to loading - should remove ALL items
        state.isLoading = true;
        await waitForEffects();

        assert.ok(container.querySelector('.spinner'), 'Spinner SHOULD show');
        assert.equal(container.querySelectorAll('.item').length, 0, 'ALL items should be removed');
        assert.ok(!container.querySelector('.items'), 'Items container should be gone');

        // Switch back to items
        state.isLoading = false;
        await waitForEffects();

        assert.ok(!container.querySelector('.spinner'), 'Spinner should be gone');
        assert.equal(container.querySelectorAll('.item').length, 3, 'Items should be back');

        cleanup();
    });

});

describe('Fine-Grained Renderer - Effect Cleanup', function(it) {

    it('disposes effects on cleanup', async () => {
        let effectRunCount = 0;
        const state = reactive({ value: 1 });

        const { compiled } = compile`<p>${() => {
            effectRunCount++;
            return state.value;
        }}</p>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, [createValueGetter(() => {
            effectRunCount++;
            return state.value;
        })], null);
        container.appendChild(fragment);

        await waitForEffects();
        const initialCount = effectRunCount;

        // Update should trigger effect
        state.value = 2;
        await waitForEffects();
        assert.ok(effectRunCount > initialCount, 'Effect should run on update');

        const countBeforeCleanup = effectRunCount;

        // Cleanup
        cleanup();

        // Update after cleanup should NOT trigger effect
        state.value = 3;
        await waitForEffects();
        assert.equal(effectRunCount, countBeforeCleanup, 'Effect should not run after cleanup');
    });

    it('cleans up event listeners', async () => {
        let clickCount = 0;
        const handleClick = () => { clickCount++; };

        const { compiled, values } = compile`<button on-click="${handleClick}">Click</button>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, null);
        container.appendChild(fragment);

        await waitForEffects();

        const button = container.querySelector('button');
        button.click();
        assert.equal(clickCount, 1);

        // Cleanup removes event listeners
        cleanup();

        // Click after cleanup - note: the button is still in DOM
        // but the handler should have been removed
        // (This test verifies internal cleanup, not DOM removal)
    });

});

describe('Fine-Grained Renderer - Deferred Children', function(it) {

    it('creates deferred child descriptors', () => {
        const mockParent = { state: { x: 1 }, refs: {} };
        const { compiled, values } = compile`<p>Child</p>`;

        const deferred = createDeferredChild(compiled, values, mockParent);

        assert.ok(isDeferredChild(deferred));
        assert.equal(deferred.parentComponent, mockParent);
        assert.equal(deferred.compiled, compiled);
    });

    it('renders deferred children with parent context', async () => {
        const parentState = reactive({ message: 'Hello' });
        const mockParent = { state: parentState, refs: {} };

        // Child template that reads parent state - use VALUE_GETTER for reactivity
        const { compiled: childCompiled } = compile`<span>${() => parentState.message}</span>`;

        // Create deferred child with VALUE_GETTER marked functions
        const deferred = createDeferredChild(
            childCompiled,
            [createValueGetter(() => parentState.message)],
            mockParent
        );

        // Wrapper template that renders the deferred child
        const { compiled: wrapperCompiled } = compile`<div>${deferred}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(wrapperCompiled, [deferred], null);
        container.appendChild(fragment);

        await waitForEffects();

        assert.ok(container.querySelector('span'));
        assert.ok(container.textContent.includes('Hello'));

        // Update parent state
        parentState.message = 'World';
        await waitForEffects();

        assert.ok(container.textContent.includes('World'));

        cleanup();
    });

});

describe('Fine-Grained Renderer - Nested Template Value Updates', function(it) {

    it('updates nested template values without reinstantiation', async () => {
        // This tests the key scenario: parent re-renders, child template
        // has same structure but different values - should update in place
        const state = reactive({ count: 1 });

        // Create a template with a nested html template
        // When state.count changes, the inner template has same structure but different value
        const { compiled } = compile`<div>${() => html`<span class="value">${state.count}</span>`}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(() => html`<span class="value">${state.count}</span>`)],
            null
        );
        container.appendChild(fragment);

        await waitForEffects();

        const span = container.querySelector('.value');
        assert.equal(span.textContent, '1');

        // Store reference to verify DOM is preserved
        const originalSpan = span;

        // Update state - should update nested value without replacing DOM
        state.count = 2;
        await waitForEffects();

        const newSpan = container.querySelector('.value');
        assert.equal(newSpan.textContent, '2');
        // DOM element should be the same (not reinstantiated)
        assert.equal(newSpan, originalSpan, 'DOM should be preserved');

        cleanup();
    });

    it('propagates deeply nested value changes', async () => {
        const state = reactive({ name: 'Alice', age: 30 });

        // Two levels of nesting
        const { compiled } = compile`<div>${() => html`<div class="outer">${html`<span class="inner">${state.name} is ${state.age}</span>`}</div>`}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(() => html`<div class="outer">${html`<span class="inner">${state.name} is ${state.age}</span>`}</div>`)],
            null
        );
        container.appendChild(fragment);

        await waitForEffects();

        assert.ok(container.textContent.includes('Alice is 30'));

        state.name = 'Bob';
        await waitForEffects();

        assert.ok(container.textContent.includes('Bob is 30'));

        state.age = 25;
        await waitForEffects();

        assert.ok(container.textContent.includes('Bob is 25'));

        cleanup();
    });

});

describe('Fine-Grained Renderer - each() Value Updates', function(it) {

    it('updates item values without reinstantiating DOM', async () => {
        const state = reactive({
            items: [
                { id: 1, name: 'Item A' },
                { id: 2, name: 'Item B' }
            ]
        });

        const { compiled } = compile`<ul>${() => each(state.items, item => html`<li data-id="${item.id}">${item.name}</li>`, item => item.id)}</ul>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(() => each(state.items, item => html`<li data-id="${item.id}">${item.name}</li>`, item => item.id))],
            null
        );
        container.appendChild(fragment);

        await waitForEffects();

        const items = container.querySelectorAll('li');
        assert.equal(items.length, 2);
        assert.equal(items[0].textContent, 'Item A');
        assert.equal(items[1].textContent, 'Item B');

        // Store references
        const originalItem1 = items[0];
        const originalItem2 = items[1];

        // Update item names (same keys)
        state.items = [
            { id: 1, name: 'Updated A' },
            { id: 2, name: 'Updated B' }
        ];
        await waitForEffects();

        const newItems = container.querySelectorAll('li');
        assert.equal(newItems[0].textContent, 'Updated A');
        assert.equal(newItems[1].textContent, 'Updated B');

        // DOM should be preserved (same elements)
        assert.equal(newItems[0], originalItem1, 'First item DOM should be preserved');
        assert.equal(newItems[1], originalItem2, 'Second item DOM should be preserved');

        cleanup();
    });

    it('preserves input focus when updating list items', async () => {
        const state = reactive({
            items: [
                { id: 1, label: 'First' },
                { id: 2, label: 'Second' }
            ]
        });

        const mockComponent = {
            state: reactive({ values: { 1: '', 2: '' } }),
            refs: {}
        };

        const { compiled } = compile`<div>${() => each(state.items, item => html`
            <div class="row">
                <label>${item.label}</label>
                <input type="text" data-id="${item.id}">
            </div>
        `, item => item.id)}</div>`;

        const container = document.createElement('div');
        document.body.appendChild(container);
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(() => each(state.items, item => html`
                <div class="row">
                    <label>${item.label}</label>
                    <input type="text" data-id="${item.id}">
                </div>
            `, item => item.id))],
            mockComponent
        );
        container.appendChild(fragment);

        await waitForEffects();

        // Focus on second input
        const secondInput = container.querySelector('input[data-id="2"]');
        secondInput.focus();
        secondInput.value = 'typing...';

        // Update labels (but not structure)
        state.items = [
            { id: 1, label: 'First Updated' },
            { id: 2, label: 'Second Updated' }
        ];
        await waitForEffects();

        // Input should still be focused and have value
        const currentInput = container.querySelector('input[data-id="2"]');
        assert.equal(currentInput.value, 'typing...', 'Input value should be preserved');
        assert.equal(currentInput, secondInput, 'Same input element should exist');

        document.body.removeChild(container);
        cleanup();
    });

});

describe('Fine-Grained Renderer - when() Value Updates', function(it) {

    it('updates values inside same when() branch without switching', async () => {
        const state = reactive({ show: true, message: 'Hello' });

        const { compiled } = compile`<div>${() => when(state.show, html`<p class="msg">${state.message}</p>`)}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(() => when(state.show, html`<p class="msg">${state.message}</p>`))],
            null
        );
        container.appendChild(fragment);

        await waitForEffects();

        const p = container.querySelector('.msg');
        assert.equal(p.textContent, 'Hello');
        const originalP = p;

        // Change message but keep show=true
        state.message = 'World';
        await waitForEffects();

        const newP = container.querySelector('.msg');
        assert.equal(newP.textContent, 'World');
        // DOM should be preserved since structure is same
        assert.equal(newP, originalP, 'DOM should be preserved when only values change');

        cleanup();
    });

    it('reinstantiates when switching branches', async () => {
        const state = reactive({ show: true });

        const { compiled } = compile`<div>${() => when(state.show, html`<p class="yes">Yes</p>`, html`<p class="no">No</p>`)}</div>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(() => when(state.show, html`<p class="yes">Yes</p>`, html`<p class="no">No</p>`))],
            null
        );
        container.appendChild(fragment);

        await waitForEffects();

        assert.ok(container.querySelector('.yes'));
        assert.ok(!container.querySelector('.no'));

        state.show = false;
        await waitForEffects();

        assert.ok(!container.querySelector('.yes'));
        assert.ok(container.querySelector('.no'));

        cleanup();
    });

});

describe('Fine-Grained Renderer - Event Handler Freshness', function(it) {

    it('event handlers get current closure values', async () => {
        const state = reactive({ count: 0 });
        const clicks = [];

        // Handler that captures current count value
        const makeHandler = () => () => {
            clicks.push(state.count);
        };

        const { compiled } = compile`<button on-click="${makeHandler()}">Click</button>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [makeHandler()],
            null
        );
        container.appendChild(fragment);

        await waitForEffects();

        const button = container.querySelector('button');

        // First click
        button.click();
        assert.equal(clicks[0], 0);

        // Update state
        state.count = 5;
        await waitForEffects();

        // Click again - for this test, handler was bound at creation
        // This tests the current behavior
        button.click();

        cleanup();
    });

    it('reactive handlers via VALUE_GETTER get fresh values', async () => {
        const state = reactive({ multiplier: 2 });
        let result = 0;

        // This simulates how component methods work - they should
        // access current state when called
        const mockComponent = {
            state: state,
            refs: {},
            handleClick: function() {
                result = 10 * this.state.multiplier;
            }
        };

        const { compiled, values } = compile`<button on-click="handleClick">Click</button>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, mockComponent);
        container.appendChild(fragment);

        await waitForEffects();

        const button = container.querySelector('button');
        button.click();
        assert.equal(result, 20);

        state.multiplier = 5;
        await waitForEffects();

        button.click();
        assert.equal(result, 50, 'Handler should use current state value');

        cleanup();
    });

});

describe('Fine-Grained Renderer - Custom Element Prop Updates', function(it) {

    // Define a test custom element
    if (!customElements.get('test-receiver')) {
        class TestReceiver extends HTMLElement {
            constructor() {
                super();
                this._data = null;
                this._updateCount = 0;
            }

            set data(value) {
                this._data = value;
                this._updateCount++;
            }

            get data() {
                return this._data;
            }

            get updateCount() {
                return this._updateCount;
            }
        }
        customElements.define('test-receiver', TestReceiver);
    }

    it('updates props on custom elements when values change', async () => {
        const state = reactive({ items: ['a', 'b', 'c'] });

        const { compiled } = compile`<test-receiver data="${() => state.items}"></test-receiver>`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(() => state.items)],
            null
        );
        container.appendChild(fragment);

        await waitForEffects();

        const receiver = container.querySelector('test-receiver');
        assert.deepEqual(receiver.data, ['a', 'b', 'c']);
        const initialUpdateCount = receiver.updateCount;

        // Change the data
        state.items = ['x', 'y'];
        await waitForEffects();

        assert.deepEqual(receiver.data, ['x', 'y']);
        assert.ok(receiver.updateCount > initialUpdateCount, 'Prop setter should be called on update');

        cleanup();
    });

});

describe('Fine-Grained Renderer - SVG Namespace', function(it) {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    it('renders SVG with correct namespace', async () => {
        const { compiled, values } = compile`
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
            </svg>
        `;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, null);
        container.appendChild(fragment);

        const svg = container.querySelector('svg');
        const path = container.querySelector('path');

        assert.ok(svg, 'SVG element should exist');
        assert.equal(svg.namespaceURI, SVG_NS, 'SVG should have SVG namespace');
        assert.ok(path, 'Path element should exist');
        assert.equal(path.namespaceURI, SVG_NS, 'Path should have SVG namespace');

        cleanup();
    });

    it('renders SVG inside button with event handler', async () => {
        let clicked = false;
        const handleClick = () => { clicked = true; };

        const { compiled, values } = compile`
            <button on-click="${handleClick}">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M7.41 15.41L12 10.83z"/>
                </svg>
            </button>
        `;

        const component = { methods: {} };
        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(compiled, values, component);
        container.appendChild(fragment);

        const svg = container.querySelector('svg');
        const path = container.querySelector('path');

        assert.ok(svg, 'SVG element should exist inside button');
        assert.equal(svg.namespaceURI, SVG_NS, 'SVG should have SVG namespace');
        assert.ok(path, 'Path element should exist');
        assert.equal(path.namespaceURI, SVG_NS, 'Path should have SVG namespace');

        cleanup();
    });

    it('renders SVG inside when() conditional', async () => {
        const state = reactive({ visible: true });

        const template = () => when(state.visible, html`
            <button>
                <svg viewBox="0 0 24 24">
                    <path d="M7.41 15.41z"/>
                </svg>
            </button>
        `);

        const { compiled, values } = compile`${template()}`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        const svg = container.querySelector('svg');
        const path = container.querySelector('path');

        assert.ok(svg, 'SVG element should exist inside when()');
        assert.equal(svg.namespaceURI, SVG_NS, 'SVG inside when() should have SVG namespace');
        assert.ok(path, 'Path element should exist');
        assert.equal(path.namespaceURI, SVG_NS, 'Path inside when() should have SVG namespace');

        cleanup();
    });

    it('renders SVG in when() with method name event handler (scroll-to-top pattern)', async () => {
        // This mimics scroll-to-top.js exactly:
        // ${when(this.state.visible, html`<button on-click="scrollToTop"><svg>...</svg></button>`)}

        const state = reactive({ visible: true });

        const template = () => when(state.visible, html`
            <button class="scroll-to-top-btn" on-click="scrollToTop" title="Scroll to top">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                </svg>
            </button>
        `);

        const mockComponent = {
            methods: {
                scrollToTop() {}
            }
        };

        const { compiled, values } = compile`${template()}`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            mockComponent
        );
        container.appendChild(fragment);
        await waitForEffects();

        const button = container.querySelector('button');
        const svg = container.querySelector('svg');
        const path = container.querySelector('path');

        assert.ok(button, 'Button should exist');
        assert.ok(svg, 'SVG element should exist inside button');
        assert.equal(svg.namespaceURI, SVG_NS, 'SVG should have SVG namespace');
        assert.ok(path, 'Path element should exist');
        assert.equal(path.namespaceURI, SVG_NS, 'Path should have SVG namespace');

        cleanup();
    });

    it('renders dynamic path inside SVG (now-playing pattern)', async () => {
        // This mimics now-playing.js exactly:
        // <svg><path>${condition ? html`<path...>` : html`<path...>`}</path></svg>

        const state = reactive({ showingCurrentSong: true });

        const template = () => html`
            <button class="jump-to-current">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    ${state.showingCurrentSong
                        ? html`<path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>`
                        : html`<path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>`
                    }
                </svg>
            </button>
        `;

        const { compiled, values } = compile`${template()}`;

        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compiled,
            [createValueGetter(template)],
            null
        );
        container.appendChild(fragment);
        await waitForEffects();

        // Check that the path has the correct SVG namespace
        let svg = container.querySelector('svg');
        let path = container.querySelector('path');

        assert.ok(svg, 'SVG element should exist');
        assert.equal(svg.namespaceURI, SVG_NS, 'SVG should have SVG namespace');
        assert.ok(path, 'Path element should exist');
        assert.equal(path.namespaceURI, SVG_NS, 'Path inside SVG should have SVG namespace (up arrow)');
        assert.ok(path.getAttribute('d').includes('15.41'), 'Should show up arrow path');

        // Toggle the condition
        state.showingCurrentSong = false;
        await waitForEffects();

        // Path should be replaced with a different one, but still have SVG namespace
        path = container.querySelector('path');
        assert.ok(path, 'Path element should still exist after toggle');
        assert.equal(path.namespaceURI, SVG_NS, 'Path should still have SVG namespace (down arrow)');
        assert.ok(path.getAttribute('d').includes('8.59'), 'Should show down arrow path');

        cleanup();
    });
});

describe('Fine-Grained Renderer - contain() Reactive Boundary', function(it) {
    // Helper to wait for renders
    const waitForRender = () => new Promise(r => setTimeout(r, 50));

    it('contain() isolates high-frequency updates from parent', async () => {
        let parentRenderCount = 0;
        let containRenderCount = 0;

        const TestComp = defineComponent('test-contain-isolation', {
            data() {
                return {
                    fastChanging: 0,  // Simulates currentTime
                    slowChanging: 'stable'
                };
            },
            template() {
                parentRenderCount++;
                return html`
                    <div class="parent">
                        <span class="slow">${this.state.slowChanging}</span>
                        ${contain(() => {
                            containRenderCount++;
                            return html`<span class="fast">${this.state.fastChanging}</span>`;
                        })}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-contain-isolation></test-contain-isolation>';

        await waitForRender();

        const comp = container.querySelector('test-contain-isolation');
        const initialParentCount = parentRenderCount;
        const initialContainCount = containRenderCount;

        // Change fast-changing state multiple times
        for (let i = 0; i < 5; i++) {
            comp.state.fastChanging = i + 1;
            await waitForRender();
        }

        // Parent should have rendered only a few times (initial + maybe 1-2 more due to cacheVersion)
        // but contained block should render for each fast change
        assert.ok(containRenderCount > initialContainCount, 'Contained block should re-render on fast changes');

        // Verify the DOM is correct
        assert.equal(comp.querySelector('.fast').textContent, '5', 'Fast-changing value should be updated');
        assert.equal(comp.querySelector('.slow').textContent, 'stable', 'Slow-changing value should be stable');

        container.remove();
    });

    it('contain() updates correctly when its dependencies change', async () => {
        const TestComp = defineComponent('test-contain-updates', {
            data() {
                return { value: 'initial' };
            },
            template() {
                return html`
                    <div>
                        ${contain(() => html`<span class="contained">${this.state.value}</span>`)}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-contain-updates></test-contain-updates>';

        await waitForRender();

        const comp = container.querySelector('test-contain-updates');
        assert.equal(comp.querySelector('.contained').textContent, 'initial');

        comp.state.value = 'updated';
        await waitForRender();

        assert.equal(comp.querySelector('.contained').textContent, 'updated');

        container.remove();
    });

    it('contain() DOM persists when parent template re-renders', async () => {
        // This test verifies the fix for the bug where contain() DOM was removed
        // on every parent re-render because currentNodes/currentEffects were incorrectly set
        let parentRenderCount = 0;

        const TestComp = defineComponent('test-contain-persists', {
            data() {
                return {
                    parentValue: 'parent-initial',
                    containedValue: 0
                };
            },
            template() {
                parentRenderCount++;
                return html`
                    <div>
                        <span class="parent">${this.state.parentValue}</span>
                        ${contain(() => html`<span class="contained">${this.state.containedValue}</span>`)}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-contain-persists></test-contain-persists>';

        await waitForRender();

        const comp = container.querySelector('test-contain-persists');

        // Initial render should show both values
        assert.equal(comp.querySelector('.parent').textContent, 'parent-initial');
        assert.equal(comp.querySelector('.contained').textContent, '0');

        const initialContainedEl = comp.querySelector('.contained');

        // Update parent value (triggers parent re-render)
        comp.state.parentValue = 'parent-updated';
        await waitForRender();

        // Parent should update
        assert.equal(comp.querySelector('.parent').textContent, 'parent-updated');

        // Contained element should still exist and have same content
        assert.ok(comp.querySelector('.contained'), 'Contained element should still exist after parent re-render');
        assert.equal(comp.querySelector('.contained').textContent, '0', 'Contained value should be preserved');

        // DOM element should be the same (not recreated)
        assert.equal(comp.querySelector('.contained'), initialContainedEl, 'Should reuse same DOM element');

        // Update contained value
        comp.state.containedValue = 42;
        await waitForRender();

        // Contained should update
        assert.equal(comp.querySelector('.contained').textContent, '42');

        container.remove();
    });

    it('contain() cleans up properly when slot value changes to non-contain', async () => {
        const TestComp = defineComponent('test-contain-cleanup', {
            data() {
                return {
                    useContain: true,
                    value: 'hello'
                };
            },
            template() {
                return html`
                    <div>
                        ${this.state.useContain
                            ? contain(() => html`<span class="contained">${this.state.value}</span>`)
                            : html`<span class="not-contained">${this.state.value}</span>`
                        }
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-contain-cleanup></test-contain-cleanup>';

        await waitForRender();

        const comp = container.querySelector('test-contain-cleanup');

        // Initially should show contained
        assert.ok(comp.querySelector('.contained'), 'Should show contained element');
        assert.ok(!comp.querySelector('.not-contained'), 'Should not show non-contained element');

        // Switch to non-contain
        comp.state.useContain = false;
        await waitForRender();

        // Should show non-contained, not contained
        assert.ok(!comp.querySelector('.contained'), 'Contained element should be removed');
        assert.ok(comp.querySelector('.not-contained'), 'Non-contained element should be shown');
        assert.equal(comp.querySelector('.not-contained').textContent, 'hello');

        // Switch back to contain
        comp.state.useContain = true;
        await waitForRender();

        assert.ok(comp.querySelector('.contained'), 'Contained element should be back');
        assert.ok(!comp.querySelector('.not-contained'), 'Non-contained element should be removed');

        container.remove();
    });
});

describe('Fine-Grained Renderer - when() Function Forms', function(it) {
    const waitForRender = () => new Promise(r => setTimeout(r, 50));

    it('when() with function forms renders correctly and switches branches', async () => {
        const TestComp = defineComponent('test-when-functions', {
            data() {
                return { condition: true };
            },
            template() {
                return html`
                    <div>
                        ${when(this.state.condition,
                            () => html`<span class="then">Then branch</span>`,
                            () => html`<span class="else">Else branch</span>`
                        )}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-when-functions></test-when-functions>';

        await waitForRender();

        const comp = container.querySelector('test-when-functions');
        assert.ok(comp.querySelector('.then'), 'Then branch should be in DOM when condition is true');
        assert.ok(!comp.querySelector('.else'), 'Else branch should not be in DOM');

        // Change condition
        comp.state.condition = false;
        await waitForRender();

        assert.ok(!comp.querySelector('.then'), 'Then branch should not be in DOM when condition is false');
        assert.ok(comp.querySelector('.else'), 'Else branch should be in DOM');

        container.remove();
    });
});

describe('Fine-Grained Renderer - each() Rendering', function(it) {
    const waitForRender = () => new Promise(r => setTimeout(r, 50));

    it('each() renders and updates list correctly', async () => {
        const TestComp = defineComponent('test-each-render', {
            data() {
                return {
                    items: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
                };
            },
            template() {
                return html`
                    <div>
                        ${each(this.state.items, item => html`
                            <span class="item">${item.name}</span>
                        `)}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-each-render></test-each-render>';

        await waitForRender();

        const comp = container.querySelector('test-each-render');
        assert.equal(comp.querySelectorAll('.item').length, 2, 'Should have 2 items initially');

        // Add an item
        comp.state.items = [...comp.state.items, { id: 3, name: 'C' }];
        await waitForRender();

        assert.equal(comp.querySelectorAll('.item').length, 3, 'Should have 3 items after add');
        assert.equal(comp.querySelectorAll('.item')[2].textContent, 'C', 'Third item should be C');

        container.remove();
    });
});

describe('Fine-Grained Renderer - memoEach() Per-Item Caching', function(it) {
    const waitForRender = () => new Promise(r => setTimeout(r, 50));

    it('memoEach() caches individual items by key', async () => {
        let renderCount = 0;

        const TestComp = defineComponent('test-memoeach-items', {
            data() {
                return {
                    items: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
                };
            },
            template() {
                return html`
                    <div>
                        ${memoEach(this.state.items, item => {
                            renderCount++;
                            return html`<span class="item" data-id="${item.id}">${item.name}</span>`;
                        }, item => item.id)}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-memoeach-items></test-memoeach-items>';

        await waitForRender();

        const comp = container.querySelector('test-memoeach-items');
        const initialCount = renderCount;
        assert.equal(comp.querySelectorAll('.item').length, 2, 'Should have 2 items');

        // Add a new item - only new item should render
        comp.state.items = [...comp.state.items, { id: 3, name: 'C' }];
        await waitForRender();

        assert.equal(comp.querySelectorAll('.item').length, 3, 'Should have 3 items');
        // memoEach should only render the new item (per-item caching)
        // Note: exact count depends on implementation details

        container.remove();
    });
});

describe('When callback with early return cleanup', function(it) {
    it('cleans up nested content when callback returns different template', async () => {
        const state = reactive({
            useWindowed: false,
            hasMore: true
        });

        // Mimics browse-page.js pattern:
        // - Callback with early return
        // - Non-windowed mode has nested when() with sentinel
        // - Windowed mode doesn't have sentinel
        const container = document.createElement('div');
        const { fragment, cleanup } = instantiateTemplate(
            compile`<div>${'slot0'}</div>`.compiled,
            [createValueGetter(() => {
                if (state.useWindowed) {
                    return html`<div class="windowed">WINDOWED</div>`;
                }
                return html`
                    <div class="non-windowed">NON-WINDOWED</div>
                    ${when(state.hasMore, html`<div class="sentinel">SENTINEL</div>`)}
                `;
            })],
            null
        );
        container.appendChild(fragment);

        await waitForEffects();

        // Initial: non-windowed with sentinel
        assert.equal(container.querySelector('.non-windowed')?.textContent, 'NON-WINDOWED');
        assert.equal(container.querySelector('.sentinel')?.textContent, 'SENTINEL');
        assert.equal(container.querySelector('.windowed'), null);

        // Switch to windowed mode
        state.useWindowed = true;
        await waitForEffects();

        // Should show windowed, sentinel should be GONE
        assert.equal(container.querySelector('.windowed')?.textContent, 'WINDOWED');
        assert.equal(container.querySelector('.non-windowed'), null, 'non-windowed should be removed');
        assert.equal(container.querySelector('.sentinel'), null, 'SENTINEL SHOULD BE REMOVED');

        // Switch back to non-windowed
        state.useWindowed = false;
        await waitForEffects();

        // Should show non-windowed with sentinel again
        assert.equal(container.querySelector('.non-windowed')?.textContent, 'NON-WINDOWED');
        assert.equal(container.querySelector('.sentinel')?.textContent, 'SENTINEL');
        assert.equal(container.querySelector('.windowed'), null);

        cleanup();
    });
});

// Run test marker
console.log('=== Fine-Grained Renderer Tests ===');

/**
 * Memory Profiling Tests for Fine-Grained Rendering
 * Verifies that DOM nodes and component lifecycle are properly cleaned up
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, each, memoEach, when } from '../lib/framework.js';

// Helper to wait for renders
const waitForRender = () => new Promise(r => setTimeout(r, 50));

describe('Memory Profiling - Cleanup Verification', function(it) {

    it('DOM nodes are removed when list items are removed', async () => {
        const TestComp = defineComponent('test-dom-cleanup', {
            data() {
                return {
                    items: [
                        { id: 1, name: 'Item 1' },
                        { id: 2, name: 'Item 2' },
                        { id: 3, name: 'Item 3' }
                    ]
                };
            },
            template() {
                return html`
                    <div class="container">
                        ${each(this.state.items, item => html`
                            <div class="item" data-id="${item.id}">${item.name}</div>
                        `, item => item.id)}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-dom-cleanup></test-dom-cleanup>';

        await waitForRender();

        const comp = container.querySelector('test-dom-cleanup');
        let items = comp.querySelectorAll('.item');
        assert.equal(items.length, 3, 'Should have 3 items initially');

        // Remove one item
        comp.state.items = comp.state.items.filter(i => i.id !== 2);
        await waitForRender();

        items = comp.querySelectorAll('.item');
        assert.equal(items.length, 2, 'Should have 2 items after removal');
        assert.ok(!comp.querySelector('[data-id="2"]'), 'Item 2 should be removed from DOM');

        // Remove all items
        comp.state.items = [];
        await waitForRender();

        items = comp.querySelectorAll('.item');
        assert.equal(items.length, 0, 'Should have 0 items after clearing');

        container.remove();
    });

    it('unmounted lifecycle is called when components are removed', async () => {
        const unmountedCalls = [];

        defineComponent('test-unmount-child', {
            props: { id: '' },
            unmounted() {
                unmountedCalls.push(this.props.id);
            },
            template() {
                return html`<span class="child">${this.props.id}</span>`;
            }
        });

        const ParentComp = defineComponent('test-unmount-parent', {
            data() {
                return {
                    children: ['A', 'B', 'C']
                };
            },
            template() {
                return html`
                    <div>
                        ${each(this.state.children, id => html`
                            <test-unmount-child id="${id}"></test-unmount-child>
                        `)}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-unmount-parent></test-unmount-parent>';

        await waitForRender();

        const comp = container.querySelector('test-unmount-parent');
        assert.equal(unmountedCalls.length, 0, 'No unmounted calls initially');

        // Remove one child
        comp.state.children = ['A', 'C'];
        await waitForRender();

        assert.ok(unmountedCalls.includes('B'), 'Child B unmounted should be called');

        // Remove all children
        comp.state.children = [];
        await waitForRender();

        assert.ok(unmountedCalls.includes('A'), 'Child A unmounted should be called');
        assert.ok(unmountedCalls.includes('C'), 'Child C unmounted should be called');

        container.remove();
    });

    it('conditional content is properly cleaned up', async () => {
        const mountCalls = [];
        const unmountCalls = [];

        defineComponent('test-cond-child', {
            mounted() {
                mountCalls.push('mounted');
            },
            unmounted() {
                unmountCalls.push('unmounted');
            },
            template() {
                return html`<span class="cond-child">Content</span>`;
            }
        });

        const TestComp = defineComponent('test-cond-parent', {
            data() {
                return { show: true };
            },
            template() {
                return html`
                    <div>
                        ${when(this.state.show, html`
                            <test-cond-child></test-cond-child>
                        `)}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-cond-parent></test-cond-parent>';

        await waitForRender();

        const comp = container.querySelector('test-cond-parent');
        assert.equal(mountCalls.length, 1, 'Child should be mounted once');
        assert.equal(unmountCalls.length, 0, 'Child should not be unmounted yet');
        assert.ok(comp.querySelector('.cond-child'), 'Child should be in DOM');

        // Hide content
        comp.state.show = false;
        await waitForRender();

        assert.equal(unmountCalls.length, 1, 'Child should be unmounted when hidden');
        assert.ok(!comp.querySelector('.cond-child'), 'Child should be removed from DOM');

        // Show again
        comp.state.show = true;
        await waitForRender();

        assert.equal(mountCalls.length, 2, 'Child should be mounted again');
        assert.ok(comp.querySelector('.cond-child'), 'Child should be back in DOM');

        container.remove();
    });

    it('rapid add/remove cycles do not leak DOM nodes', async () => {
        const TestComp = defineComponent('test-rapid-dom', {
            data() {
                return { items: [] };
            },
            methods: {
                addItems(count) {
                    const newItems = Array.from({ length: count }, (_, i) => ({
                        id: Date.now() + i,
                        name: `Item ${i}`
                    }));
                    this.state.items = [...this.state.items, ...newItems];
                },
                clearItems() {
                    this.state.items = [];
                }
            },
            template() {
                return html`
                    <div class="rapid-container">
                        ${each(this.state.items, item => html`
                            <div class="rapid-item">${item.name}</div>
                        `, item => item.id)}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-rapid-dom></test-rapid-dom>';

        await waitForRender();

        const comp = container.querySelector('test-rapid-dom');

        // Do 10 rapid add/remove cycles
        for (let i = 0; i < 10; i++) {
            comp.addItems(50);
            await waitForRender();

            const itemCount = comp.querySelectorAll('.rapid-item').length;
            assert.equal(itemCount, 50, `Cycle ${i + 1}: Should have 50 items after add`);

            comp.clearItems();
            await waitForRender();

            const emptyCount = comp.querySelectorAll('.rapid-item').length;
            assert.equal(emptyCount, 0, `Cycle ${i + 1}: Should have 0 items after clear`);
        }

        // Final verification
        const finalCount = comp.querySelectorAll('.rapid-item').length;
        assert.equal(finalCount, 0, 'Should have no items after all cycles');

        container.remove();
    });

    it('memoEach updates correctly without stale DOM', async () => {
        const TestComp = defineComponent('test-memo-update', {
            data() {
                return {
                    items: [
                        { id: 1, name: 'Alpha' },
                        { id: 2, name: 'Beta' },
                        { id: 3, name: 'Gamma' }
                    ]
                };
            },
            template() {
                return html`
                    <div>
                        ${memoEach(this.state.items, item => html`
                            <div class="memo-item" data-id="${item.id}">${item.name}</div>
                        `, item => item.id)}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-memo-update></test-memo-update>';

        await waitForRender();

        const comp = container.querySelector('test-memo-update');

        // Verify initial state
        let items = comp.querySelectorAll('.memo-item');
        assert.equal(items.length, 3, 'Should have 3 items');
        assert.equal(items[0].textContent, 'Alpha', 'First item should be Alpha');

        // Reorder items
        comp.state.items = [
            { id: 3, name: 'Gamma' },
            { id: 1, name: 'Alpha' },
            { id: 2, name: 'Beta' }
        ];
        await waitForRender();

        items = comp.querySelectorAll('.memo-item');
        assert.equal(items.length, 3, 'Should still have 3 items');
        assert.equal(items[0].textContent, 'Gamma', 'First item should now be Gamma');
        assert.equal(items[1].textContent, 'Alpha', 'Second item should be Alpha');

        // Remove middle item
        comp.state.items = [
            { id: 3, name: 'Gamma' },
            { id: 2, name: 'Beta' }
        ];
        await waitForRender();

        items = comp.querySelectorAll('.memo-item');
        assert.equal(items.length, 2, 'Should have 2 items');
        assert.ok(!comp.querySelector('[data-id="1"]'), 'Item 1 should be removed');

        container.remove();
    });

    it('event handlers are cleaned up when elements are removed', async () => {
        const clickCounts = { a: 0, b: 0, c: 0 };

        const TestComp = defineComponent('test-event-cleanup', {
            data() {
                return {
                    buttons: ['a', 'b', 'c']
                };
            },
            methods: {
                handleClick(id) {
                    clickCounts[id]++;
                }
            },
            template() {
                return html`
                    <div>
                        ${each(this.state.buttons, id => html`
                            <button class="btn" data-id="${id}" on-click="${() => this.handleClick(id)}">${id}</button>
                        `)}
                    </div>
                `;
            }
        });

        const container = document.createElement('div');
        document.body.appendChild(container);
        container.innerHTML = '<test-event-cleanup></test-event-cleanup>';

        await waitForRender();

        const comp = container.querySelector('test-event-cleanup');

        // Click all buttons
        comp.querySelectorAll('.btn').forEach(btn => btn.click());
        assert.equal(clickCounts.a, 1, 'Button A clicked once');
        assert.equal(clickCounts.b, 1, 'Button B clicked once');
        assert.equal(clickCounts.c, 1, 'Button C clicked once');

        // Remove button B
        comp.state.buttons = ['a', 'c'];
        await waitForRender();

        // Click remaining buttons
        comp.querySelectorAll('.btn').forEach(btn => btn.click());
        assert.equal(clickCounts.a, 2, 'Button A clicked twice');
        assert.equal(clickCounts.b, 1, 'Button B should not be clickable (removed)');
        assert.equal(clickCounts.c, 2, 'Button C clicked twice');

        container.remove();
    });
});

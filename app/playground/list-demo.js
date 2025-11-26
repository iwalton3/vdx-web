/**
 * List Demo - Demonstrates list rendering and manipulation
 */
import { defineComponent } from '../core/component.js';
import { html, each, when } from '../core/template.js';

export default defineComponent('list-demo', {
    data() {
        return {
            items: [
                { id: 1, text: 'Learn framework', done: false },
                { id: 2, text: 'Build playground', done: true },
                { id: 3, text: 'Write tests', done: true }
            ],
            nextId: 4,
            newItemText: ''
        };
    },

    methods: {
        addItem() {
            const text = this.state.newItemText.trim();
            if (!text) return;

            this.state.items = [
                ...this.state.items,
                { id: this.state.nextId++, text, done: false }
            ];
            this.state.newItemText = '';
        },

        removeItem(id) {
            this.state.items = this.state.items.filter(item => item.id !== id);
        },

        toggleItem(id) {
            this.state.items = this.state.items.map(item =>
                item.id === id ? { ...item, done: !item.done } : item
            );
        },

        clearCompleted() {
            this.state.items = this.state.items.filter(item => !item.done);
        }
    },

    template() {
        const completedCount = this.state.items.filter(i => i.done).length;
        const activeCount = this.state.items.length - completedCount;

        return html`
            <h2>List Demo</h2>
            <p>Interactive todo list with x-model two-way binding and each() helper</p>

            <div style="margin-bottom: 15px;">
                <input
                    type="text"
                    placeholder="New item..."
                    x-model="newItemText"
                    on-keypress="${(e) => e.key === 'Enter' && this.addItem()}"
                    style="flex: 1; margin-right: 10px;">
                <button on-click="addItem">Add</button>
            </div>

            ${when(this.state.items.length > 0,
                html`
                    <ul class="item-list">
                        ${each(this.state.items, item => html`
                            <li>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input
                                        type="checkbox"
                                        checked="${item.done ? true : undefined}"
                                        on-change="${() => this.toggleItem(item.id)}">
                                    <span style="flex: 1; text-decoration: ${item.done ? 'line-through' : 'none'}; opacity: ${item.done ? '0.6' : '1'};">
                                        ${item.text}
                                    </span>
                                    <button
                                        class="danger"
                                        on-click="${() => this.removeItem(item.id)}"
                                        style="padding: 4px 12px; font-size: 12px;">
                                        Delete
                                    </button>
                                </div>
                            </li>
                        `)}
                    </ul>

                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color, #ddd);">
                        <div style="font-size: 0.9em; color: var(--text-secondary, #666); margin-bottom: 10px;">
                            ${activeCount} active, ${completedCount} completed
                        </div>
                        ${when(completedCount > 0,
                            html`<button class="secondary" on-click="clearCompleted">Clear Completed</button>`,
                            html``
                        )}
                    </div>
                `,
                html`<p style="color: var(--text-secondary, #666); font-style: italic;">No items yet. Add one above!</p>`
            )}
        `;
    },

    styles: `
        :host {
            display: block;
        }
    `
});

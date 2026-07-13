import { defineComponent, Component, html, each, when } from 'vdx/lib/framework.js';

// Two-way binding with x-model, list rendering with each(), conditional UI with
// when(). Handlers are on-* attributes - never inline onclick or addEventListener.
class TodoList extends Component {
    constructor(props) {
        super(props);
        this.state = { draft: '', items: [{ id: 1, text: 'Vendor the library' }] };
    }

    add() {
        const text = this.state.draft.trim();
        if (!text) return;
        this.state.items.push({ id: Date.now(), text });
        this.state.draft = '';
    }

    removeItem(id) {
        this.state.items = this.state.items.filter((i) => i.id !== id);
    }

    template() {
        return html`
            <form class="add" on-submit-prevent="add">
                <input placeholder="Add a task…" x-model="draft">
                <button type="submit">Add</button>
            </form>
            <ul class="list">
                ${each(this.state.items, (item) => html`
                    <li>
                        <span>${item.text}</span>
                        <button class="x" on-click="${() => this.removeItem(item.id)}" aria-label="Remove">×</button>
                    </li>
                `)}
            </ul>
            ${when(this.state.items.length === 0, html`<p class="empty">Nothing left to do.</p>`)}
        `;
    }

    static styles = /*css*/`
        :host { display: block; padding: 22px; font-family: system-ui, sans-serif; max-width: 340px; margin: 0 auto; }
        .add { display: flex; gap: 8px; margin-bottom: 14px; }
        .add input { flex: 1; padding: 9px 11px; border: 1px solid var(--input-border, #ced4da); border-radius: 8px; background: var(--input-bg, #fff); color: var(--input-text, #333); }
        .add button { padding: 9px 16px; border: 0; border-radius: 8px; background: var(--primary-color, #007bff); color: #fff; cursor: pointer; }
        .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; border: 1px solid var(--border-color, #eee); border-radius: 8px; background: var(--card-bg, #fff); }
        .x { border: 0; background: transparent; color: var(--text-muted, #999); font-size: 18px; cursor: pointer; line-height: 1; }
        .x:hover { color: var(--error-color, #dc3545); }
        .empty { color: var(--text-muted, #6c757d); text-align: center; font-size: 14px; }
    `;
}

defineComponent('todo-list', TodoList);

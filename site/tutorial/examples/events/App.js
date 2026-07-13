import { defineComponent, Component, html, each } from 'vdx/lib/framework.js';

// Events use on-* attributes. A handler can be a method name ("addTodo") or an
// inline arrow. Every handler receives (event, value) - `value` is the resolved
// input value. Modifiers chain onto the name: on-submit-prevent calls
// event.preventDefault() for you.
class QuickTodo extends Component {
    constructor(props) {
        super(props);
        this.state = { draft: '', todos: [] };
    }

    // (event, value) - value is the input's current text
    onType(e, value) {
        this.state.draft = value;
    }

    addTodo() {
        const text = this.state.draft.trim();
        if (!text) return;
        this.state.todos.push({ id: Date.now(), text });
        this.state.draft = '';
    }

    removeItem(id) {
        this.state.todos = this.state.todos.filter((t) => t.id !== id);
    }

    template() {
        return html`
            <form class="todo" on-submit-prevent="addTodo">
                <div class="row">
                    <input
                        type="text"
                        placeholder="What needs doing?"
                        value="${this.state.draft}"
                        on-input="${(e, value) => this.onType(e, value)}">
                    <button type="submit">Add</button>
                </div>
                <ul>
                    ${each(this.state.todos, (todo) => html`
                        <li>
                            <span>${todo.text}</span>
                            <button type="button" on-click="${() => this.removeItem(todo.id)}">done</button>
                        </li>
                    `)}
                </ul>
                <p class="hint">Press Enter or click Add. The form never reloads the page - on-submit-prevent handles it.</p>
            </form>
        `;
    }

    static styles = /*css*/`
        .todo { font-family: system-ui, sans-serif; max-width: 380px; }
        .row { display: flex; gap: 8px; }
        input { flex: 1; padding: 9px 12px; border: 1px solid var(--input-border, #ccc); border-radius: 8px; background: var(--input-bg, #fff); color: var(--input-text, #000); }
        button { padding: 9px 16px; border: none; border-radius: 8px; cursor: pointer; background: var(--primary-color, #007bff); color: #fff; }
        ul { list-style: none; padding: 0; margin: 16px 0 0; }
        li { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #8883; }
        li span { flex: 1; }
        li button { background: transparent; color: var(--primary-color, #007bff); border: 1px solid currentColor; font-size: 12px; padding: 4px 10px; }
        .hint { font-size: 12px; color: #8898a8; }
    `;
}

defineComponent('quick-todo', QuickTodo);

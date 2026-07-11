import { defineComponent, Component, html, when, each } from 'vdx/lib/framework.js';

// Use when() for conditionals and each() for lists instead of ternaries and
// manual .map(). each()'s third argument is a key function - it keeps DOM state
// (like focus or animations) attached to the right item across reorders.
class TaskBoard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            tasks: [
                { id: 1, text: 'Read the tutorial', done: true },
                { id: 2, text: 'Build a component', done: false },
                { id: 3, text: 'Ship it', done: false }
            ],
            filter: 'all'
        };
    }

    get visible() {
        const { tasks, filter } = this.state;
        if (filter === 'active') return tasks.filter((t) => !t.done);
        if (filter === 'done') return tasks.filter((t) => t.done);
        return tasks;
    }

    toggle(id) {
        const t = this.state.tasks.find((t) => t.id === id);
        if (t) t.done = !t.done;
    }

    setFilter(f) { this.state.filter = f; }

    template() {
        const filters = ['all', 'active', 'done'];
        return html`
            <div class="board">
                <div class="filters">
                    ${each(filters, (f) => html`
                        <button class="${this.state.filter === f ? 'on' : ''}"
                            on-click="${() => this.setFilter(f)}">${f}</button>
                    `)}
                </div>

                ${when(this.visible.length,
                    html`
                        <ul>
                            ${each(this.visible, (task) => html`
                                <li class="${task.done ? 'done' : ''}" on-click="${() => this.toggle(task.id)}">
                                    <span class="box">${task.done ? '✓' : ''}</span>
                                    ${task.text}
                                </li>
                            `, (task) => task.id)}
                        </ul>
                    `,
                    html`<p class="empty">Nothing here — try another filter.</p>`
                )}
            </div>
        `;
    }

    static styles = /*css*/`
        .board { font-family: system-ui, sans-serif; max-width: 360px; }
        .filters { display: flex; gap: 6px; margin-bottom: 14px; }
        .filters button { text-transform: capitalize; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--border-color, #ccc); background: transparent; color: var(--text-secondary, #57606a); cursor: pointer; }
        .filters button.on { background: var(--primary-color, #007bff); color: #fff; border-color: transparent; }
        ul { list-style: none; padding: 0; margin: 0; }
        li { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; cursor: pointer; }
        li:hover { background: #8881; }
        li.done { color: #8898a8; text-decoration: line-through; }
        .box { width: 20px; height: 20px; border: 2px solid var(--primary-color, #007bff); border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; color: var(--primary-color, #007bff); }
        .empty { color: #8898a8; padding: 12px; }
    `;
}

defineComponent('task-board', TaskBoard);

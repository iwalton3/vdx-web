import { defineComponent, Component, html, each } from 'vdx/lib/framework.js';

// Sets and Maps in reactive state are auto-wrapped: mutating them (.add/.delete/
// .set) re-renders, and reading them (.has/.size/.get) subscribes — no need to
// reassign a whole new collection the way you would with a plain object.
class TagPicker extends Component {
    constructor(props) {
        super(props);
        this.state = { selected: new Set(['vanilla']) };
    }

    toggle(tag) {
        const s = this.state.selected;
        s.has(tag) ? s.delete(tag) : s.add(tag);   // mutating the Set re-renders
    }

    template() {
        const tags = ['vanilla', 'reactive', 'no-build', 'vendored', 'tiny'];
        return html`
            <div class="chips">
                ${each(tags, (t) => html`
                    <button class="chip ${this.state.selected.has(t) ? 'on' : ''}"
                        on-click="${() => this.toggle(t)}">${t}</button>
                `)}
            </div>
            <p class="count">${this.state.selected.size} selected —
                <strong>${[...this.state.selected].join(', ') || 'none'}</strong></p>
        `;
    }

    static styles = /*css*/`
        :host { display: block; padding: 26px; font-family: system-ui, sans-serif; }
        .chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .chip {
            font: inherit; font-size: 13px; cursor: pointer;
            padding: 7px 14px; border-radius: 999px;
            border: 1px solid var(--input-border, #ced4da);
            background: var(--card-bg, #fff); color: var(--text-color, #333);
        }
        .chip.on { border-color: var(--primary-color, #007bff); background: var(--primary-color, #007bff); color: #fff; }
        .count { margin-top: 16px; font-size: 14px; color: var(--text-secondary, #666); }
    `;
}

defineComponent('tag-picker', TagPicker);

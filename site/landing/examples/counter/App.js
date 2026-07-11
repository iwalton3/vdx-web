import { defineComponent, Component, html } from 'vdx/lib/framework.js';

// A component is a class. `state` is a reactive object: assign to it and the
// template re-renders the parts that changed - no virtual DOM, no setState.
class ClickCounter extends Component {
    constructor(props) {
        super(props);
        this.state = { count: 0 };
    }

    template() {
        return html`
            <div class="counter">
                <button class="step" on-click="${() => this.state.count--}">−</button>
                <output class="value">${this.state.count}</output>
                <button class="step" on-click="${() => this.state.count++}">+</button>
            </div>
            <p class="note">Edit the code, hit <kbd>Run</kbd>. No build step ran.</p>
        `;
    }

    static styles = /*css*/`
        :host { display: grid; place-content: center; gap: 14px; padding: 28px; font-family: system-ui, sans-serif; }
        .counter { display: flex; align-items: center; gap: 16px; }
        .value { font-size: 44px; font-weight: 800; min-width: 2ch; text-align: center; font-variant-numeric: tabular-nums; }
        .step {
            width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--input-border, #ced4da);
            background: var(--card-bg, #fff); color: var(--text-color, #333);
            font-size: 22px; cursor: pointer; transition: transform .06s ease;
        }
        .step:hover { border-color: var(--primary-color, #007bff); color: var(--primary-color, #007bff); }
        .step:active { transform: scale(.94); }
        .note { margin: 0; font-size: 13px; color: var(--text-muted, #6c757d); text-align: center; }
        kbd { font-family: ui-monospace, monospace; font-size: 12px; padding: 1px 5px; border: 1px solid var(--border-color, #ddd); border-radius: 4px; }
    `;
}

defineComponent('click-counter', ClickCounter);

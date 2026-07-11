import { defineComponent, Component, html, awaitThen } from 'vdx/lib/framework.js';

// awaitThen() renders a placeholder while a promise is pending, then swaps in
// the resolved view. Great for data fetching without manual loading flags.
class AsyncProfile extends Component {
    constructor(props) {
        super(props);
        this.state = { profile: this.load() };
    }

    // Pretend this is a fetch() call.
    load() {
        return new Promise((resolve) => {
            setTimeout(() => resolve({ name: 'Ada Lovelace', role: 'Engineer' }), 900);
        });
    }

    reload() {
        this.state.profile = this.load();   // reassigning re-triggers awaitThen
    }

    template() {
        return html`
            <div class="demo">
                <button on-click="reload">Reload</button>
                ${awaitThen(this.state.profile,
                    (data) => html`
                        <div class="card">
                            <strong>${data.name}</strong>
                            <span>${data.role}</span>
                        </div>
                    `,
                    html`<div class="loading">Loading profile…</div>`
                )}
            </div>
        `;
    }

    static styles = /*css*/`
        .demo { font-family: system-ui, sans-serif; display: grid; gap: 12px; max-width: 320px; }
        button { justify-self: start; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; background: var(--primary-color, #007bff); color: #fff; }
        .card { display: grid; gap: 4px; padding: 16px; border-radius: 10px; background: #8881; }
        .card strong { font-size: 1.1rem; }
        .card span { color: var(--text-secondary, #57606a); }
        .loading { padding: 16px; color: #8898a8; }
    `;
}
defineComponent('async-profile', AsyncProfile);

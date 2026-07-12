import { defineComponent, Component, html } from 'vdx/lib/framework.js';

// A child whose template() will throw when its data is bad. renderError()
// catches the throw and renders a fallback instead of crashing the page.
// Recovery is driven by an event: props can be null mid-error, so the child
// never fixes itself - it asks its parent to.
class ProfileCard extends Component {
    static props = { user: null };

    template() {
        return html`
            <div class="card">
                <strong>${this.props.user.name}</strong>
                <span>${this.props.user.role}</span>
            </div>
        `;
    }

    renderError(error) {
        return html`
            <div class="fallback">
                <p>Couldn't render the profile: <code>${error.message}</code></p>
                <button on-click="requestRecovery">Recover</button>
            </div>
        `;
    }

    requestRecovery() {
        this.dispatchEvent(new CustomEvent('recover', { bubbles: true }));
    }
}
defineComponent('profile-card', ProfileCard);

// The parent owns the data. "Break it" hands the child a null user, so the
// child's template throws. The parent also shows off refs: this.refs.name is
// the real <input> node, focused directly after a recovery.
class ProfileEditor extends Component {
    constructor(props) {
        super(props);
        this.state = { user: { name: 'Ada Lovelace', role: 'Engineer' } };
    }

    breakIt() {
        this.state.user = null;      // profile-card's template() now throws
    }

    recover() {
        this.state.user = { name: 'Ada Lovelace', role: 'Engineer' };
        this.refs.name.focus();      // refs: a real DOM node, no querySelector
    }

    rename(e, value) {
        if (this.state.user) this.state.user.name = value;
    }

    template() {
        return html`
            <div class="demo">
                <label>
                    Name
                    <input ref="name" value="${this.state.user?.name ?? ''}" on-input="rename">
                </label>
                <button class="danger" on-click="breakIt">Break it</button>
                <profile-card user="${this.state.user}" on-recover="recover"></profile-card>
            </div>
        `;
    }

    static styles = /*css*/`
        .demo { font-family: system-ui, sans-serif; display: grid; gap: 12px; max-width: 340px; }
        label { display: grid; gap: 4px; font-size: 13px; color: var(--text-secondary, #57606a); }
        input { padding: 8px 10px; border: 1px solid var(--input-border, #ced4da); border-radius: 8px; font: inherit; }
        .danger { justify-self: start; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; background: #b8442c; color: #fff; }
        .card { display: grid; gap: 4px; padding: 16px; border-radius: 10px; background: #8881; }
        .card strong { font-size: 1.1rem; }
        .card span { color: var(--text-secondary, #57606a); }
        .fallback { padding: 14px 16px; border-radius: 10px; background: #b8442c18; border: 1px solid #b8442c55; display: grid; gap: 10px; }
        .fallback p { margin: 0; font-size: 13.5px; }
        .fallback button { justify-self: start; padding: 7px 14px; border: none; border-radius: 8px; cursor: pointer; background: var(--primary-color, #007bff); color: #fff; }
    `;
}
defineComponent('profile-editor', ProfileEditor);

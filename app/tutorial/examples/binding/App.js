import { defineComponent, Component, html } from 'vdx/lib/framework.js';

// x-model is two-way binding. It reads the value into state AND writes state
// back to the control. Number inputs bind as numbers, checkboxes as booleans -
// automatically. Watch the live state object update as you edit the fields.
class SignupForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            name: 'Ada',
            age: 30,
            plan: 'pro',
            newsletter: true,
            bio: ''
        };
    }

    template() {
        return html`
            <div class="wrap">
                <form class="form">
                    <label>Name
                        <input type="text" x-model="name">
                    </label>
                    <label>Age
                        <input type="number" x-model="age">
                    </label>
                    <label>Plan
                        <select x-model="plan">
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="team">Team</option>
                        </select>
                    </label>
                    <label class="check">
                        <input type="checkbox" x-model="newsletter"> Send me the newsletter
                    </label>
                    <label>Bio
                        <textarea rows="2" x-model="bio" placeholder="A short bio..."></textarea>
                    </label>
                </form>
                <pre class="state">${JSON.stringify(this.state, null, 2)}</pre>
            </div>
        `;
    }

    static styles = /*css*/`
        .wrap { display: grid; grid-template-columns: 1fr; gap: 16px; font-family: system-ui, sans-serif; }
        .form { display: flex; flex-direction: column; gap: 12px; }
        label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 600; color: var(--text-secondary, #57606a); }
        label.check { flex-direction: row; align-items: center; gap: 8px; font-weight: 400; }
        input, select, textarea { font: inherit; font-weight: 400; padding: 8px 10px; border: 1px solid var(--input-border, #ccc); border-radius: 7px; background: var(--input-bg, #fff); color: var(--input-text, #000); }
        label.check input { width: auto; }
        .state { margin: 0; padding: 14px; border-radius: 8px; background: #1e1e1e; color: #9cdcfe; font-size: 12.5px; overflow: auto; }
    `;
}

defineComponent('signup-form', SignupForm);

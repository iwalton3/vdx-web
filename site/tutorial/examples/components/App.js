import { defineComponent, Component, html } from 'vdx/lib/framework.js';
import 'vdx/ui/all.js';   // register every cl-* component

// The cl-* components are just VDX components. They take props as attributes,
// bind with x-model, and fire on-* events — exactly like the ones you've built.
class FeedbackForm extends Component {
    constructor(props) {
        super(props);
        this.state = { name: '', topic: 'components', score: 0, sent: false };
    }

    submit() { this.state.sent = true; }

    template() {
        const topics = [
            { label: 'Components', value: 'components' },
            { label: 'Routing', value: 'routing' },
            { label: 'Stores', value: 'stores' }
        ];
        return html`
            <div class="form">
                <cl-input-text label="Your name" placeholder="Ada Lovelace" x-model="name"></cl-input-text>
                <cl-dropdown label="Favourite topic" options="${topics}" x-model="topic"></cl-dropdown>
                <div class="rate"><span>How's the tutorial?</span> <cl-rating x-model="score"></cl-rating></div>
                <cl-button label="Send feedback" severity="primary" on-click="submit"></cl-button>
            </div>

            <cl-dialog visible="${this.state.sent}" header="Thanks!" modal="true"
                on-change="${(e, v) => this.state.sent = v}">
                <p>Thanks${this.state.name ? ', ' + this.state.name : ''} —
                    ${this.state.score}★ on <strong>${this.state.topic}</strong>.</p>
            </cl-dialog>
        `;
    }

    static styles = /*css*/`
        :host { display: block; padding: 26px; font-family: system-ui, sans-serif; }
        .form { display: flex; flex-direction: column; gap: 18px; max-width: 380px; }
        .rate { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--text-secondary, #555); }
    `;
}

defineComponent('feedback-form', FeedbackForm);

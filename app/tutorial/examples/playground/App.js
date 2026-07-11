import { defineComponent, Component, html } from 'vdx/lib/framework.js';

// Welcome to the VDX playground! Edit this file (or index.html) and the preview
// updates automatically. Your changes are saved in this browser.
//
// The whole component library is available here too — try dropping a
// <cl-button label="Hi"></cl-button> into the template.
class HelloVdx extends Component {
    constructor(props) {
        super(props);
        this.state = { name: 'world', clicks: 0 };
    }

    template() {
        return html`
            <div class="box">
                <h1>Hello, ${this.state.name}! 👋</h1>
                <input x-model="name" placeholder="your name">
                <button on-click="${() => this.state.clicks++}">
                    Clicked ${this.state.clicks} ${this.state.clicks === 1 ? 'time' : 'times'}
                </button>
                <p class="hint">This whole preview is one VDX component. Change the code, or start from scratch.</p>
            </div>
        `;
    }

    static styles = /*css*/`
        .box { font-family: system-ui, sans-serif; max-width: 420px; display: grid; gap: 12px; }
        h1 { margin: 0; font-size: 1.6rem; }
        input { font: inherit; padding: 9px 12px; border: 1px solid var(--input-border, #ccc); border-radius: 8px; background: var(--input-bg, #fff); color: var(--input-text, #000); }
        button { justify-self: start; font: inherit; padding: 9px 18px; border: none; border-radius: 8px; cursor: pointer; background: var(--primary-color, #007bff); color: #fff; }
        .hint { color: #8898a8; font-size: 13px; margin: 4px 0 0; }
    `;
}

defineComponent('hello-vdx', HelloVdx);

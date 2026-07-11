/**
 * Vertical-slice tutorial page - proves the interactive-example harness
 * (cl-code-editor + vdx-highlight + tut-live-example iframe runner) end to end
 * with a single live example. Full tutorial content is layered on top of this
 * harness once the interaction is signed off.
 */
import { defineComponent, html, Component } from '../lib/framework.js';
import './live-example.js';

const COUNTER_MOUNT = '<my-counter start="5"></my-counter>';

export class TutSlice extends Component {
    template() {
        return html`
            <article class="tut-doc">
                <header class="tut-head">
                    <p class="tut-eyebrow">VDX Interactive Tutorial · Preview</p>
                    <h1>Your First Component</h1>
                    <p class="tut-lead">
                        VDX components are plain ES classes. State is reactive: assign to
                        <code>this.state</code> and the template re-renders - no build step, no
                        virtual DOM, zero dependencies.
                    </p>
                </header>

                <p>
                    The example below is <strong>live and editable</strong>. Change the code on the
                    left - tweak the styles, wire up a new button, rename the tag - and the preview on
                    the right re-runs automatically. Each run gets its own sandboxed document, so you
                    can experiment freely.
                </p>

                <tut-live-example
                    title="A reactive counter"
                    src="/tutorial/examples/counter.js"
                    mount="${COUNTER_MOUNT}">
                </tut-live-example>

                <p class="tut-note">
                    Notice the highlighter understands the <code>html\`\`</code> template and the
                    <code>/*css*/\`\`</code> style block - including the <code>on-click</code> event
                    bindings and <code>\${...}</code> interpolations, which no off-the-shelf
                    highlighter handles out of the box.
                </p>
            </article>
        `;
    }

    static styles = /*css*/`
        :host { display: block; }
        .tut-doc {
            max-width: 960px;
            margin: 0 auto;
            padding: 32px 20px 80px;
            color: var(--text-color, #24292e);
            line-height: 1.65;
        }
        .tut-eyebrow {
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--primary-color, #007bff);
            margin: 0 0 8px;
        }
        .tut-head h1 { font-size: 2rem; margin: 0 0 12px; }
        .tut-lead { font-size: 1.15rem; color: var(--text-secondary, #57606a); }
        .tut-note { font-size: 0.95rem; color: var(--text-secondary, #57606a); }
        code {
            background: var(--code-bg, rgba(175,184,193,0.2));
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.88em;
        }
    `
}

export default defineComponent('tut-slice', TutSlice);

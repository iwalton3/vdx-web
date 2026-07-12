import { defineComponent, Component, html, raw } from 'vdx/lib/framework.js';

// Everything you interpolate is escaped for the context it lands in — you never
// opt IN to safety. To render trusted HTML you opt OUT, explicitly, with raw().
class SecurityDemo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            name: '<img src=x onerror="alert(1)">',
            url: "javascript:alert('xss')",
            trusted: '<em>Weekly</em> report — <strong>up 12%</strong>'
        };
    }

    template() {
        return html`
            <section>
                <h4>1 · Text content is escaped</h4>
                <input x-model="name" spellcheck="false">
                <p>Renders as: <span class="out">${this.state.name}</span></p>
                <small>Typed markup shows up as characters, never as a live element.</small>
            </section>

            <section>
                <h4>2 · URLs are scheme-checked</h4>
                <input x-model="url" spellcheck="false">
                <p>Link: <a href="${this.state.url}">click me</a></p>
                <small><code>javascript:</code>, <code>vbscript:</code> and scriptable <code>data:</code> URLs collapse to an empty href.</small>
            </section>

            <section>
                <h4>3 · raw() opts out — only for content you trust</h4>
                <input x-model="trusted" spellcheck="false">
                <p>Interpolated: <span class="out">${this.state.trusted}</span></p>
                <p>Via raw():   <span class="out">${raw(this.state.trusted)}</span></p>
                <small>Same string — <code>raw()</code> renders it as markup. Never pass user input here.</small>
            </section>
        `;
    }

    static styles = /*css*/`
        :host { display: block; padding: 20px 22px; font-family: system-ui, sans-serif; max-width: 460px; margin: 0 auto; }
        section { padding: 12px 0; border-bottom: 1px solid var(--border-color, #eee); }
        section:last-child { border-bottom: 0; }
        h4 { margin: 0 0 8px; font-size: 14px; }
        input { width: 100%; padding: 7px 9px; border: 1px solid var(--input-border, #ced4da); border-radius: 7px; font-family: ui-monospace, monospace; font-size: 12px; box-sizing: border-box; }
        p { margin: 8px 0 4px; font-size: 13.5px; }
        .out { color: var(--text-color, #333); }
        a { color: var(--primary-color, #007bff); }
        small { color: var(--text-muted, #6c757d); font-size: 12px; }
        code { font-family: ui-monospace, monospace; font-size: 11px; background: var(--code-bg, rgba(175,184,193,.2)); padding: 1px 4px; border-radius: 3px; }
    `;
}

defineComponent('security-demo', SecurityDemo);

import { defineComponent, Component, html } from 'vdx/lib/framework.js';

// Defense in depth: interpolations are escaped for their context automatically.
// Text is HTML-escaped; href/src URLs are scheme-checked. A javascript: URL is
// neutralised to an empty string - you never opt IN to safety, you opt OUT
// (with raw(), and only for content you trust).
class SafeLink extends Component {
    constructor(props) {
        super(props);
        this.state = { url: "javascript:alert('xss')" };
    }

    template() {
        const safe = this.state.url.trim();
        return html`
            <label class="field">
                <span>Paste any URL — even a hostile one</span>
                <input x-model="url" spellcheck="false">
            </label>

            <div class="row">
                <a href="${safe}" class="link">Rendered link →</a>
            </div>

            <p class="explain">
                Bound into <code>href</code>, the framework ran its URL scheme check.
                <code>javascript:</code>, <code>data:</code> and <code>vbscript:</code>
                collapse to an empty string, so the link does nothing. No config,
                no sanitiser call — this is the default.
            </p>
        `;
    }

    static styles = /*css*/`
        :host { display: block; padding: 24px; font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; }
        .field { display: grid; gap: 6px; margin-bottom: 16px; }
        .field span { font-size: 13px; color: var(--text-secondary, #666); }
        .field input { padding: 10px 12px; border: 1px solid var(--input-border, #ced4da); border-radius: 8px; background: var(--input-bg, #fff); color: var(--input-text, #333); font-family: ui-monospace, monospace; font-size: 13px; }
        .row { margin-bottom: 16px; }
        .link { color: var(--primary-color, #007bff); font-weight: 600; text-decoration: none; }
        .link:hover { text-decoration: underline; }
        .explain { margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary, #666); }
        code { font-family: ui-monospace, monospace; font-size: 12px; background: var(--code-bg, rgba(175,184,193,.2)); padding: 1px 5px; border-radius: 4px; }
    `;
}

defineComponent('safe-link', SafeLink);

import { defineComponent, Component, html } from 'vdx/lib/framework.js';

// Defense in depth: every interpolation is escaped for the context it lands in.
// Text content is HTML-escaped, so markup typed by a user renders as literal
// characters. URLs in href/src are scheme-checked, so javascript: collapses to
// an empty string. You never opt IN to safety - you opt OUT, with raw(), and
// only for content you trust.
class SafeByDefault extends Component {
    constructor(props) {
        super(props);
        this.state = {
            name: '<img src=x onerror="alert(1)">',
            url: "javascript:alert('xss')"
        };
    }

    template() {
        return html`
            <label class="field">
                <span>A display name — try some markup</span>
                <input x-model="name" spellcheck="false">
            </label>
            <p class="out">Rendered as text: <strong>${this.state.name}</strong></p>

            <label class="field">
                <span>A link URL — try a hostile one</span>
                <input x-model="url" spellcheck="false">
            </label>
            <p class="out">Rendered as a link: <a href="${this.state.url.trim()}">click me</a></p>

            <p class="explain">
                The <code>&lt;img onerror&gt;</code> shows up as characters, not an element —
                content is HTML-escaped. The <code>javascript:</code> URL became empty, so the
                link does nothing. No sanitiser call, no config. This is the default.
            </p>
        `;
    }

    static styles = /*css*/`
        :host { display: block; padding: 22px 24px; font-family: system-ui, sans-serif; max-width: 440px; margin: 0 auto; }
        .field { display: grid; gap: 6px; margin-bottom: 8px; }
        .field span { font-size: 13px; color: var(--text-secondary, #666); }
        .field input { padding: 9px 11px; border: 1px solid var(--input-border, #ced4da); border-radius: 8px; background: var(--input-bg, #fff); color: var(--input-text, #333); font-family: ui-monospace, monospace; font-size: 12.5px; }
        .out { margin: 0 0 18px; font-size: 13.5px; color: var(--text-secondary, #666); word-break: break-word; }
        .out strong { color: var(--text-color, #333); font-weight: 600; }
        .out a { color: var(--primary-color, #007bff); font-weight: 600; }
        .explain { margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-secondary, #666); }
        code { font-family: ui-monospace, monospace; font-size: 12px; background: var(--code-bg, rgba(175,184,193,.2)); padding: 1px 5px; border-radius: 4px; }
    `;
}

defineComponent('safe-by-default', SafeByDefault);

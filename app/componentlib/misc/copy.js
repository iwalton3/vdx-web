/**
 * Copy - Copy-to-clipboard control. Renders as a button, an icon, or an inline
 * value + icon. Shows a transient "copied" state and emits a 'copy' event.
 */
import { defineComponent, html, when, Component } from '../../lib/framework.js';

/**
 * @fires copy - detail: { value } - the copied text
 */
export class ClCopy extends Component {
    static props = {
        value: '',
        label: 'Copy',
        copiedLabel: 'Copied!',
        variant: 'button',    // 'button' | 'icon' | 'inline'
        disabled: false
    }

    constructor(props) {
        super(props);

        this.state = { copied: false };
    }

    unmounted() {
        if (this._timer) clearTimeout(this._timer);
    }

    async copy() {
        if (this.props.disabled) return;
        const text = this.props.value != null ? String(this.props.value) : '';
        const ok = await this._write(text);
        if (ok) {
            this.state.copied = true;
            this.dispatchEvent(new CustomEvent('copy', {
                bubbles: true, composed: true, detail: { value: text }
            }));
            if (this._timer) clearTimeout(this._timer);
            this._timer = setTimeout(() => { this.state.copied = false; }, 1500);
        }
    }

    async _write(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) { /* fall through to legacy path */ }

        // Legacy fallback for non-secure contexts.
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (e) {
            return false;
        }
    }

    template() {
        const copyIcon = html`
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>`;
        const checkIcon = html`
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>`;
        const icon = () => this.state.copied ? checkIcon : copyIcon;

        if (this.props.variant === 'icon') {
            return html`
                <button
                    class="cl-copy icon-only ${this.state.copied ? 'copied' : ''}"
                    type="button"
                    title="${this.state.copied ? this.props.copiedLabel : this.props.label}"
                    aria-label="${this.props.label}"
                    disabled="${this.props.disabled}"
                    on-click="copy">
                    ${icon()}
                </button>
            `;
        }

        if (this.props.variant === 'inline') {
            return html`
                <span class="cl-copy inline ${this.state.copied ? 'copied' : ''}">
                    <code class="copy-value">${this.props.value}</code>
                    <button class="copy-inline-btn" type="button"
                            title="${this.state.copied ? this.props.copiedLabel : this.props.label}"
                            aria-label="${this.props.label}"
                            disabled="${this.props.disabled}"
                            on-click="copy">
                        ${icon()}
                    </button>
                </span>
            `;
        }

        // Default button variant
        return html`
            <button
                class="cl-copy button ${this.state.copied ? 'copied' : ''}"
                type="button"
                disabled="${this.props.disabled}"
                on-click="copy">
                ${icon()}
                <span class="copy-label">${this.state.copied ? this.props.copiedLabel : this.props.label}</span>
            </button>
        `;
    }

    static styles = /*css*/`
        :host { display: inline-block; }

        .cl-copy {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: color 0.15s, background 0.15s, border-color 0.15s;
        }

        .cl-copy:disabled { cursor: not-allowed; opacity: 0.6; }

        .cl-copy.button {
            padding: 8px 14px;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 6px;
            background: var(--card-bg, #fff);
            color: var(--text-color, #333);
        }
        .cl-copy.button:hover:not(:disabled) {
            border-color: var(--primary-color, #007bff);
            color: var(--primary-color, #007bff);
        }
        .cl-copy.button.copied {
            border-color: #28a745;
            color: #28a745;
        }

        .cl-copy.icon-only {
            padding: 6px;
            border: none;
            border-radius: 6px;
            background: transparent;
            color: var(--text-muted, #6c757d);
        }
        .cl-copy.icon-only:hover:not(:disabled) {
            background: var(--hover-bg, #f0f0f0);
            color: var(--text-color, #333);
        }
        .cl-copy.icon-only.copied { color: #28a745; }

        .cl-copy.inline {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 4px 6px 4px 12px;
            border: 1px solid var(--input-border, #dee2e6);
            border-radius: 6px;
            background: var(--table-header-bg, #f8f9fa);
        }
        .copy-value {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            color: var(--text-color, #333);
        }
        .copy-inline-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: transparent;
            cursor: pointer;
            color: var(--text-muted, #6c757d);
            padding: 4px;
            border-radius: 4px;
        }
        .copy-inline-btn:hover:not(:disabled) { color: var(--primary-color, #007bff); }
        .cl-copy.inline.copied .copy-inline-btn { color: #28a745; }
    `
}

export default defineComponent('cl-copy', ClCopy);

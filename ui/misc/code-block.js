/**
 * ClCodeBlock - read-only syntax-highlighted code display.
 *
 * Shares the VDX-aware highlighter (and the --ce-* token palette) with
 * cl-code-editor, so "show source" panels match the live editor exactly and
 * understand html`` / /*css*​/`` templates, on-* bindings and ${} interpolation.
 *
 * @fires copy - detail: { value } - fired after the code is copied to clipboard
 */
import { defineComponent, html, when, Component } from '../../lib/framework.js';
import { highlightVdx } from '../form/vdx-highlight.js';

export class ClCodeBlock extends Component {
    static props = {
        code: '',
        src: '',
        language: 'auto',
        copyable: true,
        wrap: false,
        maxHeight: ''
    }

    constructor(props) {
        super(props);
        this.state = { copied: false };
        this._code = props.code || '';
        this._copyTimer = null;
    }

    mounted() {
        this._pre = this.refs.code;
        if (this.props.src) {
            fetch(this.props.src)
                .then((r) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.text(); })
                .then((text) => this._setCode(text.replace(/\s+$/, '\n')))
                .catch((err) => this._setCode(`// Failed to load ${this.props.src}\n// ${err.message}`));
        } else {
            this._paint();
        }
    }

    unmounted() {
        if (this._copyTimer) clearTimeout(this._copyTimer);
    }

    propsChanged(prop, newValue) {
        if (prop === 'code' && this._pre) {
            this._code = newValue == null ? '' : String(newValue);
            this._paint();
        }
    }

    _setCode(text) {
        this._code = text;
        this._paint();
    }

    emitEvent(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
    }

    _paint() {
        if (this._pre) this._pre.innerHTML = highlightVdx(this._code, this.props.language);
    }

    copy() {
        const done = () => {
            this.state.copied = true;
            this.emitEvent('copy', { value: this._code });
            if (this._copyTimer) clearTimeout(this._copyTimer);
            this._copyTimer = setTimeout(() => { this.state.copied = false; }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(this._code).then(done).catch(() => this._fallbackCopy(done));
        } else {
            this._fallbackCopy(done);
        }
    }

    _fallbackCopy(done) {
        const ta = document.createElement('textarea');
        ta.value = this._code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
    }

    template() {
        const style = this.props.maxHeight ? `max-height: ${this.props.maxHeight};` : '';
        return html`
            <div class="cl-code-block ${this.props.wrap ? 'wrap' : ''}">
                ${when(this.props.copyable, html`
                    <button type="button" class="cl-code-copy" on-click="copy"
                        aria-label="Copy code" title="Copy code">
                        ${this.state.copied ? '✓ Copied' : 'Copy'}
                    </button>
                `)}
                <pre class="cl-code-block-pre" style="${style}"><code ref="code"></code></pre>
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: block; }

        .cl-code-block {
            position: relative;
            background: var(--ce-bg, #fff);
            border: 1px solid var(--border-color, #e1e4e8);
            border-radius: 8px;
        }

        .cl-code-block-pre {
            margin: 0;
            padding: 14px 16px;
            overflow: auto;
            color: var(--ce-text, #24292e);
            font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
            font-size: 13px;
            line-height: 1.55;
            tab-size: 4;
            white-space: pre;
        }

        .cl-code-block.wrap .cl-code-block-pre {
            white-space: pre-wrap;
            word-break: break-word;
        }

        .cl-code-copy {
            position: absolute;
            top: 8px;
            right: 8px;
            z-index: 1;
            padding: 4px 10px;
            font-size: 12px;
            font-family: inherit;
            cursor: pointer;
            color: var(--text-secondary, #57606a);
            background: var(--card-bg, #fff);
            border: 1px solid var(--border-color, #e1e4e8);
            border-radius: 6px;
            opacity: 0;
            transition: opacity 0.15s;
        }

        .cl-code-block:hover .cl-code-copy,
        .cl-code-copy:focus-visible { opacity: 1; }

        .cl-code-copy:hover { background: var(--hover-bg, #f6f8fa); }

        /* Token colours - shared --ce-* palette (see theme.css) */
        .cl-code-block-pre .tok-comment      { color: var(--ce-comment, #6a737d); font-style: italic; }
        .cl-code-block-pre .tok-keyword      { color: var(--ce-keyword, #d73a49); }
        .cl-code-block-pre .tok-literal      { color: var(--ce-literal, #005cc5); }
        .cl-code-block-pre .tok-number       { color: var(--ce-number, #005cc5); }
        .cl-code-block-pre .tok-string       { color: var(--ce-string, #032f62); }
        .cl-code-block-pre .tok-regex        { color: var(--ce-regex, #032f62); }
        .cl-code-block-pre .tok-type         { color: var(--ce-type, #6f42c1); }
        .cl-code-block-pre .tok-fn           { color: var(--ce-fn, #6f42c1); }
        .cl-code-block-pre .tok-tpl          { color: var(--ce-tpl, #032f62); }
        .cl-code-block-pre .tok-interp       { color: var(--ce-interp, #e36209); font-weight: 600; }
        .cl-code-block-pre .tok-tagname      { color: var(--ce-tagname, #22863a); }
        .cl-code-block-pre .tok-attr         { color: var(--ce-attr, #6f42c1); }
        .cl-code-block-pre .tok-attr-dyn     { color: var(--ce-attr-dyn, #d73a49); font-weight: 600; }
        .cl-code-block-pre .tok-punct        { color: var(--ce-punct, #24292e); }
        .cl-code-block-pre .tok-css-selector { color: var(--ce-css-selector, #6f42c1); }
        .cl-code-block-pre .tok-css-prop     { color: var(--ce-css-prop, #005cc5); }
        .cl-code-block-pre .tok-css-value    { color: var(--ce-css-value, #032f62); }
    `
}

export default defineComponent('cl-code-block', ClCodeBlock);

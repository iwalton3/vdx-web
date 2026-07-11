/**
 * ClCodeEditor - a lightweight, dependency-free code editor with VDX-aware
 * syntax highlighting.
 *
 * Technique: a transparent <textarea> (real native caret, selection, IME,
 * undo) sits on top of a highlighted <pre>. The two share identical font,
 * padding and white-space, and their scroll positions are kept in sync, so the
 * coloured text behind the textarea lines up with what the user types. The
 * highlight layer is driven imperatively (not through the reactive template) so
 * re-renders never move the caret.
 *
 * Highlighting understands html`` templates and /*css*​/`` style blocks - see
 * ./vdx-highlight.js.
 *
 * Accessibility note: Tab inserts indentation instead of moving focus (standard
 * for code editors). Press Escape then Tab to leave the field.
 *
 * @fires change - detail: { value } - fired live on every edit (x-model compatible)
 */
import { defineComponent, html, when, Component } from '../../lib/framework.js';
import { highlightVdx } from './vdx-highlight.js';

let codeEditorIdCounter = 0;

export class ClCodeEditor extends Component {
    static props = {
        value: '',
        label: '',
        placeholder: '',
        readonly: false,
        disabled: false,
        tabSize: 4,
        height: '',        // CSS length; empty => resizable with a min-height
        spellcheck: false
    }

    constructor(props) {
        super(props);
        this.state = { editorId: `cl-code-editor-${++codeEditorIdCounter}` };
    }

    mounted() {
        this._ta = this.refs.textarea;
        this._pre = this.refs.highlight;
        this._ta.value = this.props.value || '';
        this._paint();
    }

    propsChanged(prop, newValue) {
        if (!this._ta) return;
        if (prop === 'value') {
            const next = newValue == null ? '' : String(newValue);
            // Only overwrite on a genuine external change - writing the value
            // the user just typed back into the textarea would jump the caret.
            if (this._ta.value !== next) {
                this._ta.value = next;
                this._paint();
            }
        }
    }

    /** Repaint the highlight layer from the textarea's current value. */
    _paint() {
        const v = this._ta.value;
        // A trailing newline collapses in the <pre>; pad so the last line shows.
        const tail = v.endsWith('\n') ? ' ' : '';
        this._pre.innerHTML = highlightVdx(v) + tail;
        this._syncScroll();
    }

    _syncScroll() {
        this._pre.scrollTop = this._ta.scrollTop;
        this._pre.scrollLeft = this._ta.scrollLeft;
    }

    handleInput(e) {
        this._paint();
        this.emitChange(e, this._ta.value);
    }

    handleChange(e) {
        // Swallow the native change so x-model doesn't receive an event without
        // detail.value (see FRAMEWORK.md - wrapped native inputs must self-emit).
        if (e && e.stopPropagation) e.stopPropagation();
        this.emitChange(e, this._ta.value);
    }

    handleScroll() {
        this._syncScroll();
    }

    handleKeydown(e) {
        if (this.props.readonly || this.props.disabled) return;
        if (e.key === 'Tab') {
            e.preventDefault();
            this._handleTab(e.shiftKey);
        } else if (e.key === 'Enter') {
            this._handleEnter(e);
        }
    }

    /** Tab / Shift+Tab: indent or outdent the caret line(s). */
    _handleTab(outdent) {
        const ta = this._ta;
        const indent = ' '.repeat(this.props.tabSize || 4);
        const { selectionStart: start, selectionEnd: end, value } = ta;

        if (start === end && !outdent) {
            // Simple caret: insert one indent.
            this._replaceRange(start, end, indent, start + indent.length, start + indent.length);
            return;
        }

        // Operate on whole lines spanning the selection.
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const block = value.slice(lineStart, end);
        let delta = 0;      // change to the first line's length (moves `start`)
        let total = 0;      // change across the whole block (moves `end`)
        const lines = block.split('\n').map((line, idx) => {
            if (outdent) {
                const remove = line.match(/^[ \t]{1,4}/);
                const cut = remove ? remove[0].length : 0;
                if (idx === 0) delta = -cut;
                total -= cut;
                return line.slice(cut);
            }
            if (idx === 0) delta = indent.length;
            total += indent.length;
            return indent + line;
        });
        const replaced = lines.join('\n');
        const newStart = Math.max(lineStart, start + delta);
        this._replaceRange(lineStart, end, replaced, newStart, end + total);
    }

    /** Enter: carry the current line's leading whitespace onto the new line. */
    _handleEnter(e) {
        const ta = this._ta;
        const { selectionStart: start, selectionEnd: end, value } = ta;
        if (start !== end) return;   // let the browser handle selection replacement
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lead = (value.slice(lineStart, start).match(/^[ \t]*/) || [''])[0];
        if (!lead) return;           // no indentation to carry - default behaviour
        e.preventDefault();
        const insert = '\n' + lead;
        this._replaceRange(start, end, insert, start + insert.length, start + insert.length);
    }

    /** Splice text into the textarea, restore selection, repaint, and emit. */
    _replaceRange(from, to, text, selStart, selEnd) {
        const ta = this._ta;
        ta.setRangeText(text, from, to, 'end');
        ta.selectionStart = selStart;
        ta.selectionEnd = selEnd;
        this._paint();
        this.emitChange(null, ta.value);
    }

    template() {
        const editorId = this.state.editorId;
        const boxStyle = this.props.height ? `height: ${this.props.height};` : '';
        return html`
            <div class="cl-code-editor-wrap">
                ${when(this.props.label, html`
                    <label class="cl-label" for="${editorId}">${this.props.label}</label>
                `)}
                <div class="cl-code-editor ${this.props.disabled ? 'disabled' : ''}" style="${boxStyle}">
                    <pre class="cl-code-hl" ref="highlight" aria-hidden="true"></pre>
                    <textarea
                        ref="textarea"
                        id="${editorId}"
                        class="cl-code-input"
                        spellcheck="${this.props.spellcheck ? 'true' : 'false'}"
                        autocapitalize="off"
                        autocomplete="off"
                        autocorrect="off"
                        wrap="off"
                        placeholder="${this.props.placeholder}"
                        readonly="${this.props.readonly}"
                        disabled="${this.props.disabled}"
                        aria-label="${this.props.label || 'Code editor'}"
                        on-input="handleInput"
                        on-change="handleChange"
                        on-scroll-passive="handleScroll"
                        on-keydown="handleKeydown"></textarea>
                </div>
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: block; }

        .cl-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color, #333);
            margin-bottom: 4px;
        }

        .cl-code-editor {
            position: relative;
            min-height: 160px;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 6px;
            background: var(--ce-bg, #fff);
            overflow: hidden;
        }

        .cl-code-editor.disabled { opacity: 0.6; }

        .cl-code-hl,
        .cl-code-input {
            margin: 0;
            border: 0;
            padding: 12px 14px;
            font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
            font-size: 13px;
            line-height: 1.55;
            tab-size: 4;
            /* Wrap long lines instead of scrolling horizontally. The highlight <pre>
               and transparent <textarea> share these rules so the caret stays aligned. */
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: break-word;
            box-sizing: border-box;
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            overflow-y: auto;
        }

        .cl-code-hl {
            position: absolute;
            inset: 0;
            pointer-events: none;
            color: var(--ce-text, #24292e);
            z-index: 0;
        }

        .cl-code-input {
            position: relative;
            z-index: 1;
            display: block;
            resize: none;
            background: transparent;
            color: transparent;
            caret-color: var(--ce-caret, #24292e);
            outline: none;
        }

        .cl-code-input::selection { background: var(--ce-selection, rgba(0,120,215,0.18)); }
        .cl-code-input::placeholder { color: var(--text-muted, #6c757d); }

        /* Token colours - driven by the --ce-* palette in global.css */
        .cl-code-hl .tok-comment      { color: var(--ce-comment, #6a737d); font-style: italic; }
        .cl-code-hl .tok-keyword      { color: var(--ce-keyword, #d73a49); }
        .cl-code-hl .tok-literal      { color: var(--ce-literal, #005cc5); }
        .cl-code-hl .tok-number       { color: var(--ce-number, #005cc5); }
        .cl-code-hl .tok-string       { color: var(--ce-string, #032f62); }
        .cl-code-hl .tok-regex        { color: var(--ce-regex, #032f62); }
        .cl-code-hl .tok-type         { color: var(--ce-type, #6f42c1); }
        .cl-code-hl .tok-fn           { color: var(--ce-fn, #6f42c1); }
        .cl-code-hl .tok-tpl          { color: var(--ce-tpl, #032f62); }
        .cl-code-hl .tok-interp       { color: var(--ce-interp, #e36209); font-weight: 600; }
        .cl-code-hl .tok-tagname      { color: var(--ce-tagname, #22863a); }
        .cl-code-hl .tok-attr         { color: var(--ce-attr, #6f42c1); }
        .cl-code-hl .tok-attr-dyn     { color: var(--ce-attr-dyn, #d73a49); font-weight: 600; }
        .cl-code-hl .tok-punct        { color: var(--ce-punct, #24292e); }
        .cl-code-hl .tok-css-selector { color: var(--ce-css-selector, #6f42c1); }
        .cl-code-hl .tok-css-prop     { color: var(--ce-css-prop, #005cc5); }
        .cl-code-hl .tok-css-value    { color: var(--ce-css-value, #032f62); }
    `
}

export default defineComponent('cl-code-editor', ClCodeEditor);

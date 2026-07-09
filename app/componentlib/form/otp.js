/**
 * OTP - One-time-code / PIN input. A row of single-character boxes with
 * auto-advance, backspace-to-previous, arrow navigation, and paste distribution.
 * Emits 'change' with the full value and 'complete' when every box is filled.
 *
 * The boxes are DOM-driven: the browser owns each box's value and the component
 * reads them on demand. That keeps native typing/IME behaviour intact and avoids
 * a reactive value binding re-rendering (and clobbering) the input mid-keystroke.
 */
import { defineComponent, html, each } from '../../lib/framework.js';

export default defineComponent('cl-otp', {
    props: {
        length: 6,
        value: '',
        type: 'text',       // 'text' | 'number'
        mask: false,        // render as password dots
        disabled: false,
        autofocus: false
    },

    mounted() {
        this._applyValue(this.props.value);
        if (this.props.autofocus && !this.props.disabled) {
            const first = this._boxes()[0];
            if (first) first.focus();
        }
    },

    propsChanged(prop, newValue) {
        // Controlled updates only. Ignore null/undefined: those are never a
        // meaningful controlled value and can arrive as a stray echo (a bound
        // parent briefly clearing its model), which must not wipe the boxes.
        // Clearing is done with value="".
        if (prop === 'value' && newValue != null && String(newValue) !== this._read()) {
            this._applyValue(newValue);
        }
    },

    methods: {
        _len() { return Math.max(1, parseInt(this.props.length, 10) || 6); },
        _boxes() { return Array.from(this.querySelectorAll('.otp-box')); },
        _read() { return this._boxes().map(b => b.value).join(''); },

        _applyValue(v) {
            const chars = (v == null ? '' : String(v)).slice(0, this._len()).split('');
            this._boxes().forEach((b, i) => { b.value = chars[i] || ''; });
        },

        _valid(ch) {
            return this.props.type === 'number' ? /[0-9]/.test(ch) : true;
        },

        _focus(index) {
            const boxes = this._boxes();
            const box = boxes[Math.max(0, Math.min(index, boxes.length - 1))];
            if (box) { box.focus(); box.select(); }
        },

        _emit() {
            const value = this._read();
            this.emitChange(null, value);
            this.dispatchEvent(new CustomEvent('input', {
                bubbles: true, composed: true, detail: { value }
            }));
            if (value.length === this._len()) {
                this.dispatchEvent(new CustomEvent('complete', {
                    bubbles: true, composed: true, detail: { value }
                }));
            }
        },

        onInput(e, index) {
            e.stopPropagation();
            let ch = (e.target.value || '').slice(-1); // keep only the last char
            if (ch && !this._valid(ch)) ch = '';
            e.target.value = ch;                       // enforce single, sanitized char
            this._emit();
            if (ch && index < this._len() - 1) this._focus(index + 1);
        },

        onKeydown(e, index) {
            if (e.key === 'Backspace') {
                if (!e.target.value && index > 0) {
                    e.preventDefault();
                    const prev = this._boxes()[index - 1];
                    if (prev) prev.value = '';
                    this._emit();
                    this._focus(index - 1);
                } else if (e.target.value) {
                    // Let the browser clear this box, then re-read.
                    setTimeout(() => this._emit(), 0);
                }
            } else if (e.key === 'ArrowLeft' && index > 0) {
                e.preventDefault();
                this._focus(index - 1);
            } else if (e.key === 'ArrowRight' && index < this._len() - 1) {
                e.preventDefault();
                this._focus(index + 1);
            }
        },

        onPaste(e, index) {
            e.preventDefault();
            const text = ((e.clipboardData || window.clipboardData).getData('text') || '');
            const chars = text.split('').filter(c => this._valid(c));
            if (!chars.length) return;
            const boxes = this._boxes();
            let pos = index;
            for (const c of chars) {
                if (pos >= boxes.length) break;
                boxes[pos++].value = c;
            }
            this._emit();
            this._focus(Math.min(pos, boxes.length - 1));
        },

        onFocus(e) { e.target.select(); }
    },

    template() {
        const len = this._len();
        const boxes = Array.from({ length: len }, (_, i) => i);
        const inputType = this.props.mask ? 'password' : 'text';
        const inputMode = this.props.type === 'number' ? 'numeric' : 'text';

        return html`
            <div class="cl-otp ${this.props.disabled ? 'disabled' : ''}" role="group">
                ${each(boxes, i => html`
                    <input
                        class="otp-box"
                        type="${inputType}"
                        inputmode="${inputMode}"
                        maxlength="1"
                        autocomplete="one-time-code"
                        disabled="${this.props.disabled}"
                        on-input="${(e) => this.onInput(e, i)}"
                        on-change="${(e) => e.stopPropagation()}"
                        on-keydown="${(e) => this.onKeydown(e, i)}"
                        on-paste="${(e) => this.onPaste(e, i)}"
                        on-focus="onFocus">
                `, i => i)}
            </div>
        `;
    },

    styles: /*css*/`
        :host { display: inline-block; }

        .cl-otp {
            display: inline-flex;
            gap: 8px;
        }

        .otp-box {
            width: 44px;
            height: 52px;
            text-align: center;
            font-size: 20px;
            font-weight: 600;
            color: var(--text-color, #333);
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 8px;
            background: var(--input-bg, #fff);
            transition: border-color 0.15s, box-shadow 0.15s;
        }

        .otp-box:focus {
            outline: none;
            border-color: var(--primary-color, #007bff);
            box-shadow: 0 0 0 3px var(--primary-light, rgba(0, 123, 255, 0.15));
        }

        .cl-otp.disabled { opacity: 0.6; }

        @media (max-width: 480px) {
            .otp-box { width: 38px; height: 46px; font-size: 18px; }
            .cl-otp { gap: 6px; }
        }
    `
});

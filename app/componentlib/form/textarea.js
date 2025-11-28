/**
 * TextArea - Multi-line text input with auto-resize option
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-textarea', {
    props: {
        value: '',
        placeholder: '',
        disabled: false,
        required: false,
        rows: 3,
        autoresize: false,
        maxlength: 0,
        label: '',
        error: '',
        showcount: false
    },

    methods: {
        handleInput(e) {
            const value = e.target.value;

            if (this.props.autoresize) {
                this.resizeTextarea(e.target);
            }

            this.emitChange(e, value);
        },

        resizeTextarea(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        },

        afterRender() {
            if (this.props.autoresize) {
                const textarea = this.querySelector('textarea');
                if (textarea) {
                    this.resizeTextarea(textarea);
                }
            }
        }
    },

    template() {
        const charCount = this.props.value.length;
        const showCounter = this.props.showcount || this.props.maxlength > 0;

        return html`
            <div class="cl-input-wrapper">
                ${when(this.props.label, html`
                    <label class="cl-label">
                        ${this.props.label}
                        ${when(this.props.required, html`<span class="required">*</span>`)}
                    </label>
                `)}
                <textarea
                    class="${this.props.error ? 'error' : ''}"
                    rows="${this.props.rows}"
                    placeholder="${this.props.placeholder}"
                    disabled="${this.props.disabled}"
                    maxlength="${this.props.maxlength || ''}"
                    on-input="handleInput">${this.props.value}</textarea>
                ${when(showCounter, html`
                    <small class="char-count">
                        ${charCount}${this.props.maxlength ? ` / ${this.props.maxlength}` : ''}
                    </small>
                `)}
                ${when(this.props.error, html`
                    <small class="error-text">${this.props.error}</small>
                `)}
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-input-wrapper {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .cl-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color, #333);
        }

        .required {
            color: var(--error-color, #dc3545);
        }

        textarea {
            font-family: inherit;
            font-size: 14px;
            padding: 10px 12px;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            background: var(--input-bg, #fff);
            color: var(--text-color, #333);
            resize: vertical;
            transition: all 0.2s;
        }

        textarea:focus {
            outline: none;
            border-color: var(--primary-color, #007bff);
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        textarea:disabled {
            background: var(--disabled-bg, #e9ecef);
            cursor: not-allowed;
            opacity: 0.6;
        }

        textarea.error {
            border-color: var(--error-color, #dc3545);
        }

        .char-count {
            font-size: 12px;
            color: var(--text-muted, #6c757d);
            text-align: right;
        }

        .error-text {
            font-size: 12px;
            color: var(--error-color, #dc3545);
        }
    `
});

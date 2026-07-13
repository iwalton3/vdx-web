/**
 * Segmented - Segmented control / select-button for choosing one of a few
 * mutually exclusive options (view switches, filters). x-model compatible.
 */
import { defineComponent, html, each, when, Component } from '../../lib/framework.js';

function normalize(options) {
    return (options || []).map(o =>
        (o && typeof o === 'object')
            ? { label: o.label != null ? o.label : o.value, value: o.value, icon: o.icon || '' }
            : { label: o, value: o, icon: '' }
    );
}

/**
 * @fires input - detail: { value }
 * @fires change - detail: { value }
 */
export class ClSegmented extends Component {
    static props = {
        options: [],
        value: null,
        disabled: false,
        size: 'medium',     // 'small' | 'medium' | 'large'
        fluid: false        // stretch to fill container width
    }

    constructor(props) {
        super(props);

        this.state = { internalValue: null };
    }

    mounted() {
        this.state.internalValue = this.props.value;
    }

    propsChanged(prop, newValue) {
        if (prop === 'value') this.state.internalValue = newValue;
    }

    select(value) {
        if (this.props.disabled) return;
        this.state.internalValue = value;
        this.emitChange(null, value);
        this.dispatchEvent(new CustomEvent('input', {
            bubbles: true, composed: true, detail: { value }
        }));
    }

    get items() { return normalize(this.props.options); }

    template() {
        const classes = [
            'cl-segmented',
            `size-${this.props.size}`,
            this.props.fluid ? 'fluid' : '',
            this.props.disabled ? 'disabled' : ''
        ].filter(Boolean).join(' ');

        return html`
            <div class="${classes}" role="group">
                ${each(this.items, opt => {
                    const active = opt.value === this.state.internalValue;
                    return html`
                        <button
                            type="button"
                            class="seg-option ${active ? 'active' : ''}"
                            role="radio"
                            aria-checked="${active ? 'true' : 'false'}"
                            disabled="${this.props.disabled}"
                            on-click="${() => this.select(opt.value)}">
                            ${when(opt.icon, html`<span class="seg-icon">${opt.icon}</span>`)}
                            ${opt.label}
                        </button>
                    `;
                }, opt => opt.value)}
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: inline-block; }

        .cl-segmented {
            display: inline-flex;
            padding: 3px;
            gap: 2px;
            background: var(--table-header-bg, #f0f1f3);
            border-radius: 8px;
            border: 1px solid var(--input-border, #dee2e6);
        }

        .cl-segmented.fluid { display: flex; width: 100%; }
        .cl-segmented.fluid .seg-option { flex: 1; }

        .seg-option {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border: none;
            background: transparent;
            color: var(--text-muted, #6c757d);
            font-size: 14px;
            font-weight: 500;
            padding: 7px 16px;
            border-radius: 6px;
            cursor: pointer;
            white-space: nowrap;
            transition: background 0.15s, color 0.15s, box-shadow 0.15s;
        }

        .seg-option:hover:not(:disabled):not(.active) {
            color: var(--text-color, #333);
        }

        .seg-option.active {
            background: var(--card-bg, #fff);
            color: var(--primary-color, #007bff);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        }

        .seg-option:disabled { cursor: not-allowed; }
        .cl-segmented.disabled { opacity: 0.6; }

        .size-small .seg-option { padding: 5px 12px; font-size: 13px; }
        .size-large .seg-option { padding: 10px 22px; font-size: 15px; }

        .seg-icon { line-height: 1; }
    `
}

export default defineComponent('cl-segmented', ClSegmented);

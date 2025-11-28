/**
 * Slider - Range slider input
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-slider', {
    props: {
        value: 0,
        min: 0,
        max: 100,
        step: 1,
        disabled: false,
        label: '',
        showvalue: true
    },

    data() {
        return {
            internalValue: 0 // Will be synced in mounted()
        };
    },

    mounted() {
        // Initialize internal value from props
        this.state.internalValue = this.props.value || 0;
    },

    propsChanged(prop, newValue, oldValue) {
        // Sync internal value when prop changes (controlled mode)
        if (prop === 'value' && newValue !== this.state.internalValue) {
            this.state.internalValue = newValue || 0;
        }
    },

    methods: {
        handleInput(e) {
            const value = parseFloat(e.target.value);
            this.state.internalValue = value;
            this.emitChange(e, value);
        }
    },

    template() {
        const percentage = ((this.state.internalValue - this.props.min) / (this.props.max - this.props.min)) * 100;

        return html`
            <div class="cl-slider-wrapper">
                ${when(this.props.label, html`
                    <div class="slider-header">
                        <label class="cl-label">${this.props.label}</label>
                        ${when(this.props.showvalue, html`
                            <span class="value-display">${this.state.internalValue}</span>
                        `)}
                    </div>
                `)}
                <div class="slider-container">
                    <input
                        type="range"
                        min="${this.props.min}"
                        max="${this.props.max}"
                        step="${this.props.step}"
                        value="${this.state.internalValue}"
                        disabled="${this.props.disabled}"
                        on-input="handleInput"
                        style="--percentage: ${percentage}%">
                </div>
            </div>
        `;
    },

    styles: `
        :host {
            display: block;
        }

        .cl-slider-wrapper {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .slider-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .cl-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color, #333);
        }

        .value-display {
            font-size: 14px;
            font-weight: 600;
            color: var(--primary-color, #007bff);
        }

        .slider-container {
            padding: 8px 0;
        }

        input[type="range"] {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: linear-gradient(
                to right,
                var(--primary-color, #007bff) 0%,
                var(--primary-color, #007bff) var(--percentage),
                var(--input-border, #ced4da) var(--percentage),
                var(--input-border, #ced4da) 100%
            );
            outline: none;
            -webkit-appearance: none;
            cursor: pointer;
        }

        input[type="range"]:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Chrome/Safari thumb */
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--primary-color, #007bff);
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            cursor: pointer;
            transition: all 0.2s;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        /* Firefox thumb */
        input[type="range"]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--primary-color, #007bff);
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            cursor: pointer;
            transition: all 0.2s;
        }

        input[type="range"]::-moz-range-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        /* Firefox track */
        input[type="range"]::-moz-range-track {
            background: transparent;
        }
    `
});

/**
 * ColorPicker - Color picker component
 */
import { defineComponent, html, when } from '../../lib/framework.js';

export default defineComponent('cl-colorpicker', {
    props: {
        value: '#000000',
        disabled: false,
        label: '',
        inline: false,
        format: 'hex' // 'hex' or 'rgb'
    },

    data() {
        return {
            showPicker: false,
            internalValue: '#000000' // Will be synced in mounted()
        };
    },

    mounted() {
        // Initialize internal value from props
        this.state.internalValue = this.props.value || '#000000';

        if (this.props.inline) {
            this.state.showPicker = true;
        }
    },

    propsChanged(prop, newValue, oldValue) {
        // Sync internal value when prop changes (controlled mode)
        if (prop === 'value' && newValue !== this.state.internalValue) {
            this.state.internalValue = newValue || '#000000';
        }
    },

    methods: {
        closePanel() {
            if (!this.props.inline) {
                this.state.showPicker = false;
            }
        },

        handleColorInput(event) {
            // Handle 'input' event from color picker (fires during selection)
            const color = event.target.value;
            this.state.internalValue = color;
            // Emit change event with proper format
            this.emitChange(event, color);
        },

        handleColorChange(event) {
            // Handle native 'change' event from color input
            // Stop it from bubbling to prevent x-model from receiving native event
            if (event && event.stopPropagation) {
                event.stopPropagation();
            }
            const color = event.target.value;
            this.state.internalValue = color;
            // Emit proper CustomEvent
            this.emitChange(event, color);
        },

        togglePicker() {
            if (!this.props.disabled && !this.props.inline) {
                this.state.showPicker = !this.state.showPicker;
            }
        },

        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        getDisplayValue() {
            if (this.props.format === 'rgb') {
                const rgb = this.hexToRgb(this.state.internalValue);
                return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : this.state.internalValue;
            }
            return this.state.internalValue;
        }
    },

    template() {
        const displayValue = this.getDisplayValue();

        return html`
            <div class="cl-colorpicker-wrapper">
                ${when(this.props.label, html`
                    <label class="cl-label">${this.props.label}</label>
                `)}
                ${when(!this.props.inline, html`
                    <div class="color-trigger" on-click="togglePicker">
                        <div class="color-preview" style="background: ${this.state.internalValue}"></div>
                        <span class="color-value">${displayValue}</span>
                    </div>
                `)}
                ${when(this.state.showPicker && !this.props.inline, html`
                    <div class="colorpicker-backdrop" on-click="closePanel"></div>
                `)}
                ${when(this.state.showPicker, html`
                    <div class="color-picker ${this.props.inline ? 'inline' : ''}">
                        <input
                            type="color"
                            value="${this.state.internalValue}"
                            disabled="${this.props.disabled}"
                            on-input="handleColorInput"
                            on-change="handleColorChange">
                        <div class="color-display">
                            <div class="selected-color" style="background: ${this.state.internalValue}"></div>
                            <div class="color-info">
                                <div class="color-hex">${this.state.internalValue}</div>
                                ${when(this.hexToRgb(this.state.internalValue), html`
                                    <div class="color-rgb">
                                        RGB: ${this.hexToRgb(this.state.internalValue).r},
                                        ${this.hexToRgb(this.state.internalValue).g},
                                        ${this.hexToRgb(this.state.internalValue).b}
                                    </div>
                                `)}
                            </div>
                        </div>
                    </div>
                `)}
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .cl-colorpicker-wrapper {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .cl-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color, #333);
        }

        .color-trigger {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            background: var(--input-bg, #fff);
            cursor: pointer;
            transition: all 0.2s;
        }

        .color-trigger:hover {
            border-color: var(--primary-color, #007bff);
        }

        .color-preview {
            width: 30px;
            height: 30px;
            border-radius: 4px;
            border: 1px solid var(--input-border, #ced4da);
        }

        .color-value {
            font-size: 14px;
            font-family: monospace;
            color: var(--text-color, #333);
        }

        .colorpicker-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 999;
        }

        .color-picker {
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 4px;
            background: var(--card-bg, white);
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 16px;
            z-index: 1000;
        }

        .color-picker.inline {
            position: static;
            margin-top: 0;
            box-shadow: none;
            z-index: auto;
        }

        .color-picker input[type="color"] {
            width: 100%;
            height: 150px;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            cursor: pointer;
        }

        .color-display {
            margin-top: 12px;
            display: flex;
            gap: 12px;
        }

        .selected-color {
            width: 60px;
            height: 60px;
            border-radius: 4px;
            border: 1px solid var(--input-border, #ced4da);
        }

        .color-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 4px;
        }

        .color-hex,
        .color-rgb {
            font-size: 13px;
            font-family: monospace;
            color: var(--text-color, #333);
        }

        .color-rgb {
            color: var(--text-muted, #6c757d);
        }
    `
});

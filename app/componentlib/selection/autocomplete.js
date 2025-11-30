/**
 * AutoComplete - Text input with autocomplete suggestions
 */
import { defineComponent, html, when, each } from '../../lib/framework.js';

export default defineComponent('cl-autocomplete', {
    props: {
        value: '',
        suggestions: [],
        placeholder: '',
        disabled: false,
        label: '',
        minlength: 1,
        delay: 300
    },

    data() {
        return {
            showSuggestions: false,
            filteredSuggestions: [],
            inputValue: '',
            timeout: null
        };
    },

    mounted() {
        this.state.inputValue = this.props.value;
    },

    methods: {
        handleInput(e) {
            const value = e.target.value;
            this.state.inputValue = value;

            // Clear existing timeout
            if (this.state.timeout) {
                clearTimeout(this.state.timeout);
            }

            // Delay filtering
            this.state.timeout = setTimeout(() => {
                this.filterSuggestions(value);
                this.emitChange(e, value);
            }, this.props.delay);
        },

        filterSuggestions(value) {
            if (!value || value.length < this.props.minlength) {
                this.state.showSuggestions = false;
                this.state.filteredSuggestions = [];
                return;
            }

            const filter = value.toLowerCase();
            const filtered = (this.props.suggestions || []).filter(suggestion => {
                const text = typeof suggestion === 'object' ? suggestion.label : suggestion;
                return String(text).toLowerCase().includes(filter);
            });

            this.state.filteredSuggestions = filtered;
            this.state.showSuggestions = filtered.length > 0;
        },

        selectSuggestion(suggestion) {
            const value = typeof suggestion === 'object' ? suggestion.value : suggestion;
            const displayValue = typeof suggestion === 'object' ? suggestion.label : suggestion;

            this.state.inputValue = displayValue;
            this.state.showSuggestions = false;
            this.emitChange(null, value);
        },

        handleBlur() {
            // Delay hiding to allow click on suggestion
            setTimeout(() => {
                this.state.showSuggestions = false;
            }, 200);
        },

        getSuggestionLabel(suggestion) {
            return typeof suggestion === 'object' ? suggestion.label : suggestion;
        }
    },

    template() {
        return html`
            <div class="cl-autocomplete-wrapper">
                ${when(this.props.label, html`
                    <label class="cl-label">${this.props.label}</label>
                `)}
                <div class="autocomplete-container">
                    <input
                        type="text"
                        value="${this.state.inputValue}"
                        placeholder="${this.props.placeholder}"
                        disabled="${this.props.disabled}"
                        on-input="handleInput"
                        on-blur="handleBlur">
                    ${when(this.state.showSuggestions, html`
                        <div class="suggestions-panel">
                            ${each(this.state.filteredSuggestions, suggestion => html`
                                <div
                                    class="suggestion"
                                    on-click="${() => this.selectSuggestion(suggestion)}">
                                    ${this.getSuggestionLabel(suggestion)}
                                </div>
                            `)}
                        </div>
                    `)}
                </div>
            </div>
        `;
    },

    styles: /*css*/`
        :host {
            display: block;
        }

        .cl-autocomplete-wrapper {
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

        .autocomplete-container {
            position: relative;
        }

        input {
            width: 100%;
            font-family: inherit;
            font-size: 14px;
            padding: 10px 12px;
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            background: var(--input-bg, #fff);
            color: var(--text-color, #333);
            transition: all 0.2s;
        }

        input:focus {
            outline: none;
            border-color: var(--primary-color, #007bff);
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        input:disabled {
            background: var(--disabled-bg, #e9ecef);
            cursor: not-allowed;
            opacity: 0.6;
        }

        .suggestions-panel {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 4px;
            background: var(--card-bg, white);
            border: 1px solid var(--input-border, #ced4da);
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-height: 250px;
            overflow-y: auto;
        }

        .suggestion {
            padding: 10px 12px;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 14px;
        }

        .suggestion:hover {
            background: var(--hover-bg, #f8f9fa);
        }
    `
});

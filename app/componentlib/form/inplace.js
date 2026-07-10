/**
 * Inplace - Click-to-edit text field. Shows a display value until clicked,
 * then swaps to an input; commits on Enter/blur, cancels on Escape.
 * x-model compatible.
 */
import { defineComponent, html, when, Component } from '../../lib/framework.js';

export class ClInplace extends Component {
    static props = {
        value: '',
        placeholder: 'Click to edit',
        disabled: false,
        type: 'text',          // 'text' | 'number' | 'email' | ...
        emptyText: 'Click to edit'
    }

    constructor(props) {
        super(props);

        this.state = { editing: false, internalValue: '', draft: '' };
    }

    mounted() {
        this.state.internalValue = this.props.value != null ? this.props.value : '';
    }

    propsChanged(prop, newValue) {
        if (prop === 'value' && !this.state.editing) {
            this.state.internalValue = newValue != null ? newValue : '';
        }
    }

    startEdit() {
        if (this.props.disabled) return;
        this.state.draft = this.state.internalValue;
        this.state.editing = true;
        // The input mounts on the next render, so focus after the frame
        // rather than synchronously (a ref isn't available yet here).
        requestAnimationFrame(() => {
            const input = this.querySelector('.inplace-input');
            if (input) { input.focus(); input.select(); }
        });
    }

    commit() {
        if (!this.state.editing) return;
        const input = this.querySelector('.inplace-input');
        const val = input ? input.value : this.state.draft;
        this.state.editing = false;
        if (val !== this.state.internalValue) {
            this.state.internalValue = val;
            this.emitChange(null, val);
        }
    }

    cancel() {
        this.state.editing = false;
    }

    onKeydown(e) {
        if (e.key === 'Enter') { e.preventDefault(); this.commit(); }
        else if (e.key === 'Escape') { e.preventDefault(); this.cancel(); }
    }

    // Prevent the inner input's native input/change from bubbling to a
    // parent on-change / x-model (they carry no detail). The component
    // emits its own 'change' via commit().
    stopNative(e) { e.stopPropagation(); }

    template() {
        if (this.state.editing) {
            return html`
                <span class="cl-inplace editing">
                    <input
                        ref="input"
                        class="inplace-input"
                        type="${this.props.type}"
                        value="${this.state.draft}"
                        on-input="stopNative"
                        on-change="stopNative"
                        on-blur="commit"
                        on-keydown="onKeydown">
                </span>
            `;
        }

        const isEmpty = this.state.internalValue === '' || this.state.internalValue == null;
        return html`
            <span
                class="cl-inplace display ${isEmpty ? 'empty' : ''} ${this.props.disabled ? 'disabled' : ''}"
                tabindex="${this.props.disabled ? -1 : 0}"
                role="button"
                on-click="startEdit"
                on-keydown="${(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.startEdit(); } }}">
                ${isEmpty ? this.props.emptyText : this.state.internalValue}
            </span>
        `;
    }

    static styles = /*css*/`
        :host { display: inline-block; }

        .cl-inplace.display {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: text;
            border: 1px solid transparent;
            color: var(--text-color, #333);
            transition: background 0.15s, border-color 0.15s;
            min-width: 40px;
        }

        .cl-inplace.display:hover:not(.disabled),
        .cl-inplace.display:focus-visible {
            background: var(--hover-bg, #f0f0f0);
            border-color: var(--input-border, #dee2e6);
            outline: none;
        }

        .cl-inplace.display.empty {
            color: var(--text-muted, #6c757d);
            font-style: italic;
        }

        .cl-inplace.display.disabled { cursor: default; opacity: 0.7; }

        .inplace-input {
            padding: 4px 8px;
            border: 1px solid var(--primary-color, #007bff);
            border-radius: 4px;
            font: inherit;
            color: var(--text-color, #333);
            background: var(--input-bg, #fff);
            outline: none;
        }
    `
}

export default defineComponent('cl-inplace', ClInplace);

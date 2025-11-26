/**
 * LazySelectBox Component - Inline editable select
 * Shows value as text, becomes dropdown on hover/click
 */
import { defineComponent } from '../core/component.js';
import { html, each, when } from '../core/template.js';

export default defineComponent('x-lazy-select-box', {
    props: {
        options: [],
        value: ''
    },

    data() {
        return {
            focus: false,
            editing: false
        };
    },

    methods: {
        edit() {
            this.state.focus = true;
        },

        abandon() {
            this.state.focus = false;
        },

        commit(e) {
            this.emitChange(e, this.props.options[Number(e.target.value)]);
            this.state.focus = false;
            this.state.editing = false;
        },

        startEditing() {
            this.state.editing = true;
        }
    },

    template() {
        const showSelect = this.state.focus || this.state.editing;

        // Parse options if they're a JSON string
        const optionsList = this.props.options || [];
        const valueIndex = optionsList.indexOf(this.props.value);

        return when(showSelect, html`
            <span on-mouseenter="edit" on-click="edit" on-mouseleave="abandon">
                <select on-change="commit" on-click="startEditing" value="${valueIndex !== -1 ? valueIndex : ''}">
                    ${each(optionsList, (option, index) => {
                        return html`<option value="${index}">${option}</option>`;
                    })}
                </select>
            </span>
        `, html`
            <span on-mouseenter="edit" on-click="edit" on-mouseleave="abandon">
                ${this.props.value}
            </span>
        `);
    }
});

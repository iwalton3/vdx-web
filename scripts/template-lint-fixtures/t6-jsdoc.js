// T6 fixture: JSDoc @fires / @prop metadata. Absence of JSDoc must produce
// zero output; presence enables the info/warn tiers.
import { Component, defineComponent, html } from '../../app/lib/framework.js';

/**
 * A documented picker.
 * @fires select - an item was chosen
 * @fires clear
 * @prop {Array} items - choices
 * @prop {string} placehodler - typo'd doc name (LINT-EXPECT: t6-prop-docs)
 */
class DocPicker extends Component {
    static props = { items: null, placeholder: '' };
    pick(item) {
        this.dispatchEvent(new CustomEvent('select', { detail: { value: item } }));
    }
    clearAll() {
        this.dispatchEvent(new CustomEvent('clear', { bubbles: true }));
    }
    notify() {
        this.emitChange(null, 1);
    }
    template() {
        return html`<div class="picker"></div>`;
    }
}
defineComponent('doc-picker', DocPicker);

// Undocumented component: T6 must stay silent no matter what events are bound
class NoDocs extends Component {
    template() {
        return html`<div></div>`;
    }
}
defineComponent('no-docs', NoDocs);

class PickerHost extends Component {
    onSelect() {}
    onClear() {}
    onChange() {}
    onMystery() {}
    template() {
        return html`
            <doc-picker on-select="onSelect" on-clear="onClear"></doc-picker>
            <doc-picker on-change="onChange" on-click="onSelect"></doc-picker>
            <doc-picker on-item-hover="onMystery"></doc-picker> <!-- LINT-EXPECT: t6-events -->
            <no-docs on-whatever-thing="onMystery"></no-docs>
        `;
    }
}
defineComponent('picker-host', PickerHost);

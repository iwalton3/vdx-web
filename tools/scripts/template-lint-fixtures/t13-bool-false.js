// T13 fixture: literal boolattr="false". Wrong under both halves of the
// template contract - on a native element the attribute is present so the flag
// is ON, and on a component it arrives as the truthy string "false". The ${}
// form, the bare form and ="true" are all correct and must stay silent.
import { Component, defineComponent, html } from '../../../lib/framework.js';

class BoolFalse extends Component {
    static props = { flag: false };
    template() {
        return html`
            <!-- Footguns - must be flagged -->
            <button disabled="false">a</button> <!-- LINT-EXPECT: t13-bool-false -->
            <input readonly="false"> <!-- LINT-EXPECT: t13-bool-false -->
            <cl-toggle checked="false"></cl-toggle> <!-- LINT-EXPECT: t13-bool-false -->

            <!-- Correct forms - must stay silent -->
            <button disabled="${false}">b</button>
            <button disabled="${this.props.flag}">c</button>
            <button disabled>d</button>
            <button disabled="true">e</button>
            <div data-disabled="false">f</div>
            <div title="false">g</div>
        `;
    }
}

defineComponent('t13-bool-false', BoolFalse);

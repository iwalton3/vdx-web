// T13 fixture: literal boolattr="false". Wrong under both halves of the
// template contract - on a native element the attribute is present so the flag
// is ON, and on a component it arrives as the truthy string "false" that
// nothing re-coerces.
//
// The interesting half is that a component's declared default is the ONLY type
// information available: `flag: false` and `flag: ''` below are the same prop
// name with different types, exactly like cl-button's `text: false` against
// cl-tooltip's `text: ''`. A name-based rule cannot tell them apart.
import { Component, defineComponent, html } from '../../../lib/framework.js';

class T13Flag extends Component {
    static props = { flag: false, outlined: false, label: '' };
    template() { return html`<i></i>`; }
}
defineComponent('t13-flag', T13Flag);

class T13Text extends Component {
    static props = { flag: '' };
    template() { return html`<i></i>`; }
}
defineComponent('t13-text', T13Text);

class BoolFalse extends Component {
    static props = { flag: false };
    template() {
        return html`
            <!-- Native elements: the HTML boolean-attribute names -->
            <button disabled="false">a</button> <!-- LINT-EXPECT: t13-bool-false -->
            <input readonly="false"> <!-- LINT-EXPECT: t13-bool-false -->

            <!-- Component, prop declared as a flag - including names that are
                 NOT HTML boolean attributes, which only the declaration knows -->
            <t13-flag flag="false"></t13-flag> <!-- LINT-EXPECT: t13-bool-false -->
            <t13-flag outlined="false"></t13-flag> <!-- LINT-EXPECT: t13-bool-false -->

            <!-- Same prop name, declared as a string: legitimate content -->
            <t13-text flag="false"></t13-text>

            <!-- A string prop on the flag component is also legitimate -->
            <t13-flag label="false"></t13-flag>

            <!-- Correct forms - must stay silent -->
            <button disabled="${false}">b</button>
            <button disabled="${this.props.flag}">c</button>
            <button disabled>d</button>
            <button disabled="">e</button>
            <button disabled="true">f</button>
            <t13-flag flag="${false}"></t13-flag>
            <div data-disabled="false">g</div>
            <div title="false">h</div>
        `;
    }
}

defineComponent('t13-bool-false', BoolFalse);

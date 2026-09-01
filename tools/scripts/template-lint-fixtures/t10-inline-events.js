// T10 fixture: inline DOM event attributes. VDX routes every handler through
// on-*; a static onclick="fn()" runs outside the framework, and a dynamic
// onclick="${fn}" is dropped entirely (functions are not attribute values).
// Names that merely start with "on" but are not DOM events stay silent.
import { Component, defineComponent, html } from '../../../lib/framework.js';

class InlineEvents extends Component {
    static props = { online: false };
    state = { label: 'x' };
    handleClick() {}
    template() {
        return html`
            <!-- Footguns - must be flagged -->
            <button onclick="doThing()">a</button> <!-- LINT-EXPECT: t10-inline-events -->
            <button onclick="${this.handleClick}">b</button> <!-- LINT-EXPECT: t10-inline-events -->
            <input oninput="sync()"> <!-- LINT-EXPECT: t10-inline-events -->

            <!-- Correct idiom and non-event attributes - must stay silent -->
            <button on-click="handleClick">c</button>
            <button on-click="${this.handleClick}">d</button>
            <div online="${this.props.online}">e</div>
            <div data-onclick="noop">f</div>
            <div once="${this.state.label}">g</div>
        `;
    }
}
defineComponent('inline-events', InlineEvents);

// T8 fixture: raw .map()/ternary/&&/|| returning html`` in a content slot.
// each() and when() build the keyed placeholder nodes the renderer needs; the
// inline forms build none (the runtime throws for a raw template array). Only
// ${} whose expression contains a nested html`` literal is flagged - a plain
// call, a string-producing .map().join(), or a non-template ternary stays silent.
import { Component, defineComponent, html, each, when } from '../../../lib/framework.js';

class ListControl extends Component {
    static props = { rows: null };
    state = { items: [], open: false };
    renderRow() { return html`<li>row</li>`; }
    template() {
        return html`
            <!-- Footguns - must be flagged -->
            <ul>${this.state.items.map(i => html`<li>${i}</li>`)}</ul> <!-- LINT-EXPECT: t8-list-control -->
            <div>${this.state.open ? html`<span>a</span>` : html`<span>b</span>`}</div> <!-- LINT-EXPECT: t8-list-control -->
            <div>${this.state.open && html`<span>hi</span>`}</div> <!-- LINT-EXPECT: t8-list-control -->

            <!-- Correct idioms and non-template expressions - must stay silent -->
            <ul>${each(this.state.items, i => html`<li>${i}</li>`, i => i)}</ul>
            <div>${when(this.state.open, html`<span>ok</span>`)}</div>
            <ul>${this.state.items.map(i => i.name).join(', ')}</ul>
            <div>${this.state.open ? 'yes' : 'no'}</div>
            <div>${this.renderRow()}</div>
        `;
    }
}
defineComponent('list-control', ListControl);

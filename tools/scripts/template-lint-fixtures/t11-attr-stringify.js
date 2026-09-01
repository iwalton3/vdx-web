// T11 fixture: JSON.stringify() into a component PROP. VDX passes objects and
// arrays through as real values, so stringifying forces the receiver to parse
// them back and defeats reference-based change detection. Only props are
// flagged - the parser marks those 'custom-element-attr'. On a NATIVE element
// an attribute is a string, so stringifying there is correct; data-*/json-*
// are string payloads by design even on a component; content position is fine.
import { Component, defineComponent, html } from '../../../lib/framework.js';

class Stringify extends Component {
    state = { items: [], config: {} };
    template() {
        return html`
            <!-- Footgun - must be flagged -->
            <cl-table rows="${JSON.stringify(this.state.items)}"></cl-table> <!-- LINT-EXPECT: t11-attr-stringify -->

            <!-- Correct idioms and legitimate string payloads - must stay silent -->
            <cl-table rows="${this.state.items}"></cl-table>
            <cl-table data-config="${JSON.stringify(this.state.config)}"></cl-table>
            <cl-table json-config="${JSON.stringify(this.state.config)}"></cl-table>
            <pre title="${JSON.stringify(this.state.config)}"></pre>
            <div data-config="${JSON.stringify(this.state.config)}"></div>
            <pre>${JSON.stringify(this.state.config, null, 2)}</pre>
        `;
    }
}
defineComponent('stringify-demo', Stringify);

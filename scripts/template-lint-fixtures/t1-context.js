// T1 fixture: template context rules - detached helpers, attribute-position
// factory templates (render in another component), content-position nesting.
import { Component, defineComponent, html, each } from '../../app/lib/framework.js';

// Module-level helper: no component context - string handlers resolve against
// whatever component renders the result. Never checked.
function statusIcon(status) {
    return html`<span class="icon" on-click="notCheckedHere">${status}</span>`;
}

class ListHost extends Component {
    static props = { items: null };
    state = { rows: [] };
    handleRowTap() {}
    template() {
        return html`
            <cl-virtual-list
                items=${this.state.rows}
                render-item=${(item) => html`
                    <div class="row" on-click="resolvedByChildComponent">${item.name}</div>
                `}>
            </cl-virtual-list>
            ${each(this.state.rows, (row) => html`
                <span on-click="handleRowTap">ok - each() renders in this component</span>
                <span on-click="handleRowTapp">bad</span> <!-- LINT-EXPECT: t1-handler -->
            `)}
            <button on-click="handleRowTap">ok</button>
        `;
    }
}
export default defineComponent('list-host', ListHost);

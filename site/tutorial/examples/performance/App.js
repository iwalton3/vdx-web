import { defineComponent, Component, html } from 'vdx/lib/framework.js';
import 'vdx/ui/data/virtual-list.js';

// Rendering 10,000 rows would normally choke the DOM. <cl-virtual-list> only
// renders the rows in view (plus a small buffer) and recycles them as you
// scroll, so it stays smooth no matter how big the list is.
class BigList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            items: Array.from({ length: 10000 }, (_, i) => ({
                id: i,
                title: `Row ${i + 1}`,
                subtitle: `id: ${i}`
            }))
        };
    }

    template() {
        return html`
            <div class="wrap">
                <p>${this.state.items.length.toLocaleString()} rows — scroll away.
                   Only the visible ones exist in the DOM.</p>
                <cl-virtual-list
                    items="${this.state.items}"
                    itemHeight="48"
                    height="320px"
                    keyFn="${(item) => item.id}">
                </cl-virtual-list>
            </div>
        `;
    }

    static styles = /*css*/`
        .wrap { font-family: system-ui, sans-serif; }
        cl-virtual-list { display: block; border: 1px solid var(--border-color, #8884); border-radius: 10px; }
    `;
}
defineComponent('big-list', BigList);

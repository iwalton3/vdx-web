import { defineComponent, Component, html, each } from 'vdx/lib/framework.js';

// State can be objects and arrays, not just numbers. Mutating them (push, splice,
// assignment) re-renders. A `get`-ter becomes a cached computed value - it only
// recalculates when the state it reads changes.
class MiniCart extends Component {
    constructor(props) {
        super(props);
        this.state = {
            items: [
                { name: 'Coffee', price: 3.5 },
                { name: 'Croissant', price: 2.75 }
            ]
        };
        this._menu = [
            { name: 'Muffin', price: 3.0 },
            { name: 'Latte', price: 4.25 },
            { name: 'Bagel', price: 2.5 },
            { name: 'Tea', price: 2.0 }
        ];
    }

    // Cached computed: recomputes only when items change.
    get total() {
        return this.state.items.reduce((sum, item) => sum + item.price, 0);
    }

    add() {
        const pick = this._menu[this.state.items.length % this._menu.length];
        this.state.items.push({ ...pick });   // push re-renders
    }

    removeAt(i) {
        this.state.items.splice(i, 1);
    }

    clear() {
        this.state.items = [];
    }

    template() {
        return html`
            <div class="cart">
                <h3>Your order (${this.state.items.length})</h3>
                <ul>
                    ${each(this.state.items, (item, i) => html`
                        <li>
                            <span>${item.name}</span>
                            <span>$${item.price.toFixed(2)}</span>
                            <button on-click="${() => this.removeAt(i)}">✕</button>
                        </li>
                    `)}
                </ul>
                <div class="total">Total: <strong>$${this.total.toFixed(2)}</strong></div>
                <div class="actions">
                    <button on-click="add">＋ Add item</button>
                    <button class="ghost" on-click="clear">Clear</button>
                </div>
            </div>
        `;
    }

    static styles = /*css*/`
        .cart { font-family: system-ui, sans-serif; max-width: 340px; }
        h3 { margin: 0 0 12px; }
        ul { list-style: none; padding: 0; margin: 0 0 12px; }
        li { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #8883; }
        li span:first-child { flex: 1; }
        li button { border: none; background: none; cursor: pointer; color: #c00; font-size: 15px; }
        .total { font-size: 1.15rem; margin: 12px 0; }
        .actions { display: flex; gap: 8px; }
        .actions button { padding: 8px 14px; border-radius: 8px; border: none; cursor: pointer; background: var(--primary-color, #007bff); color: #fff; }
        .actions .ghost { background: transparent; color: var(--primary-color, #007bff); border: 1px solid currentColor; }
    `;
}

defineComponent('mini-cart', MiniCart);

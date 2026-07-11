import { defineComponent, Component, html, each } from 'vdx/lib/framework.js';
import { cartStore } from './store.js';

// This component only adds to the store. It doesn't know the cart summary
// exists - they stay in sync purely through the shared store.
class ProductList extends Component {
    static stores = { cartStore };

    constructor(props) {
        super(props);
        this._products = [
            { name: 'Coffee', price: 3.5 },
            { name: 'Muffin', price: 3.0 },
            { name: 'Latte', price: 4.25 }
        ];
    }

    template() {
        return html`
            <div class="products">
                <h3>Menu</h3>
                ${each(this._products, (p) => html`
                    <div class="product">
                        <span class="name">${p.name}</span>
                        <span class="price">$${p.price.toFixed(2)}</span>
                        <button on-click="${() => this.stores.cartStore.add(p)}">Add</button>
                    </div>
                `)}
            </div>
        `;
    }

    static styles = /*css*/`
        .products { font-family: system-ui, sans-serif; }
        h3 { margin: 0 0 10px; }
        .product { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #8883; }
        .name { flex: 1; }
        .price { color: var(--text-secondary, #57606a); }
        button { padding: 6px 14px; border: none; border-radius: 8px; cursor: pointer; background: var(--primary-color, #007bff); color: #fff; }
    `;
}

defineComponent('product-list', ProductList);

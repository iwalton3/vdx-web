import { defineComponent, Component, html, when, each } from 'vdx/lib/framework.js';
import { cartStore } from './store.js';

// A completely separate component that reads the same store. `static stores`
// exposes the store's reactive state as this.stores.cartStore; reading it here
// subscribes this component to the parts it uses.
class CartSummary extends Component {
    static stores = { cartStore };

    template() {
        const cart = this.stores.cartStore;
        return html`
            <div class="summary">
                <h3>🛒 Cart (${cart.count})</h3>
                ${when(cart.items.length,
                    html`
                        <ul>
                            ${each(cart.items, (item) => html`
                                <li>
                                    <span>${item.name} ✕ ${item.qty}</span>
                                    <span>$${(item.qty * item.price).toFixed(2)}</span>
                                    <button on-click="${() => this.stores.cartStore.remove(item.name)}">remove</button>
                                </li>
                            `, (item) => item.name)}
                        </ul>
                        <div class="total">Total: <strong>$${cart.total.toFixed(2)}</strong></div>
                    `,
                    html`<p class="empty">Your cart is empty — add something from the menu.</p>`
                )}
            </div>
        `;
    }

    static styles = /*css*/`
        .summary { font-family: system-ui, sans-serif; }
        h3 { margin: 0 0 10px; }
        ul { list-style: none; padding: 0; margin: 0; }
        li { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #8883; }
        li span:first-child { flex: 1; }
        li button { background: transparent; border: 1px solid currentColor; color: #c00; font-size: 11px; padding: 3px 8px; border-radius: 6px; cursor: pointer; }
        .total { margin-top: 12px; font-size: 1.1rem; }
        .empty { color: #8898a8; }
    `;
}

defineComponent('cart-summary', CartSummary);

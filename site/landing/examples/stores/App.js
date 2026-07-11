import { defineComponent, Component, html, each, when } from 'vdx/lib/framework.js';
import { cart } from './store.js';

// A menu that adds items. It has never heard of the badge below it.
class SnackMenu extends Component {
    static stores = { cart };

    template() {
        const menu = ['Coffee', 'Bagel', 'Cookie'];
        return html`
            <div class="menu">
                ${each(menu, (name) => html`
                    <button on-click="${() => this.stores.cart.add(name)}">+ ${name}</button>
                `)}
            </div>
        `;
    }

    static styles = /*css*/`
        .menu { display: flex; gap: 8px; flex-wrap: wrap; }
        .menu button {
            font: inherit; font-size: 14px; cursor: pointer;
            padding: 9px 14px; border-radius: 9px;
            border: 1px solid var(--input-border, #ced4da);
            background: var(--card-bg, #fff); color: var(--text-color, #333);
        }
        .menu button:hover { border-color: var(--primary-color, #007bff); color: var(--primary-color, #007bff); }
    `;
}
defineComponent('snack-menu', SnackMenu);

// A badge somewhere else entirely - same store, always in sync. Nothing is
// passed between the two components; they just read the same reactive state.
class CartBadge extends Component {
    static stores = { cart };

    template() {
        const c = this.stores.cart;
        return html`
            <div class="badge">
                <span class="pill">🛒 <strong>${c.count}</strong></span>
                ${when(c.items.length,
                    html`<span class="list">${c.items.map((i) => `${i.name}×${i.qty}`).join('  ·  ')}</span>`,
                    html`<span class="list muted">nothing yet — pick from the menu</span>`)}
            </div>
        `;
    }

    static styles = /*css*/`
        .badge { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .pill { font-size: 18px; }
        .pill strong { font-variant-numeric: tabular-nums; }
        .list { font-size: 13px; color: var(--text-color, #333); }
        .list.muted { color: var(--text-muted, #6c757d); }
    `;
}
defineComponent('cart-badge', CartBadge);

// Compose them side by side. There is no wiring between the badge and the menu.
class StoreDemo extends Component {
    template() {
        return html`
            <cart-badge></cart-badge>
            <snack-menu></snack-menu>
            <p class="note">Two independent components, one shared store. Click the menu — the badge keeps itself in sync.</p>
        `;
    }

    static styles = /*css*/`
        :host { display: block; padding: 24px; font-family: system-ui, sans-serif; }
        .note { margin: 18px 0 0; font-size: 13px; color: var(--text-muted, #6c757d); }
    `;
}
defineComponent('store-demo', StoreDemo);

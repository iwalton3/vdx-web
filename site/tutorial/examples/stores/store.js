import { Store } from 'vdx/lib/framework.js';

// A store is reactive state that lives outside any single component - authored
// as a class, just like a component. Reactive data goes in this.state; methods
// and getters live on the class (getters are cached computeds). Any component
// that reads the store re-renders when the parts it uses change.
class CartStore extends Store {
    constructor() {
        super();
        this.state = { items: [] };
    }

    add(product) {
        const existing = this.state.items.find((i) => i.name === product.name);
        if (existing) {
            existing.qty++;
        } else {
            this.state.items.push({ ...product, qty: 1 });
        }
    }

    remove(name) {
        this.state.items = this.state.items.filter((i) => i.name !== name);
    }

    get count() {
        return this.state.items.reduce((n, i) => n + i.qty, 0);
    }

    get total() {
        return this.state.items.reduce((n, i) => n + i.qty * i.price, 0);
    }
}

// A module is evaluated once, so every importer shares this one instance.
export const cartStore = new CartStore();

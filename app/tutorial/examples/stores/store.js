import { createStore } from 'vdx/lib/framework.js';

// A store is reactive state that lives outside any single component. Define
// methods right on the state and call them via `.state`. Any component that
// reads the store re-renders when the parts it uses change.
export const cartStore = createStore({
    items: [],

    add(product) {
        const existing = this.items.find((i) => i.name === product.name);
        if (existing) {
            existing.qty++;
        } else {
            this.items.push({ ...product, qty: 1 });
        }
    },

    remove(name) {
        this.items = this.items.filter((i) => i.name !== name);
    },

    get count() {
        return this.items.reduce((n, i) => n + i.qty, 0);
    },

    get total() {
        return this.items.reduce((n, i) => n + i.qty * i.price, 0);
    }
});

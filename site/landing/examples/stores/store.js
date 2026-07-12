import { Store } from 'vdx/lib/framework.js';

// A store is reactive state that lives outside any component - authored as a
// class, just like a component. Reactive data goes in this.state; methods and
// getters live on the class (getters are cached computeds). Define it once,
// import it anywhere. No <Provider> to wrap your app in, no reducer, no context
// boilerplate, no selector hooks.
class CartStore extends Store {
    constructor() {
        super();
        this.state = { items: [] };
    }

    add(name) {
        const hit = this.state.items.find((i) => i.name === name);
        if (hit) hit.qty++;
        else this.state.items.push({ name, qty: 1 });
    }

    get count() {
        return this.state.items.reduce((n, i) => n + i.qty, 0);
    }
}

// A module is evaluated once, so every importer shares this one instance.
export const cart = new CartStore();

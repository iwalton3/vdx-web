import { createStore } from 'vdx/lib/framework.js';

// A store is reactive state that lives outside any component. Define it once,
// import it anywhere. No <Provider> to wrap your app in, no reducer, no context
// boilerplate, no selector hooks - just an object with methods and getters.
export const cart = createStore({
    items: [],

    add(name) {
        const hit = this.items.find((i) => i.name === name);
        if (hit) hit.qty++;
        else this.items.push({ name, qty: 1 });
    },

    get count() {
        return this.items.reduce((n, i) => n + i.qty, 0);
    }
});

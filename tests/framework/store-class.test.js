/**
 * Tests for the class-based Store base class.
 */

import { describe, assert } from './test-runner.js';
import {
    Store, createStore, defineComponent, Component, html, nextRender, createEffect
} from '../../lib/framework.js';

describe('Store class: authoring', function(it) {
    it('promotes state fields onto the instance (read + write)', () => {
        class S extends Store {
            constructor() { super(); this.state = { items: [], coupon: null }; }
        }
        const s = new S();
        assert.deepEqual(s.items, [], 'promoted read');
        assert.equal(s.items, s.state.items, 'promotion forwards to .state');

        s.items = [1, 2];
        assert.deepEqual(s.state.items, [1, 2], 'promoted write forwards to .state');
    });

    it('methods are on the instance and auto-bound', () => {
        class Cart extends Store {
            constructor() { super(); this.state = { items: [] }; }
            add(item) { this.state.items.push(item); }
        }
        const c = new Cart();
        const add = c.add;              // detached
        add({ price: 5 });
        assert.equal(c.state.items.length, 1, 'auto-bound method works detached');
    });

    it('getters become cached computeds', () => {
        let computeRuns = 0;
        class Cart extends Store {
            constructor() { super(); this.state = { items: [{ price: 2 }, { price: 3 }] }; }
            get total() { computeRuns++; return this.state.items.reduce((s, i) => s + i.price, 0); }
        }
        const c = new Cart();
        assert.equal(c.total, 5, 'computed value');
        assert.equal(c.total, 5, 'cached value');
        assert.equal(computeRuns, 1, 'getter cached (ran once for two reads)');

        c.state.items.push({ price: 5 });
        assert.equal(c.total, 10, 'recomputed after dependency change');
        assert.equal(computeRuns, 2, 'recomputed exactly once');
    });

    it('ordinary fields are NOT reactive', () => {
        class S extends Store {
            _controller = { audio: 'node' };
            constructor() { super(); this.state = { volume: 1 }; }
        }
        const s = new S();
        assert.equal(s._controller.audio, 'node', 'plain field accessible');
        assert.ok(!('_controller' in s.state), 'field not in reactive state');
    });

    it('keys added after first assignment are reactive but not promoted', () => {
        class S extends Store {
            constructor() { super(); this.state = { a: 1 }; }
        }
        const s = new S();
        s.state.b = 2;
        assert.equal(s.state.b, 2, 'late key reachable via .state');
        assert.equal(s.b, undefined, 'late key not promoted onto instance');
    });
});

describe('Store class: collision safety', function(it) {
    it('throws when a state key shadows a method', () => {
        class Bad extends Store {
            constructor() { super(); this.state = { add: 1 }; }
            add() {}
        }
        assert.throws(() => new Bad(), Error, 'state key colliding with method throws');
    });

    it('throws when a state key shadows a getter', () => {
        class Bad extends Store {
            constructor() { super(); this.state = { total: 1 }; }
            get total() { return 0; }
        }
        assert.throws(() => new Bad(), Error, 'state key colliding with getter throws');
    });

    it('throws when a state key shadows a reserved member', () => {
        class Bad extends Store {
            constructor() { super(); this.state = { subscribe: 1 }; }
        }
        assert.throws(() => new Bad(), Error, 'state key "subscribe" throws');
    });

    it('throws at first use when state is declared as a class field', () => {
        // `state = {...}` as a class FIELD uses [[Define]] semantics: it shadows
        // the base accessor and silently skips reactive wrapping. The store
        // must fail loudly at first use, not render stale forever.
        class Bad extends Store {
            state = { items: [] };
        }
        const bad = new Bad();
        assert.throws(() => bad.subscribe(() => {}), Error, 'subscribe throws on field-shadowed state');
        assert.throws(() => bad.set({ items: [1] }), Error, 'set throws on field-shadowed state');
    });
});

describe('Store class: subscribe/set/update', function(it) {
    it('subscribe fires immediately and on change', async () => {
        class S extends Store {
            constructor() { super(); this.state = { count: 0 }; }
        }
        const s = new S();
        let seen = null;
        const unsub = s.subscribe(store => { seen = store.state.count; });
        assert.equal(seen, 0, 'immediate call');

        s.state.count = 3;
        await new Promise(r => setTimeout(r, 0));
        assert.equal(seen, 3, 'notified on change');
        unsub();
        s.state.count = 9;
        await new Promise(r => setTimeout(r, 0));
        assert.equal(seen, 3, 'no notification after unsubscribe');
    });

    it('set() and update() merge state', () => {
        class S extends Store {
            constructor() { super(); this.state = { a: 1, b: 2 }; }
        }
        const s = new S();
        s.set({ a: 10 });
        assert.equal(s.state.a, 10, 'set merged');
        s.update(st => ({ b: st.b + 5 }));
        assert.equal(s.state.b, 7, 'update merged');
    });
});

describe('Store class: component wiring', function(it) {
    it('exposes the instance (state + getters + methods) on this.stores', async () => {
        class Cart extends Store {
            constructor() { super(); this.state = { items: [{ price: 4 }] }; }
            add(item) { this.state.items.push(item); }
            get total() { return this.state.items.reduce((s, i) => s + i.price, 0); }
        }
        const cart = new Cart();

        class Badge extends Component {
            static stores = { cart };
            template() {
                return html`<span id="t">${this.stores.cart.total}</span><span id="n">${this.stores.cart.items.length}</span>`;
            }
        }
        defineComponent('cart-badge', Badge);

        const el = document.createElement('cart-badge');
        document.body.appendChild(el);
        await el.nextRender();
        assert.equal(el.querySelector('#t').textContent, '4', 'computed total via instance');
        assert.equal(el.querySelector('#n').textContent, '1', 'state field via instance');

        el.stores.cart.add({ price: 6 });
        await el.nextRender();
        assert.equal(el.querySelector('#t').textContent, '10', 'reactive update via method');
        assert.equal(el.querySelector('#n').textContent, '2', 'count updated');

        document.body.removeChild(el);
    });

    it('class Store and legacy createStore coexist in one component', async () => {
        class Prefs extends Store {
            constructor() { super(); this.state = { theme: 'dark' }; }
        }
        const prefs = new Prefs();
        const legacy = createStore({ count: 7 });

        class Mixed extends Component {
            static stores = { prefs, legacy };
            template() {
                return html`<span id="p">${this.stores.prefs.theme}</span><span id="l">${this.stores.legacy.count}</span>`;
            }
        }
        defineComponent('mixed-stores', Mixed);

        const el = document.createElement('mixed-stores');
        document.body.appendChild(el);
        await el.nextRender();
        assert.equal(el.querySelector('#p').textContent, 'dark', 'class store field');
        assert.equal(el.querySelector('#l').textContent, '7', 'legacy store field');

        el.stores.prefs.theme = 'light';
        legacy.state.count = 8;
        await el.nextRender();
        assert.equal(el.querySelector('#p').textContent, 'light', 'class store reactive');
        assert.equal(el.querySelector('#l').textContent, '8', 'legacy store reactive');

        document.body.removeChild(el);
    });
});

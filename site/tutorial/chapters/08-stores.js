import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class StoresChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 8 · Working with data</p>
            <h1>State management with stores</h1>
            <p class="lead">
                When several components need the same data, lift it into a <strong>store</strong> —
                reactive state that lives outside any one component.
            </p>

            <h2>Creating a store</h2>
            <p>
                <code>createStore(initial)</code> makes a reactive store. Put methods and getters
                right on the state object and call them via <code>store.state.method()</code>. This
                example has <strong>three source files</strong> (plus the page) — click the tabs:
            </p>
            <ul>
                <li><code>store.js</code> — the shared cart store</li>
                <li><code>ProductList.js</code> — a component that only <em>adds</em> to the cart</li>
                <li><code>CartSummary.js</code> — a separate component that <em>reads</em> the cart</li>
            </ul>

            <h2>Consuming a store</h2>
            <p>
                A component declares <code>static stores = { cartStore }</code> and then reads
                <code>this.stores.cartStore</code> like local state. Reading it subscribes the
                component; writing to it re-renders <em>every</em> component that uses that data.
            </p>

            <tut-live-example
                title="A shared shopping cart"
                base="/site/tutorial/examples/stores"
                files="store.js, ProductList.js, CartSummary.js, index.html"
                activeFile="store.js">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> add a product in the menu on the left — the cart on the
                right updates instantly, even though the two components never talk to each other.
                Add a <code>get subtotalWithTax()</code> getter to <code>store.js</code> and show
                it in <code>CartSummary.js</code>.
            </p>

            <div class="callout tip">
                Both components <code>import { cartStore } from './store.js'</code>. Because a
                module is only evaluated once, they share the exact same store instance — that's
                what keeps them in sync.
            </div>

            <h2>Persisting a store</h2>
            <p>
                Want the cart to survive a reload? Swap <code>createStore</code> for
                <code>localStore</code> from <code>vdx/lib/utils.js</code>:
                <code>localStore('cart', { items: [] })</code> loads its initial state from
                <code>localStorage</code> and writes every change back automatically. Same API,
                one changed line.
            </p>
        `;
    }
}

defineComponent('tut-ch-stores', StoresChapter);

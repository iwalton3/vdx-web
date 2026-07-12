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
                A store is a class, just like a component: extend <code>Store</code>, seed
                reactive data with <code>this.state = {…}</code> in the constructor, and put
                methods and getters on the class — getters are cached computeds, exactly as in
                chapter 2. Export one instance and every importer shares it. This example has
                <strong>three source files</strong> (plus the page) — click the tabs:
            </p>
            <ul>
                <li><code>store.js</code> — the shared cart store</li>
                <li><code>ProductList.js</code> — a component that only <em>adds</em> to the cart</li>
                <li><code>CartSummary.js</code> — a separate component that <em>reads</em> the cart</li>
            </ul>

            <h2>Consuming a store</h2>
            <p>
                A component declares <code>static stores = { cartStore }</code> and then uses
                <code>this.stores.cartStore</code> directly: state fields
                (<code>.items</code>), computed getters (<code>.count</code>), and methods
                (<code>.add(p)</code>) all hang off the same object. Reading subscribes the
                component; a method that writes state re-renders <em>every</em> component using
                that data.
            </p>

            <div class="callout warn">
                Assign <code>this.state</code> in the <em>constructor</em>. Declaring
                <code>state = {…}</code> as a class field bypasses the reactive setter (class
                fields use define-semantics) — the store throws a clear error at first use if
                you do.
            </div>

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
                Want the cart to survive a reload? <code>localStore('cart', { items: [] })</code>
                from <code>vdx/lib/utils.js</code> creates a simple factory-style store that
                loads its initial state from <code>localStorage</code> and writes every change
                back automatically. (There's also an older <code>createStore(initial)</code>
                factory where methods live on the state object — you may see it in existing
                code; classes are the way to write new stores.)
            </p>
        `;
    }
}

defineComponent('tut-ch-stores', StoresChapter);

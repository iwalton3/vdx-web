import { defineComponent, html } from '../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class StateChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 2 · Getting started</p>
            <h1>Working with state</h1>
            <p class="lead">
                State isn't just numbers. Objects and arrays are reactive too — mutate them and
                the view updates.
            </p>

            <h2>Arrays and objects are reactive</h2>
            <p>
                You can <code>push</code>, <code>splice</code>, or reassign array and object state
                directly. VDX tracks the change and re-renders the parts that depend on it — even
                <code>sort()</code> and <code>reverse()</code> are handled correctly.
            </p>

            <h2>Getters are computed values</h2>
            <p>
                A <code>get</code>-ter on the class becomes a <strong>cached computed</strong>: it
                recalculates only when the state it reads changes, and you use it like a property
                (<code>this.total</code>, no parentheses). The cart's total below is a getter.
            </p>

            <tut-live-example
                title="A reactive cart"
                base="/tutorial/examples/state"
                files="App.js, index.html">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> add a <code>get itemCount()</code> getter that returns
                <code>this.state.items.length</code>, then show it in the template.
            </p>

            <div class="callout">
                Getters must read <strong>only</strong> <code>state</code>, <code>stores</code>, or
                <code>props</code>. A getter that also reads the DOM or a plain field can silently
                go stale, because caching is keyed to the reactive values it touched.
            </div>
        `;
    }
}

defineComponent('tut-ch-state', StateChapter);

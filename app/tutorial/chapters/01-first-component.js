import { defineComponent, html } from '../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class FirstComponent extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 1 · Getting started</p>
            <h1>Your first component</h1>
            <p class="lead">
                VDX is a reactive web framework with zero dependencies and no build step.
                Components are plain ES classes that run straight in the browser.
            </p>

            <p>
                Every example in this tutorial is <strong>live and editable</strong>. The tabs on
                the left of each example are real files — <code>App.js</code> is the component,
                <code>index.html</code> is the page that uses it. Edit either one and the preview
                re-runs automatically.
            </p>

            <h2>A component is a class</h2>
            <p>
                A component extends <code>Component</code>, keeps reactive data in
                <code>this.state</code>, and returns markup from <code>template()</code> using the
                <code>html\`\`</code> tag. Methods are auto-bound, so
                <code>on-click="increment"</code> just works. Assigning to <code>this.state</code>
                re-renders — there is no <code>setState</code> and no virtual DOM.
            </p>

            <tut-live-example
                title="A reactive counter"
                base="/tutorial/examples/counter"
                files="App.js, index.html">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> change <code>this.state.count++</code> to
                <code>+= 5</code>, or edit the button colour in the <code>/*css*/</code> block.
                Switch to the <code>index.html</code> tab to see how the component is used on a page.
            </p>

            <div class="callout tip">
                Notice <code>defineComponent('my-counter', MyCounter)</code> at the bottom of
                <code>App.js</code>. That registers the class as the custom element
                <code>&lt;my-counter&gt;</code>, which the HTML page then uses like any other tag.
            </div>
        `;
    }
}

defineComponent('tut-ch-first', FirstComponent);

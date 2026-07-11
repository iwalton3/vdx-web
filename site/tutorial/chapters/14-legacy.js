import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class LegacyChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 14 · Going further</p>
            <h1>The legacy options format</h1>
            <p class="lead">
                Before class components, VDX used an options object. It still works — you'll see it
                in older code.
            </p>

            <h2>defineComponent with an object</h2>
            <p>
                Instead of a class, you pass <code>defineComponent</code> an object with
                <code>props</code>, <code>data()</code>, <code>methods</code>,
                <code>computed</code>, <code>template()</code>, and <code>styles</code>. Class
                components are translated into exactly this internally, so both run the same way.
            </p>

            <tut-live-example
                title="The options-object format"
                base="/site/tutorial/examples/legacy"
                files="App.js, index.html">
            </tut-live-example>

            <div class="callout warn">
                One real difference: <code>data()</code> runs at element construction,
                <em>before</em> prop values arrive, so it sees prop <em>defaults</em>. A class
                <code>constructor(props)</code> runs at first connect and sees the real values.
                That's why the example seeds <code>count</code> from <code>this.props.start</code>
                in <code>mounted()</code> rather than <code>data()</code>.
            </div>

            <p>
                Prefer classes for new code — they give you real IDE autocomplete and the clearer
                constructor timing — but there's no need to migrate existing options-format
                components.
            </p>

            <h2>That's the tour</h2>
            <p>
                You've covered components, state, events, binding, lists, communication, lifecycle,
                stores, routing, static integration, performance, and the advanced tools. From
                here, the reference docs go deeper on each topic — and every component you build is
                just a class, some state, and a template.
            </p>
        `;
    }
}

defineComponent('tut-ch-legacy', LegacyChapter);

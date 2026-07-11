import { defineComponent, html } from '../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class EventsChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 3 · Getting started</p>
            <h1>Event handling</h1>
            <p class="lead">
                Wire up interactivity with <code>on-*</code> attributes. Never
                <code>onclick</code>, never <code>addEventListener</code>.
            </p>

            <h2>on-* handlers</h2>
            <p>
                Any event works: <code>on-click</code>, <code>on-input</code>,
                <code>on-submit</code>, or a custom event name. The handler can be a method name
                or an inline arrow function, and it's always called with
                <code>(event, value)</code> — where <code>value</code> is the resolved input value,
                so you rarely need to reach for <code>event.target.value</code>.
            </p>

            <h2>Modifiers</h2>
            <p>
                Chain modifiers onto the event name. <code>on-submit-prevent</code> calls
                <code>preventDefault()</code> for you; <code>-stop</code> stops propagation, and
                <code>-passive</code> marks scroll-friendly touch/wheel handlers. The form below
                uses <code>on-submit-prevent</code> so it never reloads the page.
            </p>

            <tut-live-example
                title="A todo input"
                base="/tutorial/examples/events"
                files="App.js, index.html">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> give the <code>&lt;input&gt;</code> an
                <code>on-keydown</code> handler that clears <code>this.state.draft</code> when the
                pressed key is <code>Escape</code>.
            </p>
        `;
    }
}

defineComponent('tut-ch-events', EventsChapter);

import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class LifecycleChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 7 · Working with data</p>
            <h1>Lifecycle hooks</h1>
            <p class="lead">
                Components can run code when they enter and leave the DOM — for timers,
                subscriptions, and data fetching.
            </p>

            <h2>mounted() and unmounted()</h2>
            <p>
                <code>mounted()</code> runs once the element is in the DOM: start intervals, add
                listeners, kick off a fetch. <code>unmounted()</code> runs when it's removed —
                <strong>always undo</strong> what <code>mounted()</code> set up here, or you'll
                leak timers and listeners.
            </p>

            <tut-live-example
                title="A self-cleaning clock"
                base="/site/tutorial/examples/lifecycle"
                files="App.js, index.html">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> click <em>Unmount the clock</em>. The
                <code>unmounted()</code> hook clears the interval — remove that
                <code>clearInterval</code> line and you've written a memory leak.
            </p>

            <h2>propsChanged()</h2>
            <p>
                When a prop changes, <code>propsChanged(name, newValue)</code> fires. Read
                <code>newValue</code> directly rather than <code>this.props[name]</code>, which may
                still hold the previous value at that moment.
            </p>

            <div class="callout">
                The constructor runs once, at first connect, with real prop values — a good place
                to seed state. It does <em>not</em> re-run if the element is moved and reconnected
                (for example during a drag-reorder).
            </div>
        `;
    }
}

defineComponent('tut-ch-lifecycle', LifecycleChapter);

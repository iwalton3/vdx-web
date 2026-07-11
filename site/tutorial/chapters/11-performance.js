import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class PerformanceChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 11 · Building apps</p>
            <h1>Performance</h1>
            <p class="lead">
                VDX is fast by default, but two tools handle the demanding cases: windowed lists
                and reactive boundaries.
            </p>

            <h2>Windowed lists</h2>
            <p>
                Rendering thousands of DOM nodes is slow no matter the framework. The answer is to
                render only what's on screen. <code>&lt;cl-virtual-list&gt;</code> does exactly
                that — the example below has <strong>10,000 rows</strong> but keeps only a couple
                dozen in the DOM at a time.
            </p>

            <tut-live-example
                title="10,000 rows, smoothly"
                base="/site/tutorial/examples/performance"
                files="App.js, index.html">
            </tut-live-example>

            <h2>Reactive boundaries</h2>
            <p>
                A template re-evaluates as one unit. When a high-frequency value (a timer, a
                progress bar) sits next to expensive content, wrap the fast part in
                <code>contain(() =&gt; …)</code> so only it re-renders. Moving content into a child
                component isolates it the same way.
            </p>

            <div class="callout tip">
                Reach for these only when a list is large or a value updates many times per second.
                For everything else, plain <code>each()</code> and normal state are already quick —
                iterating even a few thousand items creates a single reactive dependency.
            </div>
        `;
    }
}

defineComponent('tut-ch-performance', PerformanceChapter);

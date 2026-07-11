import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class AdvancedChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 12 · Going further</p>
            <h1>Advanced patterns</h1>
            <p class="lead">
                A few tools for real apps: async rendering, error boundaries, and direct DOM access.
            </p>

            <h2>Async data with awaitThen()</h2>
            <p>
                <code>awaitThen(promise, onData, loadingView)</code> shows a placeholder while a
                promise is pending and swaps in the result when it resolves — no manual
                <code>isLoading</code> flag. Reassigning the promise re-triggers it.
            </p>

            <tut-live-example
                title="Loading state, for free"
                base="/site/tutorial/examples/advanced"
                files="App.js, index.html">
            </tut-live-example>

            <h2>Error boundaries</h2>
            <p>
                If <code>template()</code> throws, a component's <code>renderError(error)</code>
                method renders a fallback instead of crashing the app — often just
                <code>&lt;cl-error-boundary&gt;</code>. Because a prop might be
                <code>null</code> when an error occurs, drive any recovery through events.
            </p>

            <h2>Refs</h2>
            <p>
                Add <code>ref="input"</code> to reach a real DOM node as
                <code>this.refs.input</code> — for focus, measurement, or media playback. A node
                that's only shown <em>this</em> render isn't available synchronously; defer to the
                next frame with <code>requestAnimationFrame</code> and query the light DOM.
            </p>
        `;
    }
}

defineComponent('tut-ch-advanced', AdvancedChapter);

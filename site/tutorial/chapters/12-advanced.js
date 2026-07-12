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

            <h2>Refs &amp; waiting for the DOM</h2>
            <p>
                Add <code>ref="input"</code> to reach a real DOM node as
                <code>this.refs.input</code> — for focus, measurement, or media playback. A node
                that's only shown <em>this</em> render isn't available synchronously — but
                <code>await this.nextRender()</code> waits through the update, <em>including</em>
                newly mounted conditional branches, so the node is there afterwards. To wait for
                a <strong>child component</strong> (even one whose definition lazy-loads), use
                <code>const el = await this.whenMounted('child-tag')</code> — it resolves after
                the child's first render and <code>mounted()</code>, or <code>null</code> if your
                component unmounts while waiting.
            </p>

            <h2>Superseded requests: <code>createTask</code></h2>
            <p>
                Type fast in a search box and responses can come back <em>out of order</em> — the
                answer for an old query lands last and overwrites the right one. The classic fix
                is a hand-rolled request counter. VDX packages it:
                <code>this.createTask(async (signal, q) =&gt; …)</code> gives you a
                <strong>latest-wins</strong> operation — each <code>run()</code> aborts the one
                before it, and a superseded body dies at its <code>await</code> (the fetch
                rejects) before it can write state. The task exposes reactive
                <code>pending</code> and <code>error</code> for your template; your data goes
                into ordinary state, written by the task body.
            </p>

            <tut-live-example
                title="Out-of-order responses, tamed"
                base="/site/tutorial/examples/tasks"
                files="App.js, index.html"
                activeFile="App.js">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> the fake API is slower for <em>shorter</em> queries.
                Type <code>vend</code> quickly in both boxes: the naive one ends up showing
                results for <code>"v"</code> (watch the ⚠ warning), the task one never regresses.
                One caution: tasks are for <em>replacement</em> flows — if aborting the previous
                run would lose data (say, loading page 2 of a list), use a busy-flag guard
                instead.
            </p>

            <tut-live-example
                title="Crash, catch, recover"
                base="/site/tutorial/examples/errors"
                files="App.js, index.html">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> click <em>Break it</em> — the child's template throws and
                <code>renderError()</code> takes over. <em>Recover</em> dispatches a
                <code>CustomEvent</code> up to the parent, which restores the data and focuses the
                input through <code>this.refs.name</code>. Delete the <code>renderError()</code>
                method and break it again to see what an uncaught render error looks like.
            </p>
        `;
    }
}

defineComponent('tut-ch-advanced', AdvancedChapter);

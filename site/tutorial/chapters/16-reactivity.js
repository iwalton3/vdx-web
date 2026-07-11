import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class ReactivityChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 16 · Guides</p>
            <h1>Reactivity in depth</h1>
            <p class="lead">
                You've been using reactive state since chapter 2. Here's what's happening underneath,
                and the few tools you'll reach for when plain objects and arrays aren't enough.
            </p>

            <h2>Deep by default</h2>
            <p>
                <code>this.state</code> is a proxy. Reading a value during render <em>subscribes</em>
                the component to it; assigning a value re-renders exactly the parts that used it.
                This goes all the way down — nested objects and arrays are wrapped too, so
                <code>this.state.user.name = 'Sam'</code> or <code>this.state.items.push(x)</code>
                both react without any special call.
            </p>

            <h2>Reactive Sets and Maps</h2>
            <p>
                A <code>Set</code> or <code>Map</code> placed in state is auto-wrapped: mutating it
                with <code>.add()</code>/<code>.delete()</code>/<code>.set()</code> re-renders, and
                reading it with <code>.has()</code>/<code>.size</code>/<code>.get()</code> subscribes.
                That makes them the natural fit for selection, membership, and keyed lookups — no
                "copy the whole collection to update it" dance.
            </p>

            <tut-live-example
                title="Multi-select backed by a reactive Set"
                base="/site/tutorial/examples/reactivity"
                files="App.js, index.html"
                activeFile="App.js">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> the chips toggle membership in a <code>Set</code>. Add a
                "select all" button that does <code>tags.forEach(t =&gt; this.state.selected.add(t))</code>
                — one mutation per tag, one batched re-render.
            </p>

            <h2>Cached getters</h2>
            <p>
                A <strong>getter</strong> on your component is a cached computed value. It re-runs only
                when the state it read changes, and its result is memoised in between:
            </p>
            <div class="callout warn">
                A getter must read <em>only</em> reactive sources — <code>this.state</code>, stores,
                and <code>this.props</code>. If it reads <code>Date.now()</code>, a module variable, or
                anything else, the cache can't know it went stale and you'll get a wrong value. Keep
                side effects and impure reads out of getters. (Need a standalone memoised value outside
                a component? <code>computed(getter)</code> does the same thing.)
            </div>

            <h2>Opting out for big data: <code>untracked()</code></h2>
            <p>
                Deep reactivity has a per-item cost. For a large array whose <em>individual items</em>
                never change in place — a 10,000-row dataset you only ever replace wholesale —
                <code>untracked()</code> marks it so the framework skips per-element tracking:
            </p>
            <pre class="ex"><code>import { untracked } from 'vdx/lib/framework.js';

this.state.rows = untracked(bigArray);        // skip deep tracking

// To update, reassign the whole thing (re-wrap it):
this.state.rows = untracked([...this.state.rows, newRow]);

// In-place item edits deliberately do NOT re-render:
this.state.rows[0].name = 'x';                // no update</code></pre>

            <h2>Forcing a synchronous update: <code>flushSync()</code></h2>
            <p>
                Renders are batched by default. When you need the DOM updated <em>right now</em> —
                to measure an element, set focus, or scroll to a freshly-added node —
                <code>flushSync()</code> flushes pending changes synchronously:
            </p>
            <pre class="ex"><code>import { flushSync } from 'vdx/lib/framework.js';

addRow() {
    flushSync(() =&gt; { this.state.rows.push(newRow); });
    // the new row is in the DOM now, so this measures correctly:
    this.refs.list.scrollTop = this.refs.list.scrollHeight;
}</code></pre>
            <div class="callout">
                Use <code>flushSync()</code> sparingly — it bypasses batching, so leaning on it in hot
                paths costs performance. Most code never needs it.
            </div>

            <div class="callout tip">
                More — array method reactivity, effects, and error handling — is in
                <a href="https://github.com/iwalton3/vdx-web/blob/main/docs/reactivity.md">docs/reactivity.md</a>
                and <a href="https://github.com/iwalton3/vdx-web/blob/main/docs/performance.md">docs/performance.md</a>.
            </div>
        `;
    }

    static styles = /*css*/`
        .ex { background: var(--code-bg, rgba(175,184,193,0.15)); border-radius: 8px; padding: 14px 16px; overflow-x: auto; margin: 14px 0; }
        .ex code { background: none; padding: 0; font-size: 0.82em; line-height: 1.6; white-space: pre; }
    `;
}

defineComponent('tut-ch-reactivity', ReactivityChapter);

import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class HelpersChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 5 · Working with data</p>
            <h1>Lists &amp; conditionals</h1>
            <p class="lead">
                Render conditionally with <code>when()</code> and render lists with
                <code>each()</code> — instead of ternaries and manual <code>.map()</code>.
            </p>

            <h2>when()</h2>
            <p>
                <code>when(condition, thenTemplate, elseTemplate)</code> shows one branch or the
                other. The task board below shows an empty-state message with <code>when()</code>
                whenever a filter matches nothing.
            </p>

            <h2>each() and keys</h2>
            <p>
                <code>each(items, item =&gt; …)</code> renders a list. Pass a
                <strong>key function</strong> as the third argument
                (<code>each(items, fn, item =&gt; item.id)</code>) so VDX can preserve each row's
                DOM — important once rows carry state, focus, or animation, or when the list
                reorders. Iterating even thousands of items creates a single dependency, so large
                lists stay fast.
            </p>

            <tut-live-example
                title="A filterable task board"
                base="/site/tutorial/examples/helpers"
                files="App.js, index.html">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> add a new task to the initial <code>tasks</code> array,
                then click a task to toggle it done and switch between the filters.
            </p>

            <div class="callout tip">
                Unlike <code>contain()</code> (chapter 11), <code>when()</code> and
                <code>each()</code> don't create reactive boundaries — variables you captured
                before the call still update fine. The function forms buy you something else:
                <code>when(cond, () =&gt; …)</code> only evaluates the branch that's actually
                shown, so the hidden branch can safely reference data that doesn't exist yet
                (<code>when(this.state.user, () =&gt; html\`\${this.state.user.name}\`)</code>).
            </div>
        `;
    }
}

defineComponent('tut-ch-helpers', HelpersChapter);

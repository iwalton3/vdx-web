import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';
import '../../../ui/misc/code-block.js';

class HelpersChapter extends TutChapter {
    constructor(props) {
        super(props);
        this.state = {
            whenItemEx: [
                '${each(rows, row => when(row.urgent,',
                '    () => html`<a class="pill bad" href="${row.url}">${row.label}</a>`,',
                '    () => html`<span class="pill">${row.label}</span>`), row => row.key)}'
            ].join('\n')
        };
    }

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

            <div class="callout banned">
                <strong>Banned:</strong> building lists or branches any other way.
                <code>\${items.map(i =&gt; html\`…\`)}</code> <strong>throws</strong> — a raw
                template array builds no keyed placeholders, so the DOM desyncs the moment the
                list changes — and <code>\${cond ? html\`a\` : html\`b\`}</code> bypasses
                <code>when()</code>'s stable placeholder. Use <code>each()</code> and
                <code>when()</code>.
                <span class="lint">Caught statically by <code>t8-list-control</code>.</span>
            </div>

            <tut-live-example
                title="A filterable task board"
                base="/site/tutorial/examples/helpers"
                files="App.js, index.html">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> add a new task to the initial <code>tasks</code> array,
                then click a task to toggle it done and switch between the filters.
            </p>

            <h2>What an item template may return</h2>
            <p>
                An <code>each()</code> item must return a template built with <code>html</code>,
                or <code>null</code>/<code>undefined</code>/<code>false</code> to skip that item.
                A <code>when()</code> is fine as the <em>whole</em> item in either form —
                <code>each()</code> resolves it to the branch template, so a branch flip is just
                an ordinary item shape change:
            </p>
            <cl-code-block code="${this.state.whenItemEx}" language="js" copyable="${false}"></cl-code-block>

            <div class="callout banned">
                <strong>Banned:</strong> returning <code>contain()</code> or
                <code>memoEach()</code> as a whole item, or a plain value. Those two keep their
                state (an isolated effect, a memo cache) on the <em>slot</em> they occupy, and a
                list item root is not a slot; a plain string or number has no keyed placeholder
                at all. <code>each()</code> <strong>throws</strong> for both rather than rendering
                nothing. Give them a slot by wrapping the item:
                <code>item =&gt; html\`&lt;li&gt;\${memoEach(…)}&lt;/li&gt;\`</code>.
                <span class="lint">Caught statically by <code>t9-list-item</code>.</span>
            </div>

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

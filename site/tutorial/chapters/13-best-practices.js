import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../../../ui/misc/code-block.js';

class BestPracticesChapter extends TutChapter {
    constructor(props) {
        super(props);
        this.state = {
            eventsBad: '<button onclick="handleClick()">Save</button>',
            eventsGood: '<button on-click="handleClick">Save</button>',
            listBad: '${items.map(i => `<li>${i.name}</li>`).join("")}',
            listGood: '${each(items, item => html`<li>${item.name}</li>`, item => item.id)}',
            itemBad: [
                '${each(secs, s =>',
                '    memoEach(s.rows, renderRow, r => r.id),',
                '  s => s.id)}'
            ].join('\n'),
            itemGood: [
                '${each(secs, s => html`<div>',
                '    ${memoEach(s.rows, renderRow, r => r.id)}',
                '</div>`, s => s.id)}'
            ].join('\n'),
            // No `language` - the highlighter knows auto/js/html/css only, and
            // 'auto' falls through to JS, which leaves a shell line alone.
            lintCmd: [
                'node tools/template-lint.js ./src',
                'node tools/optimize.js -i ./src --lint-only'
            ].join('\n'),
            cleanup: [
                'mounted() {',
                '    this._timer = setInterval(this.tick, 1000);',
                '}',
                '',
                'unmounted() {',
                '    clearInterval(this._timer);   // always undo mounted()',
                '}'
            ].join('\n')
        };
    }

    template() {
        return html`
            <p class="eyebrow">Chapter 13 · Going further</p>
            <h1>Best practices</h1>
            <p class="lead">
                A short checklist that keeps VDX components predictable and fast.
            </p>

            <h2>Bind events with on-*</h2>
            <p>Never use inline <code>onclick</code> or <code>addEventListener</code>.</p>
            <div class="dd">
                <div class="dont"><span class="tag">Avoid</span>
                    <cl-code-block code="${this.state.eventsBad}" copyable="${false}"></cl-code-block>
                </div>
                <div class="do"><span class="tag">Prefer</span>
                    <cl-code-block code="${this.state.eventsGood}" copyable="${false}"></cl-code-block>
                </div>
            </div>

            <h2>Render lists with each()</h2>
            <p>Use <code>when()</code> and <code>each()</code> instead of ternaries and
               <code>.map().join()</code> — and give <code>each()</code> a key.</p>
            <div class="dd">
                <div class="dont"><span class="tag">Avoid</span>
                    <cl-code-block code="${this.state.listBad}" language="js" copyable="${false}"></cl-code-block>
                </div>
                <div class="do"><span class="tag">Prefer</span>
                    <cl-code-block code="${this.state.listGood}" language="js" copyable="${false}"></cl-code-block>
                </div>
            </div>

            <h2>Give list items a template root</h2>
            <p>An <code>each()</code> item must return a template built with <code>html</code>
               (or <code>null</code>/<code>false</code> to skip it). <code>when()</code> is fine
               as the whole item; <code>contain()</code> and <code>memoEach()</code> are not —
               they keep their state on the slot they occupy, and an item root is not a slot.</p>
            <div class="dd">
                <div class="dont"><span class="tag">Throws</span>
                    <cl-code-block code="${this.state.itemBad}" language="js" copyable="${false}"></cl-code-block>
                </div>
                <div class="do"><span class="tag">Prefer</span>
                    <cl-code-block code="${this.state.itemGood}" language="js" copyable="${false}"></cl-code-block>
                </div>
            </div>

            <h2>Clean up in unmounted()</h2>
            <p>Every timer, listener, or subscription started in <code>mounted()</code> should be
               torn down in <code>unmounted()</code>.</p>
            <cl-code-block code="${this.state.cleanup}" language="js" copyable="${false}"></cl-code-block>

            <h2>A few more</h2>
            <ul>
                <li>Don't name methods after DOM methods (<code>remove</code>,
                    <code>append</code>, <code>closest</code>, <code>getAttribute</code>…) —
                    they're bound onto the element and would shadow the native one, so
                    <code>defineComponent</code> throws. (<code>focus</code>/<code>click</code>
                    are fine to override.)</li>
                <li>No Lit/Vue attribute sugar: <code>?attr</code>, <code>@event</code>,
                    <code>.prop</code>, and <code>:attr</code> all throw. Use
                    <code>disabled="\${cond}"</code>, <code>on-*</code>, and plain attributes.</li>
                <li>Put props in <code>static props</code> — never as class fields.</li>
                <li>Getters must read only <code>state</code>, <code>stores</code>, or
                    <code>props</code>, so their caching stays correct.</li>
                <li>Use <code>x-model</code> for form inputs rather than wiring value + input by
                    hand.</li>
                <li>Isolate high-frequency updates with <code>contain()</code> so they don't
                    re-render expensive neighbours.</li>
                <li>Need the DOM after a change? <code>await this.nextRender()</code> — not
                    <code>requestAnimationFrame</code> or timeouts.</li>
                <li>Fetching on user input? <code>this.createTask()</code> so a stale response
                    can't overwrite a newer one.</li>
                <li>Pass objects and arrays as real values
                    (<code>options="\${items}"</code>) — never <code>JSON.stringify</code> them.</li>
                <li>Don't write <code>this.method.bind(this)</code> — methods are already bound
                    onto the element, and the copy is a different function, so
                    <code>removeEventListener</code> and identity checks miss it.</li>
                <li>A dynamic <code>onclick="\${fn}"</code> is refused at render; a static
                    <code>onclick="fn()"</code> is not guarded at all and runs outside the
                    framework and your CSP. Always <code>on-click="handler"</code>.</li>
                <li>Write components as classes. Very old code may use a deprecated
                    options-object form of <code>defineComponent</code> — it still runs, but don't
                    write new code in it.</li>
            </ul>

            <h2>None of this is on the honour system</h2>
            <p>
                Every banned pattern above either <strong>throws</strong> or renders silently
                wrong DOM, and the template lint catches all of them statically — run it in CI:
            </p>
            <cl-code-block code="${this.state.lintCmd}" copyable="true"></cl-code-block>
            <p>
                Findings name their check id
                (<code>t7-binding</code>, <code>t8-list-control</code>,
                <code>t9-list-item</code>, <code>t10-inline-events</code>,
                <code>t11-attr-stringify</code>, <code>t12-manual-bind</code>). Suppress one you
                have deliberately decided on with a comment on the line above it:
                <code>&lt;!-- vdx-lint-disable-next-line t11-attr-stringify --&gt;</code>. The full
                table, with what each pattern actually does at runtime, is in
                <a href="https://github.com/iwalton3/vdx-web/blob/main/docs/tutorial.md#banned-patterns">docs/tutorial.md</a>.
            </p>
        `;
    }

    static styles = /*css*/`
        .dd { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
        /* Without min-width:0 a long code line blows the column out past the
           prose width instead of scrolling inside its own block. */
        .dd > div { min-width: 0; }
        @media (max-width: 620px) { .dd { grid-template-columns: 1fr; } }
        .dd .tag { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .dd .dont .tag { color: var(--error-color, #cf222e); }
        .dd .do .tag { color: var(--success-color, #1a7f37); }
    `
}

defineComponent('tut-ch-best', BestPracticesChapter);

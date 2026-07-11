import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class TestingChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 19 · Guides</p>
            <h1>Testing components</h1>
            <p class="lead">
                A component <em>is</em> its element, and its methods and state are right there on it.
                So testing is refreshingly plain: mount it, call a method, read <code>.state</code> or
                the DOM. No hooks, no renderer, no <code>act()</code>.
            </p>

            <h2>Poke it directly</h2>
            <p>
                Because there's no shadow DOM and no wrapper object, you test a component the way you'd
                use it from the outside — the way the <a href="/site/tutorial.html#static">static-integration</a>
                chapter drove components from vanilla JS:
            </p>
            <pre class="ex"><code>const el = document.createElement('shopping-list');
document.body.appendChild(el);        // mounts it

el.addItem('milk');                   // call its methods
assert(el.count === 1);               // read its state / getters
assert(el.textContent.includes('milk'));  // or the rendered DOM

el.remove();                          // native Element.remove() — cleanup</code></pre>
            <p>
                Renders are batched, so if you need the DOM updated <em>before</em> you assert on it,
                wrap the change in <code>flushSync()</code> (chapter 16). Reads of <code>.state</code>
                and getters are synchronous and need no flush.
            </p>

            <tut-live-example
                title="A component testing itself, live"
                base="/site/tutorial/examples/testing"
                files="App.js, index.html"
                activeFile="App.js">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> the harness on the right mounts <code>&lt;shopping-list&gt;</code>,
                drives it, and reports pass/fail — all in the browser, no tooling. Break the
                <code>addItem</code> method in the code and hit Run to watch a test go red.
            </p>

            <div class="callout warn">
                One gotcha: a component <em>is</em> an <code>HTMLElement</code>, so don't name methods
                after native ones — a method called <code>remove()</code> would shadow
                <code>Element.remove()</code>. The example uses <code>addItem</code>/<code>removeItem</code>
                for exactly this reason.
            </div>

            <h2>The bundled test runner</h2>
            <p>
                For a real suite, VDX ships a tiny zero-dependency, in-browser runner
                (<code>describe</code>/<code>it</code>/<code>assert</code>) — it's what the framework
                itself is tested with (~500 tests). You point a headless browser at an HTML page that
                imports your <code>*.test.js</code> files; there's nothing to install.
            </p>
            <div class="callout tip">
                Patterns, the runner API, and how the framework's own suites are wired up are in
                <a href="https://github.com/iwalton3/vdx-web/blob/main/docs/testing.md">docs/testing.md</a>.
            </div>
        `;
    }

    static styles = /*css*/`
        .ex { background: var(--code-bg, rgba(175,184,193,0.15)); border-radius: 8px; padding: 14px 16px; overflow-x: auto; margin: 14px 0; }
        .ex code { background: none; padding: 0; font-size: 0.82em; line-height: 1.6; white-space: pre; }
    `;
}

defineComponent('tut-ch-testing', TestingChapter);

import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class RoutingChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 9 · Building apps</p>
            <h1>Routing</h1>
            <p class="lead">
                Turn components into pages of a single-page app with the built-in router.
            </p>

            <h2>Routes and the outlet</h2>
            <p>
                Place a <code>&lt;router-outlet&gt;</code> where pages should appear, then map URLs
                to components with <code>enableRouting(outlet, routes)</code>. Each route names a
                component; the router swaps the right one into the outlet as the URL changes.
            </p>

            <h2>Links and parameters</h2>
            <p>
                Navigate with <code>&lt;router-link to="/about/"&gt;</code> instead of a plain
                anchor. Dynamic segments like <code>/users/:id/</code> arrive as
                <code>this.props.params.id</code> — declare <code>params</code> in
                <code>static props</code> so the value is exposed.
            </p>

            <tut-live-example
                title="A three-page app"
                base="/site/tutorial/examples/routing"
                files="App.js, index.html">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> click a user to see <code>:id</code> flow into the page,
                then add a new route (say <code>/about/team/</code>) and a
                <code>&lt;router-link&gt;</code> to reach it.
            </p>

            <h2>Programmatic navigation &amp; query strings</h2>
            <p>
                <code>enableRouting()</code> returns the router, so after a form submits or a
                login succeeds you can call
                <code>router.navigate('/search', { q: 'hello' })</code> yourself. Query strings
                arrive as a <code>query</code> prop (declare it in <code>static props</code>, like
                <code>params</code>) — <code>?q=hello&amp;page=2</code> becomes
                <code>this.props.query</code> = <code>{ q: 'hello', page: '2' }</code>, in hash
                and HTML5 mode alike.
            </p>
            <p>
                Navigating to the <em>same</em> component with different params doesn't recreate
                it — the router updates its props, and <code>propsChanged()</code> (chapter 7) is
                where you react, for example by fetching the newly selected item.
            </p>

            <div class="callout">
                Routes can be lazy-loaded (<code>load: () =&gt; import('./page.js')</code>) and
                guarded (<code>require: 'admin'</code> with a <code>checkCapability</code>
                function). Protected routes fail closed — denied unless explicitly allowed.
            </div>
        `;
    }
}

defineComponent('tut-ch-routing', RoutingChapter);

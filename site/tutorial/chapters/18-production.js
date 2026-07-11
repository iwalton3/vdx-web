import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';

class ProductionChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 18 · Guides</p>
            <h1>Shipping to production</h1>
            <p class="lead">
                "No build step" is true all the way to production — you deploy the same files you
                develop with. Here's how to vendor VDX, tidy up the import paths, and (optionally)
                minify and go offline.
            </p>

            <h2>Vendor the framework</h2>
            <p>
                Production means committing VDX into your project — no npm, no install step for a
                teammate or CI to trust. Copy the folders you use into a <code>vdx/</code> directory:
            </p>
            <pre class="ex"><code>your-site/
  index.html
  app.js
  vdx/
    lib/       # the framework (framework.js + core/, router.js, utils.js)
    ui/        # optional: the cl-* component library
    styles/    # optional: theme.css</code></pre>
            <p>
                That's the whole deploy artifact. Clones and updates pull nothing; there's no
                lockfile and nothing to get compromised on <code>npm update</code>, because there is
                no npm.
            </p>

            <h2>Clean import paths with an import map</h2>
            <p>
                You've seen every example import from <code>vdx/lib/framework.js</code>. That bare
                <code>vdx/</code> specifier is resolved by a one-line <strong>import map</strong> —
                the same mechanism this tutorial's live sandbox uses. Declare it once, and every
                module in your app can use the tidy path:
            </p>
            <pre class="ex"><code>&lt;script type="importmap"&gt;
{ "imports": { "vdx/": "/vdx/" } }
&lt;/script&gt;

&lt;script type="module"&gt;
  import { defineComponent, Component, html } from 'vdx/lib/framework.js';
&lt;/script&gt;</code></pre>
            <div class="callout tip">
                Import maps are native to browsers — no tooling required. Point <code>"vdx/"</code> at
                wherever you vendored the folder and every <code>vdx/…</code> import resolves there.
            </div>

            <h2>Optional: the pre-built bundles</h2>
            <p>
                If you'd rather ship a single self-contained file than a folder, the
                <code>dist/</code> bundles are tree-shaken and minified. <code>dist/framework.js</code>
                (~23&nbsp;KB gzipped) has no imports of its own, so one file is all you vendor:
            </p>
            <pre class="ex"><code>import { defineComponent, Component, html } from './vdx/framework.js';</code></pre>
            <p>
                Regenerate them after changing framework source with
                <code>node tools/bundler-esm.js</code>. This is the approach the
                <a href="/site/embedding/">embedding demo</a> uses.
            </p>

            <h2>Optional: the optimizer</h2>
            <p>
                For a production build you can run the <strong>optimizer</strong> over your own source.
                It applies fine-grained reactivity at build time and minifies, emitting a transformed
                copy — your dev files stay untouched:
            </p>
            <pre class="ex"><code># minify + source maps into an output dir
node tools/optimize.js -i ./src -o ./dist -m -s

# just lint: catch contain()/getter capture bugs, no output
node tools/optimize.js -i ./src --lint-only</code></pre>
            <div class="callout">
                The optimizer is entirely opt-in — the un-optimized modules run fine in production.
                Reach for it when you want the smallest, fastest build. Details in
                <a href="https://github.com/iwalton3/vdx-web/blob/main/docs/optimization.md">docs/optimization.md</a>.
            </div>

            <h2>Optional: work offline (PWA)</h2>
            <p>
                Because there's no bundler to content-hash your files, VDX ships a small service-worker
                template (<code>pwa/sw.js</code>) and a manifest generator
                (<code>tools/spider-deps.js</code>) that together give you atomic, versioned offline
                caching — the cache coherency of a bundler without one:
            </p>
            <pre class="ex"><code># hash every file reachable from index.html into a versioned manifest
node tools/spider-deps.js ./your-site .</code></pre>
            <div class="callout tip">
                Copy <code>pwa/sw.js</code> to your app root, point its <code>CONFIG</code> at that
                manifest, and register it. Full walkthrough in
                <a href="https://github.com/iwalton3/vdx-web/blob/main/docs/pwa.md">docs/pwa.md</a>.
            </div>

            <h2>That's the whole pipeline</h2>
            <p>
                Vendor the folder, add an import map, and deploy to any static host. Minify and go
                offline only if you want to. There's no step where a toolchain stands between your
                source and the browser — which is the entire point.
            </p>
        `;
    }

    static styles = /*css*/`
        .ex { background: var(--code-bg, rgba(175,184,193,0.15)); border-radius: 8px; padding: 14px 16px; overflow-x: auto; margin: 14px 0; }
        .ex code { background: none; padding: 0; font-size: 0.82em; line-height: 1.6; white-space: pre; }
    `;
}

defineComponent('tut-ch-production', ProductionChapter);

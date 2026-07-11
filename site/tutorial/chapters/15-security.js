import { defineComponent, html } from '../../../lib/framework.js';
import { TutChapter } from './chapter-base.js';
import '../live-example.js';

class SecurityChapter extends TutChapter {
    template() {
        return html`
            <p class="eyebrow">Chapter 15 · Guides</p>
            <h1>Security &amp; trusted HTML</h1>
            <p class="lead">
                In VDX the safe path is the default one. Everything you interpolate is escaped for
                the context it lands in — you have to go out of your way to render raw HTML at all.
            </p>

            <h2>Escaping is automatic</h2>
            <p>
                When you interpolate a value into a template, the framework escapes it for where it
                lands: text content is HTML-escaped, and <code>href</code>/<code>src</code> URLs are
                run through a scheme allowlist. There is no <code>escapeHtml()</code> call for you to
                remember — and therefore none for you to forget.
            </p>
            <ul>
                <li><strong>Text</strong> — <code>&lt;img onerror&gt;</code> typed by a user renders as literal characters, not an element.</li>
                <li><strong>URLs</strong> — <code>javascript:</code>, <code>data:</code> and <code>vbscript:</code> in a bound <code>href</code>/<code>src</code> collapse to an empty string; <code>http(s)</code>, <code>mailto</code>, <code>tel</code> and friends pass through.</li>
            </ul>

            <tut-live-example
                title="Hostile input, neutralised by default"
                base="/site/tutorial/examples/security"
                files="App.js, index.html"
                activeFile="App.js">
            </tut-live-example>

            <p class="try">
                <strong>Try it:</strong> in box 1, type <code>&lt;b&gt;hi&lt;/b&gt;</code> — it appears
                as text. In box 2, try <code>https://example.com</code> (the link works) then
                <code>javascript:alert(1)</code> (it goes nowhere).
            </p>

            <h2>Opting out with <code>raw()</code></h2>
            <p>
                Sometimes you genuinely have trusted HTML — markup rendered by your own backend, say.
                <code>raw()</code> renders a string as HTML instead of text. It is the one place you
                step outside the default protection, so it is a deliberate, greppable call:
            </p>
            <div class="callout warn">
                Never pass user-controlled data to <code>raw()</code>. <code>raw(userComment)</code>
                is an XSS hole — and because it's a literal <code>raw(...)</code> in your source,
                it's easy to spot in review and to grep for.
            </div>
            <p>
                <code>raw()</code> carries a runtime trust marker (a private <code>Symbol</code>), so
                a plain string arriving from <code>JSON.parse</code> can never masquerade as trusted
                markup — an attacker can't forge it through your data. Box 3 in the demo shows the
                same string rendered both ways: interpolated (escaped to text) and via
                <code>raw()</code> (rendered as markup).
            </p>

            <div class="callout warn">
                Don't hand-build HTML strings to feed <code>raw()</code> either — the moment you do
                <code>raw('&lt;b&gt;' + name + '&lt;/b&gt;')</code> you've re-created the manual-escaping
                bug the framework exists to remove. Compose with templates and let interpolation escape
                for you; reserve <code>raw()</code> for whole trusted fragments.
            </div>

            <h2>What you get for free</h2>
            <ul>
                <li>Context-aware escaping for text, attributes and URLs.</li>
                <li>Scheme allowlisting on <code>href</code>/<code>src</code> (blocks <code>javascript:</code> etc.).</li>
                <li>Symbol-based trust markers so JSON can't spoof <code>raw()</code>.</li>
                <li>No shadow DOM, so every rendered node is inspectable in DevTools if you ever want to audit output.</li>
            </ul>

            <div class="callout tip">
                Full details — attribute handling, <code>data:</code> media rules, CSP guidance — are
                in <a href="https://github.com/iwalton3/vdx-web/blob/main/docs/security.md">docs/security.md</a>.
            </div>
        `;
    }
}

defineComponent('tut-ch-security', SecurityChapter);

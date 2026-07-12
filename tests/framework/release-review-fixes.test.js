/**
 * Regression tests for the pre-release core review fixes (2026-07-12):
 * when() falsy semantics, each()/memoEach() single-pass keying, raw-text
 * parsing (script/style/textarea/title), the <script>-in-template ban,
 * CSS scoping boundary/selector-list handling, and router URL consistency
 * (cancelled-navigation rollback, redirect query merge).
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, when, each, memoEach } from '../../lib/framework.js';
import { Router } from '../../lib/router.js';

const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));

describe('Release review - when() falsy semantics', function(it) {
    it('renders 0 and "" from the non-function form (only null/undefined/false hide)', async () => {
        defineComponent('rr-when-zero', {
            data() { return { n: 0, s: '', u: undefined, f: false }; },
            template() {
                return html`
                    <span id="n">${when(true, this.state.n)}</span>
                    <span id="s">${when(true, this.state.s)}</span>
                    <span id="u">${when(true, this.state.u)}</span>
                    <span id="f">${when(true, this.state.f)}</span>
                `;
            }
        });
        const el = document.createElement('rr-when-zero');
        document.body.appendChild(el);
        await tick();
        assert.equal(el.querySelector('#n').textContent, '0', '0 is a real value and renders');
        assert.equal(el.querySelector('#s').textContent, '', 'empty string renders as empty, not "undefined"');
        assert.equal(el.querySelector('#u').textContent, '', 'undefined renders nothing');
        assert.equal(el.querySelector('#f').textContent, '', 'false renders nothing');
        el.remove();
    });

    it('non-function and function forms agree on 0', async () => {
        defineComponent('rr-when-forms', {
            template() {
                return html`
                    <span id="direct">${when(true, 0)}</span>
                    <span id="fn">${when(true, () => 0)}</span>
                `;
            }
        });
        const el = document.createElement('rr-when-forms');
        document.body.appendChild(el);
        await tick();
        assert.equal(el.querySelector('#direct').textContent, '0', 'non-function form renders 0');
        assert.equal(el.querySelector('#fn').textContent, '0', 'function form renders 0');
        el.remove();
    });
});

describe('Release review - single-pass list keying', function(it) {
    it('each() calls keyFn exactly once per item', () => {
        let calls = 0;
        each([10, 20, 30], (x) => html`<div>${x}</div>`, (x) => { calls++; return x; });
        assert.equal(calls, 3, 'keyFn ran once per item (was twice before the fix)');
    });

    it('memoEach() calls keyFn exactly once per item per render', async () => {
        let calls = 0;
        defineComponent('rr-memo-keys', {
            data() { return { items: [{ id: 'a' }, { id: 'b' }] }; },
            template() {
                return html`<div>${memoEach(this.state.items,
                    (i) => html`<span>${i.id}</span>`,
                    (i) => { calls++; return i.id; })}</div>`;
            }
        });
        const el = document.createElement('rr-memo-keys');
        document.body.appendChild(el);
        await tick();
        assert.equal(calls, 2, 'initial render: keyFn once per item');
        assert.equal(el.querySelectorAll('span').length, 2, 'both rows rendered');
        el.remove();
    });

    it('each() keyed reconciliation still preserves DOM on reorder', async () => {
        defineComponent('rr-each-reorder', {
            data() { return { items: [{ id: 1 }, { id: 2 }] }; },
            template() {
                return html`<div>${each(this.state.items,
                    (i) => html`<p>${i.id}</p>`,
                    (i) => i.id)}</div>`;
            }
        });
        const el = document.createElement('rr-each-reorder');
        document.body.appendChild(el);
        await tick();
        const first = el.querySelector('p');
        first._marker = 'kept';
        el.state.items = [{ id: 2 }, { id: 1 }];
        await tick();
        const rows = el.querySelectorAll('p');
        assert.equal(rows[0].textContent, '2', 'reordered');
        assert.equal(rows[1]._marker, 'kept', 'the id:1 row kept its DOM node');
        el.remove();
    });
});

describe('Release review - raw-text elements', function(it) {
    it('textarea content with < parses as text (RCDATA), entities decoded', async () => {
        defineComponent('rr-rawtext-ta', {
            template() {
                return html`<textarea>if (a < b) &amp; c</textarea>`;
            }
        });
        const el = document.createElement('rr-rawtext-ta');
        document.body.appendChild(el);
        await tick();
        const ta = el.querySelector('textarea');
        assert.ok(ta, 'textarea rendered');
        assert.ok(ta.value.includes('if (a < b) & c'),
            `default value preserved with < and decoded entity (got "${ta.value}")`);
        el.remove();
    });

    it('textarea still takes a ${} text slot', async () => {
        defineComponent('rr-rawtext-ta-slot', {
            data() { return { v: 'seeded' }; },
            template() {
                return html`<textarea>${this.state.v}</textarea>`;
            }
        });
        const el = document.createElement('rr-rawtext-ta-slot');
        document.body.appendChild(el);
        await tick();
        assert.equal(el.querySelector('textarea').value, 'seeded', 'slot value became the default value');
        el.remove();
    });

    it('style content with < parses verbatim (RAWTEXT, no entity decode)', async () => {
        defineComponent('rr-rawtext-style', {
            template() {
                return html`<style>/* a < b, keep &amp; literal */ .rr-noop { color: inherit; }</style><i>x</i>`;
            }
        });
        const el = document.createElement('rr-rawtext-style');
        document.body.appendChild(el);
        await tick();
        const style = el.querySelector('style');
        assert.ok(style, 'style element rendered');
        assert.ok(style.textContent.includes('a < b'), '< preserved inside style');
        assert.ok(style.textContent.includes('&amp;'), 'entities NOT decoded in RAWTEXT content');
        assert.ok(el.querySelector('i'), 'parsing continued past the style element');
        el.remove();
    });

    it('<script> elements are removed from templates and never execute', async () => {
        window.__rrScriptRan = false;
        defineComponent('rr-script-ban', {
            template() {
                return html`<div><script>window.__rrScriptRan = true;</script><span>after</span></div>`;
            }
        });
        const el = document.createElement('rr-script-ban');
        document.body.appendChild(el);
        await tick();
        assert.equal(window.__rrScriptRan, false, 'script did not execute');
        assert.equal(el.querySelector('script'), null, 'script element was dropped');
        assert.ok(el.querySelector('span'), 'siblings render normally');
        el.remove();
        delete window.__rrScriptRan;
    });
});

describe('Release review - CSS scoping', function(it) {
    it('a longer tag name is not mistaken for an already-scoped selector', async () => {
        defineComponent('rr-scope-host', {
            styles: `
                rr-scope-hostile .x { color: red; }
                rr-scope-host .ok { color: green; }
                .a, :is(.b, .c) { color: blue; }
            `,
            template() { return html`<div class="a">s</div>`; }
        });
        const el = document.createElement('rr-scope-host');
        document.body.appendChild(el);
        await tick();
        const styleEl = document.getElementById('component-styles-RR-SCOPE-HOST');
        assert.ok(styleEl, 'component styles injected');
        const css = styleEl.textContent;
        assert.ok(css.includes('rr-scope-host rr-scope-hostile .x'),
            'prefix-similar tag name gets scoped (was left global before the fix)');
        assert.ok(!css.includes('rr-scope-host rr-scope-host .ok'),
            'genuinely self-scoped selector is not double-prefixed');
        assert.ok(css.includes(':is(.b, .c)'),
            'selector list is not split at commas inside :is()');
        assert.ok(css.includes('rr-scope-host .a'), 'plain selectors still get scoped');
        el.remove();
    });
});

describe('Release review - router URL consistency', function(it) {
    it('a cancelled navigation rolls the URL back and never completes', async () => {
        const router = new Router({
            '/rr-ok/': { component: 'rr-ok-page' },
            '/rr-blocked/': { component: 'rr-blocked-page' }
        });
        const afterPaths = [];
        router.beforeEach(({ path }) => path !== '/rr-blocked/');
        router.afterEach(({ path }) => { afterPaths.push(path); });

        router.navigate('/rr-ok/');
        await tick(80);
        assert.equal(window.location.hash, '#/rr-ok/', 'committed navigation set the hash');

        router.navigate('/rr-blocked/');
        await tick(120);
        assert.equal(window.location.hash, '#/rr-ok/',
            'cancelled navigation rolled the hash back to the committed URL');
        assert.ok(!afterPaths.includes('/rr-blocked/'), 'afterEach never fired for the blocked path');
        assert.equal(router.currentRoute.state.path, '/rr-ok/', 'route state untouched');
        router.destroy();
    });

    it('a guard that redirects wins over the rollback', async () => {
        const router = new Router({
            '/rr-login/': { component: 'rr-login-page' },
            '/rr-private/': { component: 'rr-private-page' }
        });
        router.beforeEach(({ path }) => {
            if (path === '/rr-private/') {
                router.navigate('/rr-login/');
                return false;
            }
        });

        router.navigate('/rr-private/');
        await tick(150);
        assert.equal(window.location.hash, '#/rr-login/', 'the guard redirect survived the cancellation');
        assert.equal(router.currentRoute.state.path, '/rr-login/', 'login route rendered');
        router.destroy();
    });

    it('a redirect target with its own query merges with the incoming query', async () => {
        const router = new Router({
            '/rr-from/': { redirect: '/rr-to/?a=1' },
            '/rr-to/': { component: 'rr-to-page' }
        });

        router.navigate('/rr-from/', { b: '2' });
        await tick(120);
        const { path, query } = router.currentRoute.state;
        assert.equal(path, '/rr-to/', 'redirect followed');
        assert.equal(query.a, '1', 'redirect target query kept');
        assert.equal(query.b, '2', 'incoming query preserved');
        router.destroy();
    });
});

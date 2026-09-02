/**
 * Tests for framework footgun guards:
 *   1. Parser rejects lit-html/Vue attribute sigils (.prop ?attr @event :attr)
 *   2. defineComponent rejects methods/computed named after structural DOM
 *      methods (remove, append, ...) and methods colliding with prop names
 *   3. The renderer rejects a raw array of html`` templates in a slot
 *      (i.e. items.map(i => html`...`) instead of each())
 *   4. each()/memoEach() item templates: when() resolves, contain()/memoEach()
 *      and non-template values are refused instead of silently rendering nothing
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, each, memoEach, when, contain, raw, setEffectErrorHandler } from '../../lib/framework.js';
import { instantiateTemplate } from '../../lib/core/template-renderer.js';

// Slot rendering runs inside a reactive effect, so a throw there is reported
// through the framework's normal render-error path (error boundary / console)
// rather than propagating out synchronously. Capture it via the effect error
// handler so we can assert on the message. Restores the default (null) handler.
function captureRenderError(fn) {
    let captured = null;
    setEffectErrorHandler((err) => { captured = err; });
    try { fn(); } finally { setEffectErrorHandler(null); }
    return captured;
}

// Assert fn throws AND the message contains `substr`. assert.throws only checks
// the error type, but the whole point of these guards is a helpful message.
function throwsWith(fn, substr, message) {
    let err = null;
    try { fn(); } catch (e) { err = e; }
    assert.ok(err, `${message} - expected a throw but none happened`);
    assert.ok(
        String(err.message).includes(substr),
        `${message} - message should include "${substr}", got: ${err && err.message}`
    );
}

describe('Guard 1: parser rejects lit/Vue attribute sigils', function(it) {
    it('throws on ?attr (lit boolean binding)', () => {
        throwsWith(
            () => html`<button ?disabled="${true}">x</button>`,
            'is not a valid attribute name',
            '?disabled should be rejected'
        );
    });

    it('throws on @event (lit/Vue event binding) and points at on-*', () => {
        throwsWith(
            () => html`<button @click="${() => {}}">x</button>`,
            'on-click',
            '@click should be rejected with an on-* hint'
        );
    });

    it('throws on .prop (lit property binding)', () => {
        throwsWith(
            () => html`<input .value="${'a'}">`,
            'is not a valid attribute name',
            '.value should be rejected'
        );
    });

    it('throws on :attr (Vue bind shorthand)', () => {
        throwsWith(
            () => html`<a :href="${'/x'}">x</a>`,
            'is not a valid attribute name',
            ':href should be rejected'
        );
    });

    it('does NOT throw on valid VDX attributes', () => {
        // plain boolean-from-value, on-*, url, data-*, and a mid-name colon
        // (SVG/XML namespaced names carry the colon in the middle, not at [0])
        assert.throws(() => { throw new Error('sentinel'); }, Error); // sanity: throws works
        const ok = html`<button disabled="${false}" on-click="${() => {}}"
            data-id="1" class="a"><use xlink:href="#x"></use></button>`;
        assert.ok(ok && ok._compiled, 'valid template should compile without throwing');
    });

    it('does NOT throw when a sigil appears inside an attribute VALUE', () => {
        const ok = html`<a href="?q=1&amp;p=2">link</a>`;
        assert.ok(ok && ok._compiled, 'sigils in values are fine');
    });
});

describe('Guard 2: defineComponent rejects reserved/colliding member names', function(it) {
    it('throws when a method is named after a structural DOM method (remove)', () => {
        throwsWith(
            () => defineComponent('guard-remove-method', {
                methods: { remove() {} },
                template() { return html`<div></div>`; }
            }),
            'native DOM method',
            'method remove() should be rejected'
        );
    });

    it('throws for other structural/attr/event DOM names (append, dispatchEvent)', () => {
        throwsWith(
            () => defineComponent('guard-append-method', {
                methods: { append() {} }, template() { return html`<div></div>`; }
            }),
            'Element.append',
            'method append() should be rejected'
        );
        throwsWith(
            () => defineComponent('guard-dispatch-method', {
                methods: { dispatchEvent() {} }, template() { return html`<div></div>`; }
            }),
            'Element.dispatchEvent',
            'method dispatchEvent() should be rejected'
        );
    });

    it('throws when a computed is named after a DOM method', () => {
        throwsWith(
            () => defineComponent('guard-remove-computed', {
                computed: { remove() { return 1; } },
                template() { return html`<div></div>`; }
            }),
            'native DOM method',
            'computed remove should be rejected'
        );
    });

    it('does NOT throw for behavioral DOM methods a component may override (focus, click)', () => {
        // focus/blur/click/scrollIntoView are deliberately NOT in the reserved
        // set - a custom element can legitimately expose them.
        defineComponent('guard-focus-ok', {
            methods: { focus() {}, click() {}, scrollIntoView() {} },
            template() { return html`<div></div>`; }
        });
        assert.ok(customElements.get('guard-focus-ok'), 'focus/click methods should be allowed');
    });

    it('throws when a method collides with a prop name', () => {
        throwsWith(
            () => defineComponent('guard-method-prop-clash', {
                props: { value: '' },
                methods: { value() {} },
                template() { return html`<div></div>`; }
            }),
            'a prop with the same',
            'method colliding with a prop should be rejected'
        );
    });

    it('does NOT throw for ordinary method + prop names', () => {
        defineComponent('guard-ok-members', {
            props: { label: '' },
            methods: { doThing() {} },
            computed: { shout() { return this.props.label.toUpperCase(); } },
            template() { return html`<div></div>`; }
        });
        assert.ok(customElements.get('guard-ok-members'), 'ordinary members should be allowed');
    });
});

describe('Guard 3: renderer rejects a raw array of templates in a slot', function(it) {
    it('reports a bare array of html`` templates as a render error (the .map() footgun)', () => {
        const err = captureRenderError(() => {
            const tpl = html`<ul>${[html`<li>a</li>`, html`<li>b</li>`]}</ul>`;
            instantiateTemplate(tpl._compiled, tpl._values || [], null);
        });
        assert.ok(err, 'a raw template array should raise a render error');
        assert.ok(
            String(err.message).includes('each('),
            `error should hint at each(), got: ${err && err.message}`
        );
    });

    it('reports items.map(() => html``) results as a render error', () => {
        const items = [1, 2, 3];
        const err = captureRenderError(() => {
            const tpl = html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`;
            instantiateTemplate(tpl._compiled, tpl._values || [], null);
        });
        assert.ok(err, '.map() of templates should raise a render error');
        assert.ok(
            String(err.message).includes('not supported'),
            `error should explain it is not supported, got: ${err && err.message}`
        );
    });

    it('reports a contain() or memoEach() inside a slot array as a render error', () => {
        // Neither has a slot of its own inside an array to own its state (the
        // boundary effect, the memo cache), and stringifying the marker rendered
        // "[object Object]" as text - an element rendered as text is never right.
        for (const [label, item] of [
            ['contain', contain(() => html`<b>c</b>`)],
            ['memoEach', memoEach([1], i => html`<li>${i}</li>`, i => i)]
        ]) {
            const err = captureRenderError(() => {
                const tpl = html`<div>${['text', item]}</div>`;
                instantiateTemplate(tpl._compiled, tpl._values || [], null);
            });
            assert.ok(err, `${label}() inside an array should raise a render error`);
            assert.ok(
                String(err.message).includes(label + '('),
                `error should name ${label}(), got: ${err && err.message}`
            );
        }
    });

    it('resolves a when() item of a slot array to its branch, and flattens a nested array', () => {
        // A function-form when() is an html-marked marker: it used to trip the
        // array-of-templates refusal with a message about each(), or be handed
        // to the renderer as a marker inside a contain() boundary. A nested
        // array is its items, as the outer one is.
        const tpl = html`<div>${['a', when(true, () => 'b'), when(false, () => 'c'), ['d', 'e']]}</div>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.equal(fragment.querySelector('div').textContent, 'abde',
            'true branch renders, false branch is no item, nested items render');
    });

    it('resolves a when() item whose branch is an array, and refuses what is inside it', () => {
        // The branch is only an array AFTER the when() resolves, so a walk that
        // flattens before it resolves never sees these items: they reached
        // materialize() as a whole array and were stringified - "a,b" for
        // primitives, "" for templates, "[contain]" for a marker - past the two
        // refusals below, which exist to make exactly that impossible.
        const tpl = html`<div>${['x', when(true, () => ['a', 'b']), 'y']}</div>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.equal(fragment.querySelector('div').textContent, 'xaby',
            'the branch is its items, not String(array)');

        const errHtml = captureRenderError(() => {
            const t = html`<div>${['x', when(true, () => [html`<b>1</b>`, html`<b>2</b>`])]}</div>`;
            instantiateTemplate(t._compiled, t._values || [], null);
        });
        assert.ok(errHtml && String(errHtml.message).includes('each('),
            `templates inside the branch should still hit the array refusal, got: ${errHtml && errHtml.message}`);

        const errMarker = captureRenderError(() => {
            const t = html`<div>${['x', when(true, () => [contain(() => 'c')])]}</div>`;
            instantiateTemplate(t._compiled, t._values || [], null);
        });
        assert.ok(errMarker && String(errMarker.message).includes('contain('),
            `contain() inside the branch should still be refused, got: ${errMarker && errMarker.message}`);
    });

    it('resolves a when() in attribute position to its branch', () => {
        const tpl = html`<div class="${when(true, () => 'on', () => 'off')}" title="${when(false, () => 'x')}"></div>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        const div = fragment.querySelector('div');
        assert.equal(div.getAttribute('class'), 'on', 'the selected branch, not "[when]"');
        assert.equal(div.hasAttribute('title'), false, 'an empty branch is nothing, not "[when]"');
    });

    it('does NOT throw for each()', () => {
        const tpl = html`<ul>${each([1, 2, 3], i => html`<li>${i}</li>`, i => i)}</ul>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.ok(fragment.querySelectorAll('li').length === 3, 'each() should render 3 rows');
    });

    it('does NOT throw for an array of primitives', () => {
        // Not an endorsement - a bare array in markup is an anti-pattern (see
        // docs/templates.md, "Never interpolate a bare array into markup"): it
        // renders as joined text and then goes stale, because the slot compares
        // arrays by reference. This path must stay open regardless, because
        // props.children and named slots are arrays in markup position too.
        const tpl = html`<div>${[1, 2, 3]}</div>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.equal(fragment.textContent, '123', 'primitive arrays render as joined text');
    });
});


describe('Guard 4: each() item templates reject values it cannot render', function(it) {
    // Regression: a lazy directive keeps its payload on the marker and only a
    // stub in _compiled, so each() used to flatten the item down to an empty
    // slot - the list rendered nothing at all, with no error. when() is now
    // resolved to its branch; contain()/memoEach() need a slot of their own and
    // are refused.

    it('renders function-form when() as an each() item', () => {
        const rows = [{ id: 1, hot: true }, { id: 2, hot: false }];
        const tpl = html`<ul>${each(rows, r =>
            when(r.hot, () => html`<li class="hot">${r.id}</li>`, () => html`<li>${r.id}</li>`),
            r => r.id)}</ul>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.equal(fragment.querySelectorAll('li').length, 2, 'both rows render');
        assert.equal(fragment.querySelectorAll('li.hot').length, 1, 'the true branch is used for row 1');
    });

    it('renders nested function-form when() as an each() item', () => {
        const tpl = html`<ul>${each([1], i =>
            when(true, () => when(true, () => html`<li>${i}</li>`)), i => i)}</ul>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.equal(fragment.querySelectorAll('li').length, 1, 'nested when() resolves');
    });

    it('renders nothing (but keeps the key) for a when() with no matching branch', () => {
        const tpl = html`<ul>${each([{ id: 1, show: false }], r =>
            when(r.show, () => html`<li>${r.id}</li>`), r => r.id)}</ul>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.equal(fragment.querySelectorAll('li').length, 0, 'no branch means no DOM');
    });

    it('resolves when() inside memoEach() items too', () => {
        const rows = [{ id: 1, hot: true }, { id: 2, hot: false }];
        const tpl = html`<ul>${memoEach(rows, r =>
            when(r.hot, () => html`<li class="hot">${r.id}</li>`, () => html`<li>${r.id}</li>`),
            r => r.id)}</ul>`;
        const err = captureRenderError(() => {
            const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
            assert.equal(fragment.querySelectorAll('li').length, 2, 'both rows render');
            assert.equal(fragment.querySelectorAll('li.hot').length, 1, 'true branch used');
        });
        assert.ok(!err, `memoEach + when() should not error, got: ${err && err.message}`);
    });

    it('throws for a bare contain() item and points at a wrapper', () => {
        throwsWith(
            () => each([1], i => contain(() => html`<li>${i}</li>`), i => i),
            'needs a slot to own',
            'bare contain() as an item template should be rejected'
        );
    });

    it('throws for a bare memoEach() item', () => {
        throwsWith(
            () => each([[1, 2]], rows => memoEach(rows, r => html`<li>${r}</li>`, r => r), (_, i) => i),
            'memoEach() cannot be a list item template',
            'bare memoEach() as an item template should be rejected'
        );
    });

    it('accepts contain()/memoEach() wrapped in a template', () => {
        const tpl = html`<ul>${each([[1, 2]], rows =>
            html`<li>${memoEach(rows, r => html`<b>${r}</b>`, r => r)}</li>`, (_, i) => i)}</ul>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.equal(fragment.querySelectorAll('li b').length, 2, 'wrapped memoEach renders');
    });

    it('throws for a non-template item value', () => {
        throwsWith(
            () => each(['a', 'b'], s => s, s => s),
            'must return an html`` template',
            'a bare string item should be rejected'
        );
        throwsWith(
            () => each([1], i => raw('<li>x</li>'), i => i),
            'raw() value',
            'a raw() item should be rejected'
        );
    });

    it('reports the same guard through the effect path for memoEach()', () => {
        // each() runs inside template(), so its throw reaches the component's
        // renderError() boundary. memoEach() defers mapFn into the slot effect,
        // so the SAME guard surfaces through the effect error handler instead -
        // console, not error boundary. Loud either way; the routing differs,
        // which is the framework's behaviour for every slot-level guard.
        const tpl = html`<ul>${memoEach([1], x => x, x => x)}</ul>`;
        const err = captureRenderError(() => {
            instantiateTemplate(tpl._compiled, tpl._values || [], null);
        });
        assert.ok(err, 'the memoEach guard should raise a render error');
        assert.ok(
            String(err.message).includes('must return an html`` template'),
            `effect path should carry the same message, got: ${err && err.message}`
        );
    });

    it('still skips null/undefined/false items silently', () => {
        const tpl = html`<ul>${each([1, 2, 3], i =>
            i === 2 ? null : html`<li>${i}</li>`, i => i)}</ul>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.equal(fragment.querySelectorAll('li').length, 2, 'null items are skipped, not fatal');
    });
});

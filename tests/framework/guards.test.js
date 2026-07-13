/**
 * Tests for framework footgun guards:
 *   1. Parser rejects lit-html/Vue attribute sigils (.prop ?attr @event :attr)
 *   2. defineComponent rejects methods/computed named after structural DOM
 *      methods (remove, append, ...) and methods colliding with prop names
 *   3. The renderer rejects a raw array of html`` templates in a slot
 *      (i.e. items.map(i => html`...`) instead of each())
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, each, setEffectErrorHandler } from '../../lib/framework.js';
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

    it('does NOT throw for each()', () => {
        const tpl = html`<ul>${each([1, 2, 3], i => html`<li>${i}</li>`, i => i)}</ul>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.ok(fragment.querySelectorAll('li').length === 3, 'each() should render 3 rows');
    });

    it('does NOT throw for an array of primitives', () => {
        // Only template arrays are the footgun; primitive arrays just join as text.
        const tpl = html`<div>${[1, 2, 3]}</div>`;
        const { fragment } = instantiateTemplate(tpl._compiled, tpl._values || [], null);
        assert.equal(fragment.textContent, '123', 'primitive arrays render as joined text');
    });
});

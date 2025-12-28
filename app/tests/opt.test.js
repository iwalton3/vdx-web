/**
 * opt() - Source Mangling Tests
 *
 * Tests the opt() function for fine-grained reactivity optimization.
 */

import { describe, assert } from './test-runner.js';
import { opt, convertArrowToFunction, extractExpressions, shouldSkipWrapping, mangleTemplateSource } from '../lib/opt.js';
import { html, defineComponent, flushRenders } from '../lib/framework.js';

describe('opt() - Arrow Function Conversion', function(it) {

    it('converts expression arrow function to regular function', async () => {
        const result = convertArrowToFunction('() => html`<div></div>`');
        assert.equal(result, 'function() { return html`<div></div>`; }');
    });

    it('converts block arrow function to regular function', async () => {
        const result = convertArrowToFunction('() => { return html`<div></div>`; }');
        assert.equal(result, 'function() { return html`<div></div>`; }');
    });

    it('preserves regular function syntax', async () => {
        const result = convertArrowToFunction('function() { return html`<div></div>`; }');
        assert.equal(result, 'function() { return html`<div></div>`; }');
    });

    it('handles whitespace in arrow functions', async () => {
        const result = convertArrowToFunction('(  )  =>  html`<div></div>`');
        assert.equal(result, 'function() { return html`<div></div>`; }');
    });

});

describe('opt() - Expression Extraction', function(it) {

    it('extracts simple expression', async () => {
        const source = 'html`<div>${this.state.count}</div>`';
        const expressions = extractExpressions(source);
        assert.equal(expressions.length, 1);
        assert.equal(expressions[0].expr, 'this.state.count');
    });

    it('extracts multiple expressions', async () => {
        const source = 'html`<div>${this.state.a} and ${this.state.b}</div>`';
        const expressions = extractExpressions(source);
        assert.equal(expressions.length, 2);
        assert.equal(expressions[0].expr, 'this.state.a');
        assert.equal(expressions[1].expr, 'this.state.b');
    });

    it('handles nested braces in expressions', async () => {
        const source = 'html`<div>${this.state.items.filter(x => x.active)}</div>`';
        const expressions = extractExpressions(source);
        assert.equal(expressions.length, 1);
        assert.equal(expressions[0].expr, 'this.state.items.filter(x => x.active)');
    });

    it('handles object literals in expressions', async () => {
        const source = 'html`<div>${{ a: 1, b: 2 }}</div>`';
        const expressions = extractExpressions(source);
        assert.equal(expressions.length, 1);
        assert.equal(expressions[0].expr, '{ a: 1, b: 2 }');
    });

    it('handles string literals in expressions', async () => {
        const source = 'html`<div>${this.state.msg || "default"}</div>`';
        const expressions = extractExpressions(source);
        assert.equal(expressions.length, 1);
        assert.equal(expressions[0].expr, 'this.state.msg || "default"');
    });

    it('handles nested template literals', async () => {
        const source = 'html`<div>${this.state.items.map(x => `${x.name}`)}</div>`';
        const expressions = extractExpressions(source);
        assert.equal(expressions.length, 1);
        // Should extract the entire map expression including nested template
        assert.ok(expressions[0].expr.includes('map'));
        assert.ok(expressions[0].expr.includes('x.name'));
    });

    it('handles expressions with single quotes', async () => {
        const source = "html`<div>${this.state.msg || 'fallback'}</div>`";
        const expressions = extractExpressions(source);
        assert.equal(expressions.length, 1);
        assert.equal(expressions[0].expr, "this.state.msg || 'fallback'");
    });

});

describe('opt() - Skip Wrapping Rules', function(it) {

    it('skips contain() expressions', async () => {
        assert.equal(shouldSkipWrapping('contain(() => this.state.x)'), true);
    });

    it('skips raw() expressions', async () => {
        assert.equal(shouldSkipWrapping('raw(this.state.html)'), true);
    });

    it('skips html.contain() expressions', async () => {
        assert.equal(shouldSkipWrapping('html.contain(() => this.state.x)'), true);
    });

    it('skips arrow functions with no params', async () => {
        assert.equal(shouldSkipWrapping('() => this.state.count'), true);
    });

    it('skips arrow functions with params', async () => {
        assert.equal(shouldSkipWrapping('(item) => item.name'), true);
        assert.equal(shouldSkipWrapping('item => item.name'), true);
    });

    it('skips arrow functions with multiple params', async () => {
        assert.equal(shouldSkipWrapping('(a, b) => a + b'), true);
    });

    it('skips function expressions', async () => {
        assert.equal(shouldSkipWrapping('function() { return x; }'), true);
        assert.equal(shouldSkipWrapping('function foo() { return x; }'), true);
    });

    it('skips async arrow functions', async () => {
        assert.equal(shouldSkipWrapping('async () => await fetch()'), true);
        assert.equal(shouldSkipWrapping('async x => await x.load()'), true);
    });

    it('skips async function expressions', async () => {
        assert.equal(shouldSkipWrapping('async function() { return await x; }'), true);
    });

    it('does NOT skip simple expressions', async () => {
        assert.equal(shouldSkipWrapping('this.state.count'), false);
        assert.equal(shouldSkipWrapping('this.state.a + this.state.b'), false);
        assert.equal(shouldSkipWrapping('when(this.state.loading, html`...`)'), false);
        assert.equal(shouldSkipWrapping('each(this.state.items, item => html`...`)'), false);
    });

});

describe('opt() - Source Mangling', function(it) {

    it('wraps simple expression in html.contain', async () => {
        const source = 'function() { return html`<div>${this.state.count}</div>`; }';
        const result = mangleTemplateSource(source);
        assert.ok(result.includes('html.contain(() => (this.state.count))'));
    });

    it('wraps multiple expressions', async () => {
        const source = 'function() { return html`<div>${this.state.a} and ${this.state.b}</div>`; }';
        const result = mangleTemplateSource(source);
        assert.ok(result.includes('html.contain(() => (this.state.a))'));
        assert.ok(result.includes('html.contain(() => (this.state.b))'));
    });

    it('wraps when() for isolation', async () => {
        const source = 'function() { return html`<div>${when(this.state.loading, html`...`)}</div>`; }';
        const result = mangleTemplateSource(source);
        assert.ok(result.includes('html.contain(() => (when(this.state.loading'));
    });

    it('wraps each() for isolation', async () => {
        const source = 'function() { return html`<div>${each(this.state.items, item => html`...`)}</div>`; }';
        const result = mangleTemplateSource(source);
        assert.ok(result.includes('html.contain(() => (each(this.state.items'));
    });

    it('does NOT wrap contain()', async () => {
        const source = 'function() { return html`<div>${contain(() => this.state.x)}</div>`; }';
        const result = mangleTemplateSource(source);
        // Should NOT have double-wrapping
        assert.ok(!result.includes('html.contain(() => (contain('));
        // Original contain should remain
        assert.ok(result.includes('contain(() => this.state.x)'));
    });

    it('does NOT wrap arrow functions', async () => {
        const source = 'function() { return html`<div>${() => this.state.x}</div>`; }';
        const result = mangleTemplateSource(source);
        // Should NOT wrap the arrow function
        assert.ok(!result.includes('html.contain(() => (()'));
    });

    it('handles complex nested expressions', async () => {
        const source = 'function() { return html`<div>${this.state.items.filter(x => x.active).length}</div>`; }';
        const result = mangleTemplateSource(source);
        assert.ok(result.includes('html.contain(() => (this.state.items.filter(x => x.active).length))'));
    });

});

describe('opt() - Full Function', function(it) {

    it('returns a string', async () => {
        const result = opt(() => html`<div>test</div>`);
        assert.equal(typeof result, 'string');
    });

    it('returns parenthesized function string', async () => {
        const result = opt(() => html`<div>test</div>`);
        assert.ok(result.startsWith('('));
        assert.ok(result.endsWith(')'));
    });

    it('converts arrow to regular function', async () => {
        const result = opt(() => html`<div>test</div>`);
        assert.ok(result.includes('function()'));
        assert.ok(!result.includes('=>'));
    });

    it('wraps expressions in html.contain', async () => {
        const result = opt(function() {
            return html`<div>${this.state.count}</div>`;
        });
        assert.ok(result.includes('html.contain(() => (this.state.count))'));
    });

    it('can be evaled to a function', async () => {
        const result = opt(() => html`<div>test</div>`);
        const fn = eval(result);
        assert.equal(typeof fn, 'function');
    });

});

describe('opt() - Integration with Components', function(it) {

    it('works with attribute expressions', async () => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        try {
            defineComponent('opt-test-attr', {
                data() {
                    return { className: 'initial', href: '/test' };
                },
                template: eval(opt(function() {
                    return html`<a class="${this.state.className}" href="${this.state.href}">Link</a>`;
                }))
            });

            const el = document.createElement('opt-test-attr');
            container.appendChild(el);

            flushRenders();

            const link = el.querySelector('a');
            assert.ok(link, 'Should find link element');
            assert.equal(link.className, 'initial');
            assert.equal(link.getAttribute('href'), '/test');

            // Update state
            el.state.className = 'updated';
            el.state.href = '/new-path';
            flushRenders();

            assert.equal(link.className, 'updated');
            assert.equal(link.getAttribute('href'), '/new-path');

        } finally {
            container.remove();
        }
    });

    it('works with custom element prop expressions', async () => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        try {
            // Create a simple custom element to receive props
            defineComponent('opt-test-receiver', {
                props: { value: 0, label: '' },
                template() {
                    return html`<span class="value">${this.props.value}</span><span class="label">${this.props.label}</span>`;
                }
            });

            defineComponent('opt-test-custom-props', {
                data() {
                    return { count: 42, text: 'Hello' };
                },
                template: eval(opt(function() {
                    return html`<opt-test-receiver value="${this.state.count}" label="${this.state.text}"></opt-test-receiver>`;
                }))
            });

            const el = document.createElement('opt-test-custom-props');
            container.appendChild(el);

            flushRenders();

            const receiver = el.querySelector('opt-test-receiver');
            assert.ok(receiver, 'Should find receiver element');
            assert.equal(receiver.props.value, 42);
            assert.equal(receiver.props.label, 'Hello');

            // Update state
            el.state.count = 100;
            el.state.text = 'World';
            flushRenders();

            assert.equal(receiver.props.value, 100);
            assert.equal(receiver.props.label, 'World');

        } finally {
            container.remove();
        }
    });

    it('works with defineComponent template', async () => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        try {
            // Verify html.contain exists
            assert.ok(typeof html.contain === 'function', 'html.contain should be a function');

            defineComponent('opt-test-simple', {
                data() {
                    return { count: 0 };
                },
                template: eval(opt(function() {
                    return html`<div class="count">${this.state.count}</div>`;
                }))
            });

            const el = document.createElement('opt-test-simple');
            container.appendChild(el);

            flushRenders();

            const countEl = el.querySelector('.count');
            assert.ok(countEl, 'Should find .count element');
            assert.equal(countEl.textContent, '0');

            // Update state
            el.state.count = 42;
            flushRenders();

            assert.equal(countEl.textContent, '42');

        } finally {
            container.remove();
        }
    });

    it('works with arrow function syntax', async () => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        try {
            defineComponent('opt-test-arrow', {
                data() {
                    return { name: 'World' };
                },
                template: eval(opt(() => html`<div class="greeting">Hello ${this.state.name}</div>`))
            });

            const el = document.createElement('opt-test-arrow');
            container.appendChild(el);

            flushRenders();

            const greetingEl = el.querySelector('.greeting');
            assert.ok(greetingEl, 'Should find .greeting element');
            assert.ok(greetingEl.textContent.includes('Hello'), 'Should contain Hello');
            assert.ok(greetingEl.textContent.includes('World'), 'Should contain World');

        } finally {
            container.remove();
        }
    });

});

/**
 * Security Tests
 * Tests for prototype pollution prevention and other security measures
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, createStore, Component } from '../../lib/framework.js';

describe('Prototype Pollution Prevention', function(it) {
    it('blocks __proto__ in x-model paths', (done) => {
        const originalProto = Object.prototype.polluted;

        const TestComponent = defineComponent('test-proto-xmodel', {
            data() {
                return {
                    nested: { value: 'safe' }
                };
            },
            template() {
                return html`
                    <input type="text" id="safe-input" x-model="nested.value">
                    <input type="text" id="dangerous-input" x-model="__proto__.polluted">
                `;
            }
        });

        const el = document.createElement('test-proto-xmodel');
        document.body.appendChild(el);

        setTimeout(() => {
            const dangerousInput = el.querySelector('#dangerous-input');

            // Try to pollute via input
            dangerousInput.value = 'POLLUTED';
            dangerousInput.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                // Verify Object.prototype was NOT polluted
                assert.equal(Object.prototype.polluted, originalProto,
                    'Object.prototype should not be polluted via x-model');
                assert.equal({}.polluted, originalProto,
                    'New objects should not have polluted property');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('blocks constructor in x-model paths', (done) => {
        const TestComponent = defineComponent('test-constructor-xmodel', {
            data() {
                return { value: 'safe' };
            },
            template() {
                return html`
                    <input type="text" x-model="constructor.prototype.polluted">
                `;
            }
        });

        const el = document.createElement('test-constructor-xmodel');
        document.body.appendChild(el);

        setTimeout(() => {
            const input = el.querySelector('input');
            input.value = 'POLLUTED';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                assert.equal(Object.prototype.polluted, undefined,
                    'Object.prototype should not be polluted via constructor path');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('blocks nested __proto__ in x-model paths', (done) => {
        const TestComponent = defineComponent('test-nested-proto', {
            data() {
                return {
                    deep: { nested: { value: 'safe' } }
                };
            },
            template() {
                return html`
                    <input type="text" x-model="deep.__proto__.polluted">
                `;
            }
        });

        const el = document.createElement('test-nested-proto');
        document.body.appendChild(el);

        setTimeout(() => {
            const input = el.querySelector('input');
            input.value = 'POLLUTED';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                assert.equal({}.polluted, undefined,
                    'Object.prototype should not be polluted via nested path');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });

    it('blocks prototype pollution in store.set()', () => {
        const store = createStore({ count: 0 });

        // Try to pollute via set
        store.set({
            count: 1,
            __proto__: { polluted: 'via-set' }
        });

        assert.equal({}.polluted, undefined,
            'Object.prototype should not be polluted via store.set()');
        assert.equal(store.state.count, 1, 'Normal properties should still work');
    });

    it('blocks prototype pollution in store.update()', () => {
        const store = createStore({ count: 0 });

        // Try to pollute via update
        store.update(() => ({
            count: 2,
            __proto__: { polluted: 'via-update' }
        }));

        assert.equal({}.polluted, undefined,
            'Object.prototype should not be polluted via store.update()');
        assert.equal(store.state.count, 2, 'Normal properties should still work');
    });

    it('blocks constructor.prototype in store operations', () => {
        const store = createStore({ data: {} });

        store.set({
            data: { value: 'test' },
            constructor: { prototype: { polluted: 'via-constructor' } }
        });

        assert.equal({}.polluted, undefined,
            'Object.prototype should not be polluted via constructor path in store');
    });

    it('allows safe nested property updates', (done) => {
        const TestComponent = defineComponent('test-safe-nested', {
            data() {
                return {
                    user: {
                        profile: {
                            name: 'Alice'
                        }
                    }
                };
            },
            template() {
                return html`
                    <input type="text" x-model="user.profile.name">
                    <span id="output">${this.state.user.profile.name}</span>
                `;
            }
        });

        const el = document.createElement('test-safe-nested');
        document.body.appendChild(el);

        setTimeout(() => {
            const input = el.querySelector('input');
            input.value = 'Bob';
            input.dispatchEvent(new Event('input', { bubbles: true }));

            setTimeout(() => {
                assert.equal(el.state.user.profile.name, 'Bob',
                    'Safe nested updates should work');

                document.body.removeChild(el);
                done();
            }, 50);
        }, 100);
    });
});

describe('XSS Prevention', function(it) {
    it('escapes HTML in template interpolation', (done) => {
        const TestComponent = defineComponent('test-xss-escape', {
            data() {
                return {
                    userInput: '<script>alert("XSS")</script>'
                };
            },
            template() {
                return html`<div id="output">${this.state.userInput}</div>`;
            }
        });

        const el = document.createElement('test-xss-escape');
        document.body.appendChild(el);

        setTimeout(() => {
            const output = el.querySelector('#output');
            // Should be escaped, not executed
            assert.ok(!output.innerHTML.includes('<script>'),
                'Script tags should be escaped');
            assert.ok(output.textContent.includes('<script>'),
                'Script text should be visible as text');

            document.body.removeChild(el);
            done();
        }, 100);
    });

    it('escapes HTML attributes', (done) => {
        const TestComponent = defineComponent('test-xss-attr', {
            data() {
                return {
                    userAttr: '" onclick="alert(1)"'
                };
            },
            template() {
                return html`<div id="output" title="${this.state.userAttr}">Test</div>`;
            }
        });

        const el = document.createElement('test-xss-attr');
        document.body.appendChild(el);

        setTimeout(() => {
            const output = el.querySelector('#output');
            // Should not have onclick attribute
            assert.ok(!output.hasAttribute('onclick'),
                'Should not create onclick attribute from escaped value');

            document.body.removeChild(el);
            done();
        }, 100);
    });
});

describe('XSS Prevention - attribute sink hardening (adversarial review)', function(it) {
    const mount = (tag) => { const el = document.createElement(tag); document.body.appendChild(el); return el; };
    const settle = () => new Promise(r => setTimeout(r, 60));

    it('refuses innerHTML/srcdoc set from a template', async () => {
        defineComponent('sec-inner', class extends Component {
            constructor(p){ super(p); this.state = { h: '<img src=x onerror="window.__secInner=1">' }; }
            template(){ return html`<div innerHTML="${this.state.h}"></div><iframe srcdoc="${this.state.h}"></iframe>`; }
        });
        window.__secInner = 0;
        const el = mount('sec-inner'); await settle(); await settle();
        assert.ok(!el.querySelector('div').querySelector('img'), 'innerHTML refused');
        assert.equal(el.querySelector('iframe').getAttribute('srcdoc'), null, 'srcdoc refused');
        assert.equal(window.__secInner, 0, 'no script executed');
    });

    it('sanitizes javascript: on formaction/object-data/xlink:href (string AND non-string)', async () => {
        defineComponent('sec-url', class extends Component {
            constructor(p){ super(p); this.state = {
                s: 'javascript:alert(1)',
                arr: ['javascript:alert(2)']          // non-string from JSON
            }; }
            template(){ return html`
                <form><button formaction="${this.state.s}">a</button><button formaction="${this.state.arr}">b</button></form>
                <object data="${this.state.s}"></object>`; }
        });
        const el = mount('sec-url'); await settle();
        const btns = el.querySelectorAll('button');
        assert.ok(!(btns[0].getAttribute('formaction') || '').includes('javascript:'), 'string formaction sanitized');
        assert.ok(!(btns[1].getAttribute('formaction') || '').includes('javascript:'), 'non-string formaction sanitized');
        assert.ok(!(el.querySelector('object').getAttribute('data') || '').includes('javascript:'), 'object data sanitized');
    });

    it('does NOT mangle a data property on a non-object element/component', async () => {
        if (!customElements.get('sec-data-recv')) {
            customElements.define('sec-data-recv', class extends HTMLElement {
                set data(v){ this._d = v; } get data(){ return this._d; }
            });
        }
        defineComponent('sec-data-host', class extends Component {
            constructor(p){ super(p); this.state = { rows: [1, 2, 3] }; }
            template(){ return html`<sec-data-recv data="${this.state.rows}"></sec-data-recv>`; }
        });
        const el = mount('sec-data-host'); await settle();
        assert.deepEqual(el.querySelector('sec-data-recv').data, [1, 2, 3], 'array data prop passes through untouched');
    });
});

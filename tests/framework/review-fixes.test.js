/**
 * Regression tests for the pre-v1 full-review fixes (parser, renderer,
 * utils, reactivity seams). Each test pins a defect found by the 2026-07-12
 * core review; see the commit message for the full list.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, each, createStore } from '../../lib/framework.js';
import { rafThrottle, relativeTime, eventBus } from '../../lib/utils.js';

const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));

describe('Review fixes - parser', function(it) {
    it('an unquoted slot attribute does not swallow the following attribute', async () => {
        defineComponent('rf-unquoted-slot', {
            data() { return { cls: 'from-slot' }; },
            template() {
                return html`<div class=${this.state.cls} id="kept">x</div>`;
            }
        });
        const el = document.createElement('rf-unquoted-slot');
        document.body.appendChild(el);
        await tick();
        const div = el.querySelector('#kept');
        assert.ok(div, 'the attribute AFTER the unquoted slot survives');
        assert.equal(div.getAttribute('class'), 'from-slot', 'the slot value is applied');
        el.remove();
    });

    it('x-model works when type="checkbox" is written AFTER it', async () => {
        defineComponent('rf-xmodel-order', {
            data() { return { on: false }; },
            template() {
                return html`<input x-model="on" type="checkbox">`;
            }
        });
        const el = document.createElement('rf-xmodel-order');
        document.body.appendChild(el);
        await tick();
        const input = el.querySelector('input');
        assert.equal(input.checked, false, 'initial unchecked');

        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await tick();
        assert.equal(el.state.on, true, 'checkbox binding (change/checked), not the text binding');

        el.state.on = false;
        await tick();
        assert.equal(input.checked, false, 'state drives checked');
        el.remove();
    });

    it('x-model does not clobber an earlier on-change handler', async () => {
        let userCalls = 0;
        defineComponent('rf-xmodel-chain', {
            data() {
                this._onChange = () => { userCalls++; };
                return { on: false };
            },
            template() {
                return html`<input on-change="${(e) => this._onChange(e)}" type="checkbox" x-model="on">`;
            }
        });
        const el = document.createElement('rf-xmodel-chain');
        document.body.appendChild(el);
        await tick();
        const input = el.querySelector('input');
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await tick();
        assert.equal(el.state.on, true, 'x-model updated state');
        assert.equal(userCalls, 1, 'the user on-change handler also fired');
        el.remove();
    });

    it('entities in the static chunks of a mixed slot attribute are decoded', async () => {
        defineComponent('rf-entity-chunks', {
            data() { return { v: 'X' }; },
            template() {
                return html`<div title="&amp;${this.state.v}&amp;">x</div>`;
            }
        });
        const el = document.createElement('rf-entity-chunks');
        document.body.appendChild(el);
        await tick();
        assert.equal(el.querySelector('div').getAttribute('title'), '&X&',
            'both static chunks decoded, not just the final one');
        el.remove();
    });

    it('camelCase SVG elements keep their case (linearGradient renders)', async () => {
        defineComponent('rf-svg-case', {
            data() { return {}; },
            template() {
                return html`
                    <svg viewBox="0 0 10 10">
                        <defs>
                            <linearGradient id="rf-grad">
                                <stop offset="0" stop-color="red"></stop>
                            </linearGradient>
                        </defs>
                        <clipPath id="rf-clip"><rect width="5" height="5"></rect></clipPath>
                        <rect width="10" height="10" fill="url(#rf-grad)"></rect>
                    </svg>
                `;
            }
        });
        const el = document.createElement('rf-svg-case');
        document.body.appendChild(el);
        await tick();
        const grad = el.querySelector('#rf-grad');
        assert.ok(grad, 'gradient element exists');
        assert.equal(grad.tagName, 'linearGradient', 'tagName is case-correct (was lineargradient)');
        assert.equal(el.querySelector('#rf-clip').tagName, 'clipPath', 'clipPath case-correct');
        el.remove();
    });
});

describe('Review fixes - renderer', function(it) {
    it('multi-slot attribute values containing $ patterns land verbatim', async () => {
        defineComponent('rf-dollar-attr', {
            data() { return { a: "$'", b: '$&' }; },
            template() {
                return html`<div title="x${this.state.a}y${this.state.b}z">t</div>`;
            }
        });
        const el = document.createElement('rf-dollar-attr');
        document.body.appendChild(el);
        await tick();
        assert.equal(el.querySelector('div').getAttribute('title'), "x$'y$&z",
            "$' and $& are not interpreted as replacement patterns");
        el.remove();
    });

    it('handlers inside each() rows receive the resolved value as 2nd arg', async () => {
        defineComponent('rf-nested-value', {
            data() { return { rows: [1, 2], got: null }; },
            template() {
                return html`
                    <div>
                        ${each(this.state.rows, (r) => html`
                            <input class="row-${r}" on-input-stop="${(e, v) => { this.state.got = v; }}">
                        `, r => r)}
                    </div>
                `;
            }
        });
        const el = document.createElement('rf-nested-value');
        document.body.appendChild(el);
        await tick();
        const input = el.querySelector('.row-1');
        input.value = 'typed';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await tick();
        assert.equal(el.state.got, 'typed',
            'the (e, value) contract holds inside nested/each templates and through -stop');
        el.remove();
    });

    it('refuses dangerous CSS interpolated into a <style> element', async () => {
        defineComponent('rf-style-el', {
            data() { return { css: '.x { background: url("javascript:alert(1)"); }' }; },
            template() {
                return html`<style>${this.state.css}</style><div class="x">x</div>`;
            }
        });
        const warns = [];
        const origWarn = console.warn;
        console.warn = (...a) => warns.push(a.join(' '));
        const el = document.createElement('rf-style-el');
        document.body.appendChild(el);
        await tick();
        console.warn = origWarn;
        const style = el.querySelector('style');
        assert.ok(!style || !style.textContent.includes('javascript:'),
            'dangerous CSS did not land in the style element');
        assert.ok(warns.some(w => w.includes('[VDX Security]')), 'refusal warned');

        // benign CSS still renders
        el.state.css = '.x { color: rgb(4, 5, 6); }';
        await tick();
        assert.ok(el.querySelector('style').textContent.includes('rgb(4, 5, 6)'),
            'benign CSS still interpolates');
        el.remove();
    });
});

describe('Review fixes - utils and stores', function(it) {
    it('rafThrottle survives a throwing callback', async () => {
        let calls = 0;
        const throttled = rafThrottle(() => {
            calls++;
            if (calls === 1) throw new Error('boom');
        });
        // Swallow the (expected) error surfaced from the rAF callback
        const origOnError = window.onerror;
        window.onerror = () => true;
        throttled();
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
        window.onerror = origOnError;

        throttled();   // pre-fix: rafPending stuck true, dropped forever
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
        assert.equal(calls, 2, 'the throttle recovered after the throw');
    });

    it('EventBus.once fires exactly once even if the handler throws', () => {
        const bus = eventBus;
        let calls = 0;
        const origError = console.error;
        console.error = () => {};
        bus.once('rf-once-evt', () => { calls++; throw new Error('boom'); });
        bus.emit('rf-once-evt');
        bus.emit('rf-once-evt');
        console.error = origError;
        assert.equal(calls, 1, 'throwing once-handler did not stay subscribed');
    });

    it('relativeTime uses singular units', () => {
        assert.equal(relativeTime(new Date(Date.now() - 3600000)), '1 hour ago');
        assert.equal(relativeTime(new Date(Date.now() - 7200000)), '2 hours ago');
        assert.equal(relativeTime(new Date(Date.now() - 60000)), '1 minute ago');
    });

    it('createStore filters dangerous keys from the seed', () => {
        const origWarn = console.warn;
        console.warn = () => {};
        const store = createStore(JSON.parse('{"a": 1, "__proto__": {"polluted": true}}'));
        console.warn = origWarn;
        assert.equal(store.state.a, 1, 'clean keys kept');
        assert.equal(Object.prototype.polluted, undefined, 'no prototype pollution');
        assert.ok(!Object.prototype.hasOwnProperty.call(store.state, '__proto__') ||
            store.state.__proto__ === Object.prototype, 'dangerous key filtered');
    });
});

describe('Template cache eviction - identity preservation', function(it) {
    it('a post-eviction recompile updates in place instead of re-instantiating', async () => {
        const { clearTemplateCache } = await import('../../lib/framework.js');
        defineComponent('rf-evict-identity', {
            data() { return { n: 1 }; },
            template() {
                return html`<div class="wrap"><input class="field"><span class="n">${this.state.n}</span></div>`;
            }
        });
        const el = document.createElement('rf-evict-identity');
        document.body.appendChild(el);
        await tick();

        const input = el.querySelector('.field');
        input.value = 'preserved';

        // Simulate LRU eviction of this component's (still mounted) template
        clearTemplateCache();

        // Re-render: template() recompiles to a fresh _compiled object
        el.state.n = 2;
        await tick();

        assert.equal(el.querySelector('.n').textContent, '2', 'value updated');
        assert.ok(el.querySelector('.field') === input,
            'DOM node identity preserved across the eviction (no re-instantiation)');
        assert.equal(input.value, 'preserved', 'transient input state survived');
        el.remove();
    });

    it('keyed each() rows survive an eviction without rebuilding', async () => {
        const { clearTemplateCache } = await import('../../lib/framework.js');
        defineComponent('rf-evict-rows', {
            data() { return { rows: [{ id: 1 }, { id: 2 }] }; },
            template() {
                return html`<ul>${each(this.state.rows,
                    r => html`<li class="row" data-id="${r.id}">${r.id}</li>`,
                    r => r.id)}</ul>`;
            }
        });
        const el = document.createElement('rf-evict-rows');
        document.body.appendChild(el);
        await tick();

        const firstRow = el.querySelector('.row');
        clearTemplateCache();

        el.state.rows = [...el.state.rows, { id: 3 }];
        await tick();

        assert.equal(el.querySelectorAll('.row').length, 3, 'row added');
        assert.ok(el.querySelector('.row') === firstRow,
            'existing row DOM identity preserved (statics+index _src fallback)');
        el.remove();
    });
});

describe('localStore prefix', function(it) {
    it('defaults to vdx and is configurable', async () => {
        const { localStore, setLocalStorePrefix } = await import('../../lib/utils.js');
        try {
            const s1 = localStore('rf-prefix-test', { v: 1 });
            s1.state.v = 2;
            await tick(20);
            assert.ok(window.localStorage.getItem('vdx_rf-prefix-test'),
                'persists under the vdx_ prefix by default');

            setLocalStorePrefix('rf-custom');
            const s2 = localStore('rf-prefix-test2', { v: 1 });
            s2.state.v = 2;
            await tick(20);
            assert.ok(window.localStorage.getItem('rf-custom_rf-prefix-test2'),
                'setLocalStorePrefix takes effect for later stores');
        } finally {
            const { setLocalStorePrefix } = await import('../../lib/utils.js');
            setLocalStorePrefix('vdx');
            window.localStorage.removeItem('vdx_rf-prefix-test');
            window.localStorage.removeItem('rf-custom_rf-prefix-test2');
        }
    });
});

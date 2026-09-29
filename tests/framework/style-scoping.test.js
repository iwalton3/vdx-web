/**
 * Component style scoping: :host expansion and :host-context().
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html } from '../../lib/framework.js';

const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));

async function scopedCss(tag, styles) {
    defineComponent(tag, {
        styles,
        template() { return html`<div class="a">s</div>`; }
    });
    const el = document.createElement(tag);
    document.body.appendChild(el);
    await tick();
    const css = document.getElementById(`component-styles-${tag.toUpperCase()}`).textContent;
    el.remove();
    return css;
}

describe('Style scoping - :host', function(it) {
    it('the end of the stylesheet survives :host growing the string', async () => {
        // Each :host lengthens the CSS by tag.length - 5; the tail rule has no
        // trailing whitespace to absorb the loss.
        const css = await scopedCss('ss-a-rather-long-component-tag',
            ':host { display: block; } :host(.x) .b { color: red; } .last { width: auto; }');
        assert.ok(/ss-a-rather-long-component-tag \.last \{\s*width: auto;\s*\}/.test(css),
            `final rule intact, got: ${css}`);
    });

    it(':host(X) keeps X whole when X has parens before its end', async () => {
        const css = await scopedCss('ss-host-nested',
            ':host(:not(.x).y) .c { color: red; } :host(:not(:is(.a, .b))) .d { color: red; }');
        assert.ok(css.includes('ss-host-nested:not(.x).y .c'), `got: ${css}`);
        assert.ok(css.includes('ss-host-nested:not(:is(.a, .b)) .d'), `got: ${css}`);
    });
});

describe('Style scoping - :host-context()', function(it) {
    it('expands to the component under a matching ancestor', async () => {
        const css = await scopedCss('ss-ctx-a', `
            :host-context(.dark) .b { color: red; }
            :host-context(body.dark) { color: blue; }
            :host-context(:not(.x)) .c, .d { color: green; }
            @media (min-width: 1px) { :host-context(.dark) .e { color: red; } }
        `);
        assert.ok(css.includes('ss-ctx-a:is(.dark *) .b'), `descendant form, got: ${css}`);
        assert.ok(css.includes('ss-ctx-a:is(body.dark *) {'), 'bare form');
        assert.ok(css.includes('ss-ctx-a:is(:not(.x) *) .c, ss-ctx-a .d'),
            'nested parens, and mixed with a plain selector in a list');
        assert.ok(css.includes('ss-ctx-a:is(.dark *) .e'), 'inside @media');
        assert.ok(!css.includes('-context'), 'no mangled :host-context left');
    });

    it('matches only when an ancestor matches', async () => {
        defineComponent('ss-ctx-live', {
            styles: ':host-context(.ss-dark) .t { color: rgb(255, 0, 0); }',
            template() { return html`<span class="t">t</span>`; }
        });
        const wrap = document.createElement('div');
        wrap.innerHTML = '<ss-ctx-live></ss-ctx-live>';
        document.body.appendChild(wrap);
        await tick();
        const t = wrap.querySelector('.t');
        assert.notEqual(getComputedStyle(t).color, 'rgb(255, 0, 0)', 'no ancestor: no match');
        wrap.classList.add('ss-dark');
        assert.equal(getComputedStyle(t).color, 'rgb(255, 0, 0)', 'ancestor matches');
        wrap.remove();
    });
});

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
});

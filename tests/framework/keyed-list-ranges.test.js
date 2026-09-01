/**
 * Keyed list items with a slot at their root.
 *
 * Such an item can change node count at any time - the slot swaps its own
 * content inside its own effect and never tells the list. When the list kept a
 * node array captured at instantiation, a later move re-inserted detached nodes
 * and stranded the live ones (BUG-REPORT-keyed-item-node-snapshot.md). These
 * items now carry a trailing anchor and report their DOM by walking it.
 *
 * The shapes that trigger it:
 *   html`<h4>${x}</h4>${each(...)}`   element + trailing slot
 *   html`${when(...)}`                the whole item is a slot
 *   html`${contain(...)}`             ditto, with an isolated boundary
 */

import { describe, assert } from './test-runner.js';
import { html, each, memoEach, when, contain, defineComponent } from '../../lib/framework.js';
import { mulberry32 } from './shuffle-harness.js';

const wait = () => new Promise(r => setTimeout(r, 60));

/** Tag:text of every element child, so both order and node count are asserted. */
function shape(el) {
    return [...el.querySelector('.list').children]
        .map(n => n.tagName.toLowerCase() + ':' + n.textContent)
        .join(' ');
}

/** Comment nodes under the list - the anchors. Must not accumulate. */
function commentCount(el) {
    return [...el.querySelector('.list').childNodes]
        .filter(n => n.nodeType === Node.COMMENT_NODE).length;
}

describe('Keyed lists - items with a slot at their root', function(it) {

    it('moves an item whose nested each() grew after instantiation', async () => {
        defineComponent('range-nested-each', {
            data() {
                return { items: [{ id: 'a', kids: [] }, { id: 'b', kids: [] }, { id: 'c', kids: [] }] };
            },
            template() {
                return html`<div class="list">${each(this.state.items, i =>
                    html`<h4>${i.id}</h4>${each(i.kids, k => html`<p>${k}</p>`, k => k)}`,
                    i => i.id)}</div>`;
            }
        });

        const el = document.createElement('range-nested-each');
        document.body.appendChild(el);
        await wait();
        assert.equal(shape(el), 'h4:a h4:b h4:c', 'initial render');

        const [a, b, c] = el.state.items;
        a.kids = ['x', 'y'];
        await wait();
        assert.equal(shape(el), 'h4:a p:x p:y h4:b h4:c', 'item a grew two children');

        el.state.items = [b, c, a];
        await wait();
        assert.equal(shape(el), 'h4:b h4:c h4:a p:x p:y', 'the grown item moves with its children');

        el.state.items = [a, b, c];
        await wait();
        assert.equal(shape(el), 'h4:a p:x p:y h4:b h4:c', 'and moves back');

        a.kids = [];
        await wait();
        assert.equal(shape(el), 'h4:a h4:b h4:c', 'shrinking back to zero leaves nothing behind');

        el.state.items = [c, b, a];
        await wait();
        assert.equal(shape(el), 'h4:c h4:b h4:a', 'reverse after shrink');

        document.body.removeChild(el);
    });

    it('moves an item whose root is a when() slot that changed node count', async () => {
        defineComponent('range-when-root', {
            data() {
                return { items: ['a', 'b', 'c', 'd'].map(id => ({ id, big: false })) };
            },
            template() {
                return html`<div class="list">${each(this.state.items, i =>
                    html`${when(i.big,
                        () => html`<b>${i.id}</b><em>${i.id}</em>`,
                        () => html`<span>${i.id}</span>`)}`,
                    i => i.id)}</div>`;
            }
        });

        const el = document.createElement('range-when-root');
        document.body.appendChild(el);
        await wait();
        assert.equal(shape(el), 'span:a span:b span:c span:d', 'initial render');

        const [a, b, c, d] = el.state.items;
        a.big = true;
        await wait();
        assert.equal(shape(el), 'b:a em:a span:b span:c span:d', 'item a took the two-node branch');

        el.state.items = [b, c, d, a];
        await wait();
        assert.equal(shape(el), 'span:b span:c span:d b:a em:a', 'no stranded or resurrected nodes');

        el.state.items = [a, b, c, d];
        await wait();
        assert.equal(shape(el), 'b:a em:a span:b span:c span:d', 'and back');

        el.state.items = [c, a];
        await wait();
        assert.equal(shape(el), 'span:c b:a em:a', 'removals keep the survivors intact');

        a.big = false;
        await wait();
        assert.equal(shape(el), 'span:c span:a', 'branch flips back with no leftovers');

        document.body.removeChild(el);
    });

    it('moves an item whose root is a contain() boundary', async () => {
        defineComponent('range-contain-root', {
            data() { return { items: [{ id: 'a', n: 1 }, { id: 'b', n: 1 }] }; },
            template() {
                return html`<div class="list">${each(this.state.items, i =>
                    html`${contain(() => html`<u>${i.id}</u>${when(i.n > 1, () => html`<s>${i.n}</s>`)}`)}`,
                    i => i.id)}</div>`;
            }
        });

        const el = document.createElement('range-contain-root');
        document.body.appendChild(el);
        await wait();
        assert.equal(shape(el), 'u:a u:b', 'initial render');

        const [a, b] = el.state.items;
        a.n = 5;
        await wait();
        assert.equal(shape(el), 'u:a s:5 u:b', 'the boundary grew a node');

        el.state.items = [b, a];
        await wait();
        assert.equal(shape(el), 'u:b u:a s:5', 'the boundary moves whole');

        document.body.removeChild(el);
    });

    it('handles the same shapes through memoEach()', async () => {
        defineComponent('range-memo-each', {
            data() {
                return { items: [{ id: 'a', kids: [] }, { id: 'b', kids: [] }, { id: 'c', kids: [] }] };
            },
            template() {
                return html`<div class="list">${memoEach(this.state.items, i =>
                    html`<h4>${i.id}</h4>${each(i.kids, k => html`<p>${k}</p>`, k => k)}`,
                    i => i.id)}</div>`;
            }
        });

        const el = document.createElement('range-memo-each');
        document.body.appendChild(el);
        await wait();
        assert.equal(shape(el), 'h4:a h4:b h4:c', 'initial render');

        const [a, b, c] = el.state.items;
        el.state.items = [{ id: 'a', kids: ['x', 'y'] }, b, c];
        await wait();
        assert.equal(shape(el), 'h4:a p:x p:y h4:b h4:c', 'item a re-rendered with children');

        const grownA = el.state.items[0];
        el.state.items = [b, c, grownA];
        await wait();
        assert.equal(shape(el), 'h4:b h4:c h4:a p:x p:y', 'memoEach moves the grown item whole');

        document.body.removeChild(el);
    });

    it('does not accumulate anchors across churn', async () => {
        defineComponent('range-anchor-churn', {
            data() { return { items: [{ id: 'a', kids: [] }] }; },
            template() {
                return html`<div class="list">${each(this.state.items, i =>
                    html`<h4>${i.id}</h4>${each(i.kids, k => html`<p>${k}</p>`, k => k)}`,
                    i => i.id)}</div>`;
            }
        });

        const el = document.createElement('range-anchor-churn');
        document.body.appendChild(el);
        await wait();
        const baseline = commentCount(el);

        for (let round = 0; round < 5; round++) {
            el.state.items = [
                { id: 'a', kids: ['x'] },
                { id: 'b', kids: ['y', 'z'] },
                { id: 'c', kids: [] }
            ];
            await wait();
            el.state.items = [{ id: 'a', kids: [] }];
            await wait();
        }

        assert.equal(shape(el), 'h4:a', 'back to a single item');
        assert.equal(commentCount(el), baseline,
            `anchors should not accumulate (baseline ${baseline}, now ${commentCount(el)})`);

        document.body.removeChild(el);
    });

    it('keeps SVG items in the SVG namespace across a move', async () => {
        // The anchor is a comment, but the item's own nodes must stay in the SVG
        // namespace - instantiateTemplate re-namespaces before makeItemRecord sees
        // the fragment, and the range walk must not disturb that.
        defineComponent('range-svg', {
            data() {
                return { items: [{ id: 'a', dots: [] }, { id: 'b', dots: [] }, { id: 'c', dots: [] }] };
            },
            template() {
                return html`<svg class="list" width="200" height="60">${each(this.state.items, i =>
                    html`<text>${i.id}</text>${each(i.dots, d => html`<circle r="${d}"></circle>`, d => d)}`,
                    i => i.id)}</svg>`;
            }
        });

        const el = document.createElement('range-svg');
        document.body.appendChild(el);
        await wait();

        const list = el.querySelector('.list');
        const svgShape = () => [...list.children]
            .map(n => n.tagName + ':' + (n.textContent || n.getAttribute('r'))).join(' ');
        const allSvg = () => [...list.children]
            .every(n => n.namespaceURI === 'http://www.w3.org/2000/svg');

        assert.equal(svgShape(), 'text:a text:b text:c', 'initial render');

        const [a, b, c] = el.state.items;
        a.dots = [1, 2];
        await wait();
        assert.equal(svgShape(), 'text:a circle:1 circle:2 text:b text:c', 'item a grew two circles');
        assert.ok(allSvg(), 'grown nodes are in the SVG namespace');

        el.state.items = [b, c, a];
        await wait();
        assert.equal(svgShape(), 'text:b text:c text:a circle:1 circle:2', 'the grown item moved whole');
        assert.ok(allSvg(), 'moved nodes stay in the SVG namespace');

        document.body.removeChild(el);
    });

    it('handles an item whose root slot starts empty', async () => {
        defineComponent('range-empty-root', {
            data() {
                return { items: [{ id: 'a', on: false }, { id: 'b', on: true }, { id: 'c', on: false }] };
            },
            template() {
                return html`<div class="list">${each(this.state.items, i =>
                    html`${when(i.on, () => html`<b>${i.id}</b>`)}`, i => i.id)}</div>`;
            }
        });

        const el = document.createElement('range-empty-root');
        document.body.appendChild(el);
        await wait();

        const text = () => [...el.querySelector('.list').children].map(n => n.textContent).join(' ');
        assert.equal(text(), 'b', 'only the enabled item renders content');

        const [a, b, c] = el.state.items;
        a.on = true;
        await wait();
        assert.equal(text(), 'a b', 'an empty item fills in at the right position');

        el.state.items = [c, b, a];
        await wait();
        assert.equal(text(), 'b a', 'the still-empty item reorders without disturbing the others');

        c.on = true;
        await wait();
        assert.equal(text(), 'c b a', 'and fills in where it now sits');

        const before = commentCount(el);
        el.state.items = [b];
        await wait();
        assert.equal(text(), 'b', 'dropping to one item');
        assert.ok(commentCount(el) < before,
            `removed items take their anchors with them (${before} -> ${commentCount(el)})`);

        document.body.removeChild(el);
    });

    it('survives seeded random shuffles with varying item sizes', async () => {
        defineComponent('range-fuzz', {
            data() { return { items: [] }; },
            template() {
                return html`<div class="list">${each(this.state.items, i =>
                    html`<h4>${i.id}</h4>${each(i.kids, k => html`<p>${k}</p>`, k => k)}`,
                    i => i.id)}</div>`;
            }
        });

        const el = document.createElement('range-fuzz');
        document.body.appendChild(el);

        // Model the expected DOM independently, then compare after every step.
        const expected = items => items
            .flatMap(i => ['h4:' + i.id, ...i.kids.map(k => 'p:' + k)])
            .join(' ');

        for (const seed of [1, 7, 42, 1337]) {
            const rng = mulberry32(seed);
            let items = 'abcdef'.split('').map(id => ({ id, kids: [] }));
            el.state.items = items;
            await wait();

            for (let step = 0; step < 12; step++) {
                items = items.slice();

                // Resize a random item's children
                const target = items[Math.floor(rng() * items.length)];
                if (target) {
                    const n = Math.floor(rng() * 3);
                    target.kids = Array.from({ length: n }, (_, k) => `${target.id}${k}`);
                }

                // Drop one, sometimes
                if (items.length > 2 && rng() < 0.35) {
                    items.splice(Math.floor(rng() * items.length), 1);
                }

                // Shuffle (Fisher-Yates on the seeded stream)
                for (let i = items.length - 1; i > 0; i--) {
                    const j = Math.floor(rng() * (i + 1));
                    [items[i], items[j]] = [items[j], items[i]];
                }

                el.state.items = items;
                await wait();
                assert.equal(shape(el), expected(items),
                    `seed ${seed} step ${step}: DOM should match the model`);
            }
        }

        document.body.removeChild(el);
    });
});

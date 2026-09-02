/**
 * Metamorphic relations over the attribute contract. MEASUREMENT ONLY.
 *
 * The matrix judges each cell against ruleFor - a rule we wrote, and the place
 * every mistake in this arc was made. A relation needs no opinion about what a
 * cell should hold. It says two ways of reaching one state must land in one
 * state, and reads both sides through the same snapshot:
 *
 *   update    state after update-to-X   ==  fresh render of X
 *   ingress   el.p = x                  ==  el.setProps({ p: x })
 *   timing    render, then register     ==  register, then render
 *   children  the same, for light-DOM children of the element
 *
 * Rows take the matrix's row shape with oracle 'relation:<name>' and flow into
 * the same baseline diff, so a broken relation fails the run the same way a
 * broken cell does.
 */

import { defineComponent, html, Component, flushSync } from '/lib/framework.js';
import { kebabToCamel } from '/lib/core/constants.js';
import { renderCell, cellTemplate, updateCell, readIdl, same, sameFor } from './matrix.js';

/* ---------------------------------------------------------------- snapshot */

function show(v) {
    if (v === undefined) return '"<undefined>"';
    if (typeof v === 'function') return '"<function>"';
    if (typeof v === 'object' && v !== null) return '"<object>"';
    return JSON.stringify(v);
}

/**
 * Every channel an attribute can be observed on, read the same way for both
 * sides of a relation. A function prop is a wrapper with a fresh identity per
 * element, so it is compared by what calling it returns.
 */
function snapshot(el, attr) {
    const s = { attr: el.getAttribute(attr), presence: el.hasAttribute(attr) };
    if (attr !== 'class' && attr !== 'style') {
        const idl = readIdl(el, attr);
        if (idl.has) s.idl = idl.value;
    }
    if (el.props) {
        const p = el.props[attr.includes('-') ? kebabToCamel(attr) : attr];
        s.prop = typeof p === 'function' ? p() : p;
    }
    return s;
}

function record(rows, job, source, oracle, got, want, threw) {
    const base = { kind: job.kindId, tag: job.tag, attr: job.attr, class: job.class,
                   domKind: '-', source, oracle };
    if (threw) {
        rows.push({ ...base, got: `threw=${JSON.stringify(threw)}`, want: 'no throw' });
        return;
    }
    if (!got || !want) {
        if (Boolean(got) !== Boolean(want)) {
            rows.push({ ...base, got: got ? 'element' : 'missing', want: want ? 'element' : 'missing' });
        }
        return;
    }
    for (const ch of new Set([...Object.keys(got), ...Object.keys(want)])) {
        // Only what came out of the DOM as text gets the attribute's own
        // normalisation; running a presence boolean through the style
        // canonicaliser turned true and false into the same empty string.
        const agree = (ch === 'attr' || ch === 'idl')
            ? sameFor(job.attr, got[ch], want[ch], ch)
            : same(got[ch], want[ch], ch !== 'prop');
        if (!agree) {
            rows.push({ ...base, got: `${ch}=${show(got[ch])}`, want: `${ch}=${show(want[ch])}` });
        }
    }
}

function shape(job) {
    const open = (job.wrap ? `<${job.wrap}>` : '') + `<${job.tag} ${job.attr}="`;
    const close = `"></${job.tag}>` + (job.wrap ? `</${job.wrap}>` : '');
    const sel = job.wrap ? `${job.wrap} ${job.tag}` : job.tag;
    return { open, close, sel };
}

/* ------------------------------------------------------------------ update */

/**
 * update-to-X == fresh render of X, from every prior value.
 *
 * The matrix's transition walk reaches each value from one prior. Every pair
 * is walked here, because the branches that misbehave are the ones that look
 * at what is already there - and a value that arrives correctly from one prior
 * and stale from another is exactly the kebab defect (delivered once, never
 * again) wearing a different attribute.
 */
function relUpdate(jobs, seqFor, rows, counts) {
    for (const job of jobs) {
        const { open, close, sel } = shape(job);
        const seq = seqFor(job);

        const fresh = seq.map(v => {
            const host = renderCell(cellTemplate(open, close, true), v.value);
            const el = host.querySelector(sel);
            const snap = el ? snapshot(el, job.attr) : null;
            host.remove();
            return snap;
        });

        for (const from of seq) {
            for (let j = 0; j < seq.length; j++) {
                counts.update++;
                const host = renderCell(cellTemplate(open, close, true), from.value);
                const el = host.querySelector(sel);
                let threw = null;
                try { updateCell(host, seq[j].value); } catch (e) { threw = e.message; }
                record(rows, job, `${from.label} -> ${seq[j].label}`, 'relation:update',
                       el ? snapshot(el, job.attr) : null, fresh[j], threw);
                host.remove();
            }
        }
    }
}

/* ----------------------------------------------------------------- ingress */

/**
 * el.p = x == el.setProps({ p: x }), from every prior value.
 *
 * Two entry points for one rule (component.js keeps them side by side and
 * says so). The snapshot is joined by what propsChanged saw, since that is the
 * only observable that tells a batch apart from a single write.
 */
function relIngress(jobs, seqFor, rows, counts) {
    for (const job of jobs) {
        if (!job.registered) continue;
        const { open, close, sel } = shape(job);
        const seq = seqFor(job);
        const propKey = job.attr.includes('-') ? kebabToCamel(job.attr) : job.attr;

        for (const from of seq) {
            for (const to of seq) {
                counts.ingress++;
                const hosts = [0, 1].map(() => renderCell(cellTemplate(open, close, true), from.value));
                const els = hosts.map(h => h.querySelector(sel));
                const seen = els.map(el => {
                    const calls = [];
                    el.propsChanged = (n, nv, ov) => calls.push(`${n}:${show(nv)}<-${show(ov)}`);
                    return calls;
                });

                const threw = [null, null];
                try { flushSync(() => { els[0][propKey] = to.value; }); } catch (e) { threw[0] = e.message; }
                try { flushSync(() => { els[1].setProps({ [propKey]: to.value }); }); } catch (e) { threw[1] = e.message; }

                const side = i => ({ ...snapshot(els[i], job.attr), changed: seen[i].join(' ') });
                record(rows, job, `${from.label} -> ${to.label}`, 'relation:ingress',
                       threw[0] ? null : side(0), threw[1] ? null : side(1),
                       threw[0] !== threw[1] ? `setter:${threw[0]} setProps:${threw[1]}` : threw[0]);
                hosts.forEach(h => h.remove());
            }
        }
    }
}

/* ------------------------------------------------------------------ timing */

let serial = 0;
/** customElements.define is once-only, so every cell gets tags of its own. */
function freshTags() {
    serial++;
    return { eager: `rl-e-${serial}`, lazy: `rl-l-${serial}` };
}

const DECLARED = ['disabled', 'id', 'value', 'title', 'tabindex', 'onpick', 'fromUnit'];
const DEFAULT = '(rel-default)';

function makeClass(declared, tpl) {
    return class extends Component {
        static props = declared
            ? DECLARED.reduce((acc, n) => { acc[n] = DEFAULT; return acc; }, {})
            : {};
        template() { return tpl(this); }
    };
}
const LEAF = () => html`<i></i>`;
const OUTLET = (self) => html`<div class="out">${self.props.children}</div>`;

/**
 * render, then register == register, then render.
 *
 * The lazy side carries its values through pending-props.js; the eager side
 * never needs to. Then both sides take two updates, because a value that
 * arrived correctly at upgrade and never moved again is the failure this
 * transport is most likely to produce.
 */
function relTiming(attrs, seqFor, rows, counts) {
    for (const declared of [true, false]) {
        const kindId = declared ? 'component' : 'component-bare';
        for (const attr of attrs) {
            const job = { kindId, tag: kindId, attr, class: 'timing' };
            const seq = seqFor(job);
            for (const v of seq) {
                counts.timing++;
                const tags = freshTags();

                defineComponent(tags.eager, makeClass(declared, LEAF));
                const eHost = renderCell(cellTemplate(`<${tags.eager} ${attr}="`, `"></${tags.eager}>`, true), v.value);
                const eEl = eHost.querySelector(tags.eager);

                const lHost = renderCell(cellTemplate(`<${tags.lazy} ${attr}="`, `"></${tags.lazy}>`, true), v.value);
                defineComponent(tags.lazy, makeClass(declared, LEAF));
                const lEl = lHost.querySelector(tags.lazy);

                // ${undefined} means "not provided" on both sides and the prop
                // agrees, but the mirror does not: an eager render reaches the
                // setter, which mirrors the RESOLVED default (ruleFor's
                // ratified clause), while a lazy one records nothing and takes
                // the default the way an omitted attribute does - unmirrored.
                // Compared on the prop channel only; the mirror rows are the
                // one place the two paths are documented to differ.
                const strip = v.value === undefined
                    ? s => ({ prop: s.prop })
                    : s => s;
                record(rows, job, v.label, 'relation:timing',
                       strip(snapshot(lEl, attr)), strip(snapshot(eEl, attr)));

                for (const step of [{ label: "-> 'after'", value: 'after' }, { label: '-> null', value: null }]) {
                    counts.timing++;
                    let threw = null;
                    try {
                        updateCell(eHost, step.value);
                        updateCell(lHost, step.value);
                    } catch (e) { threw = e.message; }
                    record(rows, job, `${v.label} ${step.label}`, 'relation:timing',
                           snapshot(lEl, attr), snapshot(eEl, attr), threw);
                }
                eHost.remove();
                lHost.remove();
            }
        }
    }
}

/* ---------------------------------------------------------------- children */

const CHILD_VALUES = [
    { label: "${'text'}", value: 'text' },
    { label: '${0}', value: 0 },
    { label: "${''}", value: '' },
    { label: '${false}', value: false },
    { label: '${null}', value: null }
];

/**
 * The same relation for what the element CONTAINS. A child written between
 * the tags is captured either as a deferred descriptor (registered at render)
 * or as light DOM (registered later); the parent's bindings and handlers on it
 * must survive either way.
 */
function relChildren(rows, counts) {
    for (const v of CHILD_VALUES) {
        counts.children++;
        const tags = freshTags();
        const clicks = { eager: 0, lazy: 0 };
        const factory = (tag, side) => {
            const strings = [`<${tag}><span class="k" on-click="`, `">`, `</span></${tag}>`];
            const fn = () => { clicks[side]++; };
            return (val) => html(strings, fn, val);
        };
        const job = { kindId: 'component', tag: 'component', attr: 'children', class: 'timing' };

        defineComponent(tags.eager, makeClass(false, OUTLET));
        const eHost = renderCell(factory(tags.eager, 'eager'), v.value);
        const lHost = renderCell(factory(tags.lazy, 'lazy'), v.value);
        defineComponent(tags.lazy, makeClass(false, OUTLET));

        const read = (host, tag, side) => {
            const el = host.querySelector(tag);
            const span = el && el.querySelector('span.k');
            const s = { 'child-in-outlet': Boolean(el && el.querySelector('.out span.k')),
                        'child-text': span ? span.textContent : '<no span>' };
            clicks[side] = 0;
            if (span) span.click();
            s['click-reached-handler'] = clicks[side];
            return s;
        };
        record(rows, job, v.label, 'relation:children',
               read(lHost, tags.lazy, 'lazy'), read(eHost, tags.eager, 'eager'));

        counts.children++;
        let threw = null;
        try {
            updateCell(eHost, 'UPDATED');
            updateCell(lHost, 'UPDATED');
        } catch (e) { threw = e.message; }
        record(rows, job, `${v.label} -> 'UPDATED'`, 'relation:children',
               read(lHost, tags.lazy, 'lazy'), read(eHost, tags.eager, 'eager'), threw);

        eHost.remove();
        lHost.remove();
    }
}

/* --------------------------------------------------------------------- run */

/**
 * @param jobs    the matrix's (kind, tag, attr) jobs; `registered` marks the
 *                kinds whose elements have a setProps to call
 * @param attrs   the attribute names tried on every non-native kind
 * @param seqFor  job -> the interpolated value sequence for that attribute
 */
export function runRelations(jobs, attrs, seqFor) {
    const rows = [];
    const counts = { update: 0, ingress: 0, timing: 0, children: 0 };
    relUpdate(jobs, seqFor, rows, counts);
    relIngress(jobs, seqFor, rows, counts);
    relTiming(attrs, seqFor, rows, counts);
    relChildren(rows, counts);
    return { rows, counts };
}

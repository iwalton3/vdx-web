// Figures on the site and in the docs must match what they describe.
//
// Every size or component-count figure in the scanned files is either marked
//   <span data-measure="framework-gz">~32</span>&nbsp;KB
// and checked against the real value (10% tolerance), or it fails as an
// unmarked figure. There is deliberately no skip attribute: a number that is not
// a measured claim gets written so it does not match (e.g. lines, not KB).
//
//   node tests/node/site-numbers.mjs              scan the repo
//   node tests/node/site-numbers.mjs --self-test  prove each failure branch fires
//
// Background: the landing page's sizes were refreshed by hand at v1 and drifted
// again (docs/tasklists/2026-11-20-site-honesty/plan.md §1).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOLERANCE = 0.10;

// Files whose figures describe the past; measuring them against today is wrong.
const NOT_SCANNED = [
    ['docs/tasklists/', 'round records quote figures as they were'],
    ['docs/proposals/', 'design records; figures describe the code at the time'],
    ['docs/fine-grained-migration-history.md', 'history of the Preact removal'],
];

const MARKED = /<span\b[^>]*\bdata-measure="([^"]*)"[^>]*>([^<]*)<\/span>/g;
const UNMARKED = [
    ['size figure', /\d+(?:\.\d+)?\s*(?:&nbsp;)?[KM]B\b/g],
    ['component count', /\d+\+?\s*(?:ready-made\s+)?(?:<[^>]+>)?(?:cl-\*?\s*(?:<\/[^>]+>)?\s*)?components?\b/g],
];

export function measure(root = ROOT) {
    const m = {};
    const dist = join(root, 'dist');
    for (const f of readdirSync(dist)) {
        if (!f.endsWith('.js')) continue;
        const buf = readFileSync(join(dist, f));
        const name = f.slice(0, -3);
        m[`${name}-raw`] = buf.length / 1024;
        m[`${name}-gz`] = gzipSync(buf).length / 1024;
    }
    m['framework-router-utils-gz'] = m['framework-gz'] + m['router-gz'] + m['utils-gz'];
    const names = new Set();
    walk(join(root, 'ui'), (p) => {
        if (!p.endsWith('.js')) return;
        for (const [, n] of readFileSync(p, 'utf8').matchAll(/defineComponent\(\s*['"](cl-[a-z0-9-]+)['"]/g)) names.add(n);
    });
    m['ui-count'] = names.size;
    return m;
}

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

// One file's problems. Pure, so the self-test drives it directly.
export function checkText(file, text, measured) {
    const problems = [];
    const claims = [];
    for (const match of text.matchAll(MARKED)) {
        const [, key, body] = match;
        const line = lineOf(text, match.index);
        const num = parseFloat(body.replace(/[^\d.]/g, ''));
        if (!(key in measured)) { problems.push(`${file}:${line} unknown data-measure key "${key}"`); continue; }
        if (Number.isNaN(num)) { problems.push(`${file}:${line} data-measure="${key}" holds no number: "${body}"`); continue; }
        const real = measured[key];
        const off = Math.abs(num - real) / real;
        claims.push({ file, line, key, num, real });
        if (off > TOLERANCE) problems.push(`${file}:${line} ${key} says ${num}, measured ${real.toFixed(1)} (${Math.round(off * 100)}% off)`);
    }
    // Blank marked spans (keeping offsets) so only unmarked figures remain.
    const rest = text.replace(MARKED, (s) => ' '.repeat(s.length));
    for (const [what, re] of UNMARKED) {
        for (const match of rest.matchAll(re)) {
            problems.push(`${file}:${lineOf(rest, match.index)} unmarked ${what} "${match[0].trim()}" - wrap the number in <span data-measure="...">`);
        }
    }
    return { problems, claims };
}

function walk(dir, fn) {
    for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) walk(p, fn); else fn(p);
    }
}

function scannedFiles(root) {
    const out = [join(root, 'index.html'), join(root, 'README.md')];
    walk(join(root, 'site'), (p) => { if (/\.(html|js)$/.test(p)) out.push(p); });
    walk(join(root, 'docs'), (p) => { if (p.endsWith('.md')) out.push(p); });
    return out.filter((p) => {
        const rel = relative(root, p).split('\\').join('/');
        return !NOT_SCANNED.some(([prefix]) => rel === prefix || rel.startsWith(prefix));
    });
}

// entries: [[file, text], ...]
export function checkAll(entries, measured) {
    const problems = [];
    const claims = [];
    for (const [file, text] of entries) {
        const r = checkText(file, text, measured);
        problems.push(...r.problems);
        claims.push(...r.claims);
    }
    if (claims.length === 0) problems.push('no data-measure claims found - the scan is not reading what it should');
    return { problems, claims };
}

export function scan(root = ROOT) {
    const measured = measure(root);
    const entries = scannedFiles(root).map((p) => [relative(root, p), readFileSync(p, 'utf8')]);
    return { ...checkAll(entries, measured), measured };
}

function selfTest() {
    const measured = { 'framework-gz': 31.4, 'ui-count': 63 };
    const cases = [
        ['passes: marked and close', '<span data-measure="framework-gz">~32</span>&nbsp;KB, <span data-measure="ui-count">63</span> components', 0],
        ['fails: off by more than 10%', '<span data-measure="framework-gz">~27</span>&nbsp;KB', 1],
        ['fails: unknown key', '<span data-measure="framework-zz">32</span> KB', 1],
        ['fails: unmarked KB figure', 'a single ~27&nbsp;KB gzipped file', 1],
        ['fails: unmarked KB, no space', 'one ~99KB file (23KB gzipped)', 2],
        ['fails: unmarked component count', '60+ ready-made <code>cl-*</code> components', 1],
        ['passes: lockfile in lines', 'a 7,292-line package-lock.json', 0],
    ];
    let bad = 0;
    for (const [name, text, want] of cases) {
        // A marked claim is appended so the zero-claims rule doesn't add to the count.
        const got = checkAll([['fixture', text], ['anchor', '<span data-measure="ui-count">63</span>']], measured).problems.length;
        const ok = got === want;
        if (!ok) bad++;
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} (problems: ${got}, expected ${want})`);
    }
    const zero = checkAll([['fixture', 'no figures here']], measured).problems;
    const zeroOk = zero.length === 1 && /no data-measure claims/.test(zero[0]);
    console.log(`${zeroOk ? 'ok  ' : 'FAIL'} fails: zero claims scanned (problems: ${zero.length}, expected 1)`);
    if (!zeroOk) bad++;
    if (bad) { console.error(`\nsite-numbers self-test: ${bad} case(s) wrong`); process.exit(1); }
    console.log('\nsite-numbers self-test: all branches fire');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    if (process.argv.includes('--self-test')) {
        selfTest();
    } else {
        const { problems, claims } = scan();
        for (const c of claims) console.log(`  ${c.file}:${c.line} ${c.key} ${c.num} (measured ${c.real.toFixed(1)})`);
        if (problems.length) {
            console.error(`\n✗ ${problems.length} figure problem(s):`);
            for (const p of problems) console.error('  ' + p);
            process.exit(1);
        }
        console.log(`✓ ${claims.length} figure(s) match what they describe`);
    }
}

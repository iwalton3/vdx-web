#!/usr/bin/env node
/**
 * The bundler must scan code, not prose.
 *
 * `parseImports`/`parseExports` are regexes over the whole file, so a JSDoc
 * `@example` line reading `import { x } from './y.js'` used to become a real
 * dependency edge. That is not cosmetic: a concatenating bundler guarantees
 * exactly one thing, module ORDER, and a phantom edge to a real sibling
 * changes it. Both halves are asserted here - prose must not create an edge,
 * and real code still must, because the fix is a mask and a mask that is too
 * eager silently unbundles the framework.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const BUNDLER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'bundler-esm.js');
let passed = 0, failed = 0;
const check = (label, cond, detail = '') => {
    if (cond) { passed++; console.log(`  ✓ ${label}`); }
    else { failed++; console.log(`  ✗ ${label}${detail ? '\n      ' + detail : ''}`); }
};

/**
 * Bundle a throwaway module tree and return the order the modules were
 * EMITTED in - read back from the bundle itself, by where each module's
 * marker landed. Not the verbose log: that prints discovery order, which is
 * a different thing and only influences emission through the sort's
 * iteration order.
 */
function orderOf(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vdx-bundler-scan-'));
    try {
        for (const [rel, content] of Object.entries(files)) {
            const full = path.join(dir, rel);
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, content);
        }
        // A refused bundle is a legitimate outcome to assert on (the
        // duplicate-name guard exits non-zero on purpose), so failure is
        // captured rather than thrown.
        let out;
        try {
            out = execFileSync(process.execPath,
                [BUNDLER, '-e', 'lib/entry.js', '-o', 'out.js'],
                { cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
        } catch (e) {
            return { order: [], stdout: (e.stdout || '') + (e.stderr || ''), refused: true };
        }
        const bundle = fs.readFileSync(path.join(dir, 'out.js'), 'utf-8');
        const order = Object.keys(files)
            .map(rel => ({ rel, at: bundle.indexOf(`MARK_${path.basename(rel, '.js').toUpperCase()}`) }))
            .filter(m => m.at !== -1)
            .sort((a, b) => a.at - b.at)
            .map(m => m.rel);
        return { order, stdout: out, refused: false };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

// alpha and beta are independent leaves; entry imports both. Their relative
// order is decided purely by the edges the scanners find.
const base = {
    'lib/entry.js': "import { a } from './alpha.js';\nimport { b } from './beta.js';\nexport const MARK_ENTRY = () => a + b;\n",
    'lib/alpha.js': "export const a = 'MARK_ALPHA';\n",
    'lib/beta.js': "export const b = 'MARK_BETA';\n"
};

console.log('Bundler scans code, not prose\n');

const clean = orderOf(base);
check('a tree with no comments bundles', clean.order.length === 3, clean.order.join(', '));

// A doc comment in alpha naming beta - prose, not a dependency.
const withProse = orderOf({
    ...base,
    'lib/alpha.js': "/**\n * @example\n *     import { b } from './beta.js';\n */\nexport const a = 'MARK_ALPHA';\n"
});
check('a JSDoc @example import creates no dependency edge',
    JSON.stringify(withProse.order) === JSON.stringify(clean.order),
    `clean: ${clean.order.join(', ')}\n      prose: ${withProse.order.join(', ')}`);
check('and no "File not found" warning for a prose path',
    !/File not found/.test(withProse.stdout));

// A line comment, and a commented-out import - same rule.
const withLineComment = orderOf({
    ...base,
    'lib/alpha.js': "// import { b } from './beta.js';\nexport const a = 'MARK_ALPHA';\n"
});
check('a commented-out import creates no dependency edge',
    JSON.stringify(withLineComment.order) === JSON.stringify(clean.order),
    withLineComment.order.join(', '));

// The other half: a REAL import must still be found, or the mask has
// unbundled the framework while every other check stays green.
const withRealImport = orderOf({
    ...base,
    'lib/alpha.js': "import { b } from './beta.js';\nexport const a = 'MARK_ALPHA' + b;\n"
});
const ai = withRealImport.order.indexOf('lib/alpha.js');
const bi = withRealImport.order.indexOf('lib/beta.js');
check('a real import is still found, and orders its dependency first',
    bi !== -1 && ai !== -1 && bi < ai, withRealImport.order.join(', '));

// Import specifiers are strings: masking string CONTENTS would erase them.
const withStringInCode = orderOf({
    ...base,
    'lib/alpha.js': "const note = 'see ./beta.js';\nimport { b } from './beta.js';\nexport const a = 'MARK_ALPHA' + b + note.length;\n"
});
check('a real import beside a string literal still resolves',
    withStringInCode.order.indexOf('lib/beta.js') < withStringInCode.order.indexOf('lib/alpha.js'),
    withStringInCode.order.join(', '));

// The duplicate-declaration guard is the one that catches the failure mode
// that made dist/ a SyntaxError (two modules declaring the same top-level
// name). Both halves matter: it must not fire on prose, and it must still
// fire on the real thing.
const commentedOutDupe = orderOf({
    ...base,
    'lib/alpha.js': "/*\nfunction helper() { return 1; }\n*/\nfunction helper() { return 'MARK_ALPHA'; }\nexport const a = helper();\n"
});
check('a commented-out function is not a duplicate declaration',
    !/Duplicate 'helper'/.test(commentedOutDupe.stdout),
    commentedOutDupe.stdout.split('\n').filter(l => /Duplicate/.test(l)).join(' | '));

const realDupe = orderOf({
    ...base,
    'lib/alpha.js': "function shared() { return 1; }\nexport const a = 'MARK_ALPHA' + shared();\n",
    'lib/beta.js': "function shared() { return 2; }\nexport const b = 'MARK_BETA' + shared();\n"
});
check('a real duplicate across two modules is still reported',
    /Duplicate 'shared'/.test(realDupe.stdout),
    realDupe.stdout.split('\n').filter(l => /Duplicate|⚠/.test(l)).join(' | '));
check('...and the bundle it would have produced is refused',
    realDupe.refused && /does not parse/.test(realDupe.stdout));

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

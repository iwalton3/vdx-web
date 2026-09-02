/**
 * dist/ is a build artifact of lib/, and every suite in this repo runs lib/.
 * So dist/ can be stale, or fail to parse, while everything is green - and
 * the first thing to notice is a downstream app that no longer boots. This
 * runs in node, needs no server, and fails on either.
 *
 *   node tests/node/dist-check.mjs
 *
 * Fresh: rebuilding with the bundler (no-arg mode) reproduces dist/ byte for
 * byte. If it does not, the rebuilt files are left in place - they are the
 * correct ones - and the run fails so they get committed.
 */
import { readFileSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = join(root, 'dist');
const files = () => readdirSync(dist).filter(f => f.endsWith('.js')).sort();
const digest = f => createHash('md5').update(readFileSync(join(dist, f))).digest('hex');

let failed = 0;
const fail = msg => { failed++; console.error('✗ ' + msg); };

// 1. every bundle parses, read as the module it is (an .mjs probe path)
for (const f of files()) {
    const probe = join(dist, f + '.check.mjs');
    copyFileSync(join(dist, f), probe);
    try {
        execFileSync(process.execPath, ['--check', probe], { stdio: 'pipe' });
    } catch (e) {
        const why = String(e.stderr || e.message).trim().split('\n').filter(l => /Error/.test(l)).join(' ');
        fail(`dist/${f} does not parse: ${why}`);
    } finally {
        unlinkSync(probe);
    }
}

// 2. every bundle is what lib/ bundles to today
const before = Object.fromEntries(files().map(f => [f, digest(f)]));
try {
    execFileSync(process.execPath, [join(root, 'tools', 'bundler-esm.js')], { cwd: root, stdio: 'pipe' });
} catch (e) {
    fail(`the bundler failed: ${String(e.stderr || e.message).trim().split('\n').slice(-3).join(' ')}`);
}
const after = Object.fromEntries(files().map(f => [f, digest(f)]));
for (const f of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[f] !== after[f]) {
        fail(`dist/${f} was stale - regenerated now; commit it`);
    }
}

if (failed) {
    console.error(`\n${failed} dist problem(s)`);
    process.exit(1);
}
console.log(`✓ dist/ parses and is fresh (${files().length} bundles)`);

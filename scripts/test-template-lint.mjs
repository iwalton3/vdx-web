#!/usr/bin/env node
/**
 * Template-lint fixture verification.
 *
 * Each fixture file in scripts/template-lint-fixtures/ annotates lines that
 * MUST produce a finding with a trailing marker naming the check id:
 *
 *     <button on-click="typo">x</button> <!-- LINT-EXPECT: t1-handler -->
 *
 * Every annotated line must be reported with that check id, and no
 * unannotated line may be reported at all (near-miss negatives are the
 * point of the suite). Exit 0 = all fixtures pass.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildRegistry, lintTemplates } from '../template-lint.js';

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'template-lint-fixtures');
const files = fs.readdirSync(fixtureDir).filter(f => f.endsWith('.js')).sort();

const entries = files.map(f => ({
    path: path.join(fixtureDir, f),
    content: fs.readFileSync(path.join(fixtureDir, f), 'utf-8'),
}));

const registry = buildRegistry(entries);

let failures = 0;
let checked = 0;

for (const entry of entries) {
    const rel = path.basename(entry.path);
    const expected = new Map(); // "line" -> checkId
    entry.content.split('\n').forEach((text, i) => {
        const m = /LINT-EXPECT:\s*([\w-]+)/.exec(text);
        if (m) expected.set(i + 1, m[1]);
    });

    const actual = lintTemplates(entry.content, entry.path, registry);
    const actualByLine = new Map(actual.map(i => [i.line, i]));

    for (const [line, checkId] of expected) {
        checked++;
        const hit = actualByLine.get(line);
        if (!hit) {
            console.log(`\x1b[31m✗ ${rel}:${line} expected ${checkId}, got nothing\x1b[0m`);
            failures++;
        } else if (hit.checkId !== checkId) {
            console.log(`\x1b[31m✗ ${rel}:${line} expected ${checkId}, got ${hit.checkId}\x1b[0m`);
            failures++;
        }
    }
    for (const issue of actual) {
        checked++;
        if (!expected.has(issue.line)) {
            console.log(`\x1b[31m✗ ${rel}:${issue.line} unexpected ${issue.checkId}: ${issue.message}\x1b[0m`);
            failures++;
        }
    }
}

if (failures === 0) {
    console.log(`\x1b[32m✓ template-lint fixtures pass (${checked} assertions, ${files.length} files)\x1b[0m`);
    process.exit(0);
} else {
    console.log(`\x1b[31m✗ ${failures} fixture failure(s)\x1b[0m`);
    process.exit(1);
}

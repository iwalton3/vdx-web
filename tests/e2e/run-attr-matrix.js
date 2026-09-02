/**
 * Drives tests/attr-matrix/ in a real browser and prints the triage table.
 * Measurement only - it changes nothing and asserts nothing.
 */
const puppeteer = require('puppeteer');

const URL = process.env.MATRIX_URL || 'http://localhost:9000/tests/attr-matrix/';

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const logs = [];
    page.on('console', m => logs.push(m.text()));
    page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));

    await page.goto(URL, { waitUntil: 'networkidle2' });
    await page.waitForFunction('window.__MATRIX__ !== undefined', { timeout: 120000 });
    const r = await page.evaluate(() => window.__MATRIX__);
    await browser.close();

    if (r.error) {
        console.error('HARNESS ERROR:', r.error);
        console.error(r.stack);
        logs.slice(0, 20).forEach(l => console.error('  ', l));
        process.exit(1);
    }

    console.log(`\n${r.cells} cells walked, ${r.rows.length} disagreements\n`);

    if (process.env.SHOW_CLASS) {
        console.log('--- DOM classification (derived, not a hand-kept list) ---');
        const seen = new Set();
        for (const c of r.classifications) {
            const k = `${c.kind}|${c.attr}`;
            if (seen.has(k)) continue;
            seen.add(k);
            if (c.kind !== 'native' && c.kind !== 'native-input') continue;
            console.log(`  ${c.kind.padEnd(13)} ${c.attr.padEnd(16)} ${String(c.domKind).padEnd(9)} off=${JSON.stringify(c.offValue)} default=${JSON.stringify(c.defaultIdl)}`);
        }
        console.log('');
    }

    // Baseline diff. The residue is not zero and will not be: some cells are
    // deliberate (itemscope normalisation), some are the browser's own doing
    // (cssText adds a trailing ';'), some are probe artifacts. Recording them
    // is what makes a CHANGE in the residue loud - without this the matrix is a
    // one-shot audit that silently rots as soon as anyone edits a sink.
    const fs = require('fs');
    const path = require('path');
    const BASELINE = path.join(__dirname, '..', 'attr-matrix', 'expected-disagreements.json');
    const sig = row => `${row.kind}|${row.attr}|${row.source}|${row.oracle}|${row.got}|${row.want}`;
    const current = r.rows.map(sig).sort();

    if (process.env.UPDATE_BASELINE) {
        fs.writeFileSync(BASELINE, JSON.stringify(current, null, 1) + '\n');
        console.log(`baseline updated: ${current.length} entries`);
    } else if (fs.existsSync(BASELINE)) {
        const expected = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
        const exp = new Set(expected);
        const cur = new Set(current);
        const added = current.filter(x => !exp.has(x));
        const removed = expected.filter(x => !cur.has(x));
        if (added.length || removed.length) {
            console.error(`\nBASELINE DRIFT: ${added.length} new, ${removed.length} resolved`);
            added.forEach(x => console.error('  NEW      ' + x));
            removed.forEach(x => console.error('  RESOLVED ' + x));
            console.error('\nA new row is a regression. A resolved row is a fix worth recording.');
            console.error('Re-run with UPDATE_BASELINE=1 once the change is intended.');
            process.exitCode = 1;
        } else {
            console.log(`baseline matches (${expected.length} known disagreements)`);
        }
    }

    const byKind = {};
    for (const row of r.rows) (byKind[row.kind] ||= []).push(row);

    for (const [kind, rows] of Object.entries(byKind)) {
        console.log(`=== ${kind} (${rows.length}) ===`);
        for (const row of rows) {
            const tag = row.oracle === 'parser' ? '[parser]' : '[rule]  ';
            console.log(`  ${tag} ${row.attr.padEnd(16)} ${row.source.padEnd(12)} got ${row.got}`);
            console.log(`           ${''.padEnd(16)} ${''.padEnd(12)} want ${row.want}`);
        }
        console.log('');
    }
    const nLogs = logs.filter(l => /error|warn|refus/i.test(l));
    if (nLogs.length) {
        console.log(`--- ${nLogs.length} console warnings/errors (first 5) ---`);
        nLogs.slice(0, 5).forEach(l => console.log('  ', l.slice(0, 160)));
    }
})();

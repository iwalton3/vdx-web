#!/usr/bin/env node
/**
 * Build the targeted release zips for a VDX release.
 *
 * Run from the repo root AFTER regenerating dist (node tools/bundler-esm.js):
 *
 *     node tools/make-release-zips.js
 *
 * Produces release/ (gitignored):
 *   vdx-core.zip       framework only            (lib/core + framework.js + dist/framework.js)
 *   vdx-framework.zip  framework+router+utils    (all of lib/ + dist/, no ui)
 *   vdx-ui.zip         UI component library      (ui/ + styles/ + componentlib.d.ts)
 *   vdx-full.zip       everything vendorable     (lib/ + dist/ + ui/ + styles/)
 *   vdx-tools.zip      build & PWA tooling       (bundler, optimizer+lint, spider, pwa/)
 *
 * Every zip unpacks into a single `vdx/` folder (matching the landing
 * quickstart's `./vdx/lib/framework.js` import) and carries LICENSE.md,
 * CHANGELOG.md, and a generated README.txt. Asset filenames are unversioned
 * so GitHub's stable releases/latest/download/<asset> URLs keep working;
 * the version lives in the bundle banners, CHANGELOG, and README.txt.
 *
 * Requires the system `zip` binary (no npm dependencies).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const baseDir = process.cwd();
const releaseDir = path.join(baseDir, 'release');

function fail(msg) {
    console.error(`Error: ${msg}`);
    process.exit(1);
}

if (!fs.existsSync(path.join(baseDir, 'lib', 'framework.js'))) {
    fail('run from the repo root (lib/framework.js not found)');
}

const versionMatch = fs.readFileSync(path.join(baseDir, 'lib', 'framework.js'), 'utf-8')
    .match(/export const VERSION = '([^']+)'/);
if (!versionMatch) fail('no VERSION export found in lib/framework.js');
const version = versionMatch[1];

// Sanity: dist must be stamped with the same version (stale dist = wrong release)
const distHead = fs.readFileSync(path.join(baseDir, 'dist', 'framework.js'), 'utf-8').slice(0, 120);
if (!distHead.includes(`v${version}`)) {
    fail(`dist/framework.js banner does not match v${version} - run node tools/bundler-esm.js first`);
}

/**
 * Zip definitions: entries are repo-relative files or directories, copied
 * into the staging root preserving their repo-relative paths.
 */
const ZIPS = {
    'vdx-core': {
        title: 'VDX framework core',
        contents: ['lib/core', 'lib/framework.js', 'lib/framework.d.ts',
                   'dist/framework.js', 'dist/framework.js.map'],
        readme: 'The reactive component framework only.\n' +
                'Vendor as-is and import ./vdx/lib/framework.js (readable source)\n' +
                'or ./vdx/dist/framework.js (minified bundle, source map included).'
    },
    'vdx-framework': {
        title: 'VDX framework + router + utils',
        contents: ['lib', 'dist'],
        exclude: ['lib/componentlib.d.ts'],
        readme: 'The framework plus router, utils, windowing, gestures, and the\n' +
                'opt() build-time optimizer - everything except the UI library.\n' +
                'Import from ./vdx/lib/*.js (source) or ./vdx/dist/*.js (bundles).'
    },
    'vdx-ui': {
        title: 'VDX UI component library (cl-*)',
        contents: ['ui', 'styles', 'lib/componentlib.d.ts'],
        // Showcase-gallery support files (~210 KB), not library code - nothing
        // in ui/ imports them; only site/showcase does. vdx-full keeps them.
        exclude: ['ui/example-components.js', 'ui/examples.js'],
        readme: 'The cl-* UI component library and shared styles. Requires the\n' +
                'vdx-framework zip unpacked alongside it (NOT vdx-core alone):\n' +
                'components import ../../lib/framework.js, and the virtual-list and\n' +
                'gesture components also import ../../lib/windowing.js / gestures.js.'
    },
    'vdx-full': {
        title: 'VDX complete vendorable set',
        contents: ['lib', 'dist', 'ui', 'styles'],
        readme: 'Everything vendorable: framework, router, utils, windowing,\n' +
                'gestures, the full cl-* UI library, and shared styles.\n' +
                'This matches the landing-page quickstart layout.'
    },
    'vdx-tools': {
        title: 'VDX build & PWA tooling',
        // Node scripts, no npm dependencies. optimize.js imports template-lint.js,
        // which imports lib/core/html-parser.js (its only lib dep - self-contained),
        // so both ship too; sw.js consumes the manifest spider-deps.js generates.
        contents: ['tools/bundler-esm.js', 'tools/optimize.js', 'tools/template-lint.js',
                   'tools/spider-deps.js', 'lib/core/html-parser.js', 'pwa'],
        readme: 'Build-time and PWA tooling (Node scripts, zero npm dependencies):\n' +
                '  tools/bundler-esm.js   bundle lib/ into single-file ESM + source maps\n' +
                '  tools/optimize.js      opt() build-time optimizer + template-lint CLI\n' +
                '  tools/template-lint.js template linter (also required by optimize.js)\n' +
                '  tools/spider-deps.js   crawl ES module imports -> cache-manifest.json\n' +
                '  pwa/sw.js              generic versioned offline service worker\n\n' +
                'Run each with `node vdx/tools/<script>.js`. sw.js caches the files\n' +
                'listed in the manifest spider-deps.js produces. Unlike the other\n' +
                'zips this carries no runtime code - drop it beside a vendored vdx/.'
    }
};

const COMMON_FILES = ['LICENSE.md', 'CHANGELOG.md'];

fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });

console.log(`VDX release zips - v${version}\n`);

for (const [name, def] of Object.entries(ZIPS)) {
    const stageRoot = path.join(releaseDir, '.stage');
    const stage = path.join(stageRoot, 'vdx');
    fs.rmSync(stageRoot, { recursive: true, force: true });
    fs.mkdirSync(stage, { recursive: true });

    for (const entry of def.contents) {
        const src = path.join(baseDir, entry);
        if (!fs.existsSync(src)) fail(`${name}: missing ${entry}`);
        const dest = path.join(stage, entry);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.cpSync(src, dest, { recursive: true });
    }
    for (const entry of def.exclude || []) {
        fs.rmSync(path.join(stage, entry), { force: true });
    }
    for (const f of COMMON_FILES) {
        fs.copyFileSync(path.join(baseDir, f), path.join(stage, f));
    }
    fs.writeFileSync(path.join(stage, 'README.txt'),
        `${def.title} - v${version}\n` +
        `https://vanilladx.dev\n` +
        `https://github.com/iwalton3/vdx-web\n\n` +
        `${def.readme}\n\n` +
        `Docs: https://github.com/iwalton3/vdx-web/tree/main/docs\n` +
        `Tutorial: https://vanilladx.dev/site/tutorial.html\n` +
        `License: MIT (see LICENSE.md)\n`);

    const zipPath = path.join(releaseDir, `${name}.zip`);
    execFileSync('zip', ['-X', '-q', '-r', zipPath, 'vdx'], { cwd: stageRoot });
    fs.rmSync(stageRoot, { recursive: true, force: true });

    const kb = (fs.statSync(zipPath).size / 1024).toFixed(0);
    console.log(`  ✓ ${name}.zip (${kb} KB)`);
}

console.log(`\nDone - assets in release/. Attach to the GitHub release for v${version}:`);
console.log('  gh release create v' + version + ' release/*.zip --title "VDX v' + version + '" --notes-file CHANGELOG.md');

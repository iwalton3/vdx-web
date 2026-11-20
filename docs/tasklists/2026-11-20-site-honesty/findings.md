# findings.md — 2026-11-20-site-honesty

**Itemized by the session** from a diffuse input: the owner's request ("more honest, less one-sided,
feel less like it was auto-generated") and the session's survey of `index.html`,
`site/embedding/index.html` and all 20 tutorial chapters (`site/tutorial/chapters/`). Each item is
what the session took to be one; the owner may say otherwise. Numbers measured on `main` @ 9ede2ad.

## Source: session survey, 2026-11-20

### F1 — framework size claim is stale at four sites
`index.html:475` "~27 KB gzipped"; `site/tutorial/chapters/18-production.js` "~27 KB gzipped";
`site/embedding/index.html` stat "23 KB" and pain-vdx "Vendor a 23 KB file". Measured:
`gzip -c dist/framework.js | wc -c` → 31,963 B (gzip -9: 31,883). History: v1.0.0 28,251 B,
v1.2.0 31,766 B. The 27 KB figure was set in 7810748 (v1 readiness sweep) and has drifted since;
23 KB predates it.

### F2 — "~33 KB with the router and utils" (`index.html:475`)
framework + router + utils = 31,963 + 4,104 + 3,037 = 39,104 B.

### F3 — "the readable core is about 8,000 lines" (`index.html:476`)
`cat lib/core/*.js | wc -l` → 9,301 (includes blanks and comments). CLAUDE.md says ~8,200.

### F4 — chapter 13 lint id list omits t13/t14
`site/tutorial/chapters/13-best-practices.js` lists t7–t12; `t13-bool-false` and `t14-bool-string`
exist (CLAUDE.md Banned Patterns). Ch 19 "~600 tests" is within rounding (CLAUDE.md ~620).

### F5 — comparison table is one-sided (`index.html:373-399`)
VDX loses no row. Compared against React, vanilla JS and htmx only — not the nearest build-less
peers (Lit, Preact+htm, Alpine, petite-vue / Vue from a CDN). Contestable cells: React "Build step:
Required" (red); React two-way binding "Manual" (red); htmx TypeScript "—" (red). The embedding page's
"Framework off a CDN … usually still wants a compile step for JSX/SFC" is the same claim (Lit,
Preact+htm and Vue's in-browser templates do not).

### F6 — supply-chain claims overstate
"Supply-chain surface: None" (table), "No installer to trust" (quickstart sub), "Nothing to compromise
on npm update, because there is no npm" — beside a `curl -LO` of a release zip from one maintainer's
GitHub. The true claim is narrower: one reviewable source, no transitive tree.

### F7 — durability promises contradict the site's own update FAQ
"no rot" (hero eyebrow); "Runs the same in five years as it does today" (ship card); "Survives a
framework era: Vendored" (table); embedding "nothing to upgrade later" — vs FAQ "How do I update a
vendored copy?" and versioned releases with release notes.

### F8 — no limitations or bad-fit content anywhere on the landing or embedding pages
Real costs the repo itself documents and the pages omit: no SSR; one maintainer, small ecosystem;
no shadow DOM, so no style isolation; global custom-element registry (one definition per tag);
unbundled ES modules mean a request per module unless you use `dist/`; banned patterns that throw at
render (`.map()` in templates, Lit/Vue sigils, inline handlers); literal `disabled="false"` is
disabled; reactive proxies leak on identity and can't go to IndexedDB/structuredClone; evergreen
browsers only. The tutorial does carry most of these (ch 3, 5, 13, 15) — the marketing pages carry
none.

### F9 — "ai-native" framing
Hero eyebrow "ai-native" and a whole section ("An agent can read the whole thing"). Whether this
framing stays is a positioning call.

### F10 — unbacked assertions
"the commit history is the proof" (FAQ); "It's small and honest" (FAQ); "an afternoon, not an
archaeology project" for 9.3k lines; ch 11 "VDX is fast by default" (unmeasured on the page);
ch 19 "refreshingly plain"; ch 16 "behave exactly like your own components"; ch 17 "never janks a
scroll"; ch 10 "one of VDX's core strengths"; ch 18 "which is the entire point".

### F11 — templated structure and voice on the landing and embedding pages
Every section: mono eyebrow, punchy H2, one-line sub, three-card grid. Taglines in the
"X. Y. No Z." rhythm ("One file. One tag. Live."; "no build · no deps · no rot · ai-native";
"one file, one tag, no tax"). The only owner-authored copy edits (abf39e4, c0620f5) moved toward
plainer, descriptive wording; the rest of the copy was Claude-coauthored.

### F12 — repetition across sections
"No shadow DOM, inspect it in DevTools" appears in the features grid, the ai-native section and the
security section (and again in tutorial ch 14, 16, 19). The case against `node_modules` is made in the
hero tree, the ship section, the features grid and the table.

### F13 — "no npm / no toolchain" vs optional tooling that needs Node
Landing "No installer to trust, no toolchain to set up"; ch 13 says to run the template lint in CI
(`node tools/template-lint.js`); the optimizer, bundler and `spider-deps` are Node scripts. True
claim: nothing to *install*, no npm; the optional tools need a Node binary.

### F14 — legacy `site/playground.html`
Old-style page ("🎪 Framework Component Playground"), not in the site nav but linked from
`README.md:137` and `examples/personal/apps.json:62`. Different visual and verbal register from the
rest of the site.

### F15 — embedding quickstart snippet uses a class-field `state = { n: 0 }`
`site/embedding/index.html` "Vendor it in three lines". Every other example assigns `this.state` in
the constructor; ch 8 tells readers to ("Assign this.state in the constructor"). It runs for
components (lib/core/component.js:536-563 wraps it), but contradicts the house style the tutorial
teaches.

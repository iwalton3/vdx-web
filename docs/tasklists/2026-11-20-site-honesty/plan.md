# Plan — site honesty restructure

**Run:** `2026-11-20-site-honesty`, record `docs/tasklists/2026-11-20-site-honesty/` (owner.md,
sort.md, decisions.md, findings.md). Commits implementing this plan carry
`Work-plan: 2026-11-20-site-honesty`.
**Branch:** `site-restructure`, cut from `main` @ 9ede2ad.
**Goal, the owner's words:** "make it more honest, less one-sided, and feel less like it was
auto-generated" — "more like a showcase/explanation and less like a cookie cutter landing page from
a marketing dept".
**Already landed:** nothing but the record. No site file has changed.
**Mock-up (reference, not the spec):** https://claude.ai/artifact/EKG8z2AopnVCQjcXcMT45E. This plan
describes each section in its own words. Where the plan and the mock-up differ, the plan wins.

## How the copy gets written (owner, turn 1 #3)

"we collaboratively lay out what the site will look like, then I phrasing check and possibly
rewrite the load-bearing parts". So:

- **Owner text (OT)** is used word for word, quoted below from `owner.md`. There are exactly two
  grammar fixes, both approved in the decision log: "React and Svelte framework" →
  "React and Svelte frameworks"; "There's no additional packages" → "There are no additional
  packages". Nothing else in an OT block is edited.
- **Session text (ST)** is drafted by the implementer. Use plain statements and short sentences.
  Avoid slogans, three-beat taglines ("One file. One tag. Live."), mono "eyebrow" tags, card grids
  used as decoration, "not X, but Y" constructions and em-dash asides. The owner phrase-checks all
  ST in the diff before merge.

## 1. Numbers that check themselves (A, A2 — owner: "A node check")

1. Add `tests/node/site-numbers.mjs` (node builtins only: `fs`, `zlib`, `path`).
   - **Measure:** the gzip size of `dist/framework.js`; the gzip size of framework + `router.js` +
     `utils.js`; and the count of unique `defineComponent('cl-…'` names under `ui/`.
   - **Claims it reads:** every element carrying `data-measure="<key>"` in `index.html` and
     `site/**/*.{html,js}`. Keys: `framework-gz`, `framework-router-utils-gz`, `ui-count`. Parse the
     element's leading number.
   - **Fail** when a claim is more than 10% off the measurement, or when a `data-measure` key is
     unknown. Print each claim with its file, its line and the measured value.
   - **Also fail on unmarked figures:** any `\d+(\.\d+)?(&nbsp;| )KB` in those files outside a
     `data-measure` element. That way a new hand-typed figure can't skip the check.
2. Run it from `tests/e2e/run-framework-tests.js` right after `dist-check.mjs` (line ~27, same
   pattern), and list it in CLAUDE.md's "Running Tests" block.
3. **Red on the claim (T1):**
   - Write the script first and run it on the current tree before touching any page. It must fail,
     naming the unmarked `~27&nbsp;KB` (index.html:475, ch 18:67) and `23&nbsp;KB`
     (site/embedding/index.html:183, plus the stat block). That failure is the red.
   - After step 2's page work: green.
   - Then set one `data-measure` value to 27, watch it fail, restore it, and write that down in the
     commit message.
4. Every size figure on the site gets a `data-measure` wrapper. Current values: framework ~32 KB
   gzipped; with router and utils ~39 KB; 63 `cl-*` components. "60+" passes as 60.
5. The new page states no line count, so the core line count is not measured. The FAQ that held it
   is removed.

Agent cost: none. It is a node script.

## 2. The landing page (`index.html`), rebuilt section by section

The page stays a VDX page served with no build step. It keeps `site/landing/landing.js`
(`landing-live`, `vdx-hero-demo`), the existing colour tokens, the system font stack and the theme
toggle.

**Removed:**
- the hero "tree" card;
- the "What actually lands in your repository" ship section;
- the features grid;
- the comparison table;
- the "ai-native" section (it becomes §2.7);
- the "Defense in depth" section (it becomes one line in §2.5);
- the FAQ (owner: "drop the FAQ, no one has actually asked those questions");
- every `.eyebrow`.

`site/landing/examples/binding/` and `site/landing/examples/safe/` lose their only references
(index.html:344, :445). Delete them if `rg` finds no other reference.

**Head:**
- `<title>` stays as the owner set it, "VDX Build-less Component Framework" (c0620f5).
- The meta description becomes one plain ST sentence derived from §2.1's OT.

**Nav:** VDX · Tutorial · Components (/site/showcase/) · Docs · Playground
(/site/tutorial/playground.html) · GitHub · theme toggle. No CTA button.

### 2.1 What it is
- **Heading (ST):** plain, e.g. "VDX, a component framework that runs from plain files".
- **OT `what-it-is`:**
  > VDX is a modern web application framework that aims to keep the "vanilla" experience of deploying the same files you edit directly, while having a feature set comparable to modern React and Svelte frameworks such as two-way data binding, stores, and components. There's no required build step or npm dependencies, so the code you write now should "just work" five years from now. It's batteries included, with a UI library, router, offline service worker, and optional linter/typescript support included.
- `<vdx-hero-demo>` with a one-line ST caption.
- Two plain links: Tutorial, Components.

### 2.2 What writing it looks like
- ST: two or three sentences (a component is a class, state is a plain object, templates are tagged
  literals).
- `landing-live` for `site/landing/examples/counter`.
- One ST sentence on stores, then `landing-live` for `site/landing/examples/stores`.
- One ST line pointing to the tutorial.

### 2.3 What you're trusting
- **OT `trust`:**
  > VDX is maintained by a single party using AI assistance. There are no additional packages or delicate dependency chains to trust. There's one changelog for everything, and having been through several breaking change cycles forced on me before by other libraries, I have a commitment to avoiding breaking changes unless something was already obviously broken.
- ST: one or two sentences on vendoring (copy the folder in, commit it, update by replacing it and
  reading the release notes). Then the `your-app/vdx/{lib,ui,styles}` tree and the `curl` +
  `unzip` release command from the current quickstart.
- ST: one sentence on `dist/framework.js` as a single-file option, with `data-measure` figures.
- The mock-up's "designed to resist rot" paragraph is **not** carried over (owner: "redundant to
  the opening paragraph").

### 2.4 It drops into what you already have (id `embed`; replaces the embedding page, §3)
- ST: components are custom elements, so they work in any HTML page. Name the owner's cases:
  .NET, Apache/cPanel, static site generator output.
- A short HTML snippet of an existing page with one tag and one module script. Use constructor
  state if the snippet shows a class (item I).
- ST list:
  - any web server works in hash-routing mode (owner, turn 2), e.g. Apache, nginx, IIS, GitHub
    Pages, `python3 -m http.server`;
  - HTML5 routing needs the rule that serves `index.html` for unknown paths;
  - `json-*` attributes read data from a `<script type="application/json">` block.
- `landing-live` for `site/embedding/examples/embed` (the one-file live demo).
- **The four worked demos,** one ST line each, linked to:
  `site/embedding/static-integration-demo.html`, `site/embedding/jellyfin-modal-demo.html`,
  `site/embedding/pwa-offline/`, `site/embedding/test-bundle.html`.
- A link to `site/embedding/COMPARISON.md` on GitHub.

### 2.5 What's in the box
- **ST list:**
  - **UI library:** `data-measure="ui-count"` components, linked to the showcase.
  - **Router:** hash/HTML5, lazy routes, deny-by-default guards.
  - **Offline:** service worker template + manifest tool.
  - **Interactive lists:** windowed scroll, drag-reorder on desktop and touch, multi-select,
    long-press and right-click menus, taken from the music player's queue.
  - **Security, one line:** template values are escaped by default, and raw HTML needs an explicit
    `raw()`; links to tutorial ch 14.
- **New live demo:** `landing-live` for `site/landing/examples/lists/` (§4).

### 2.6 Built with it
- **Rows:**
  - mrepo-web (github.com/iwalton3/mrepo-web), a music player;
  - codemap (github.com/iwalton3/codemap);
  - "my personal website" (`/examples/personal/`), the launcher and small tools.
- **"Before and after."** On the left, "my old personal website (2019)" (owner: refer to
  swapi-svelte "along the lines of 'my old personal website'"; don't name or link the repo). It
  shows:
  - svelte, rollup 1, babel, node-sass 4, core-js;
  - 22 dev dependencies;
  - a 270 KB `package-lock.json`;
  - two rollup configs.

  On the right, its VDX replacement: no package.json and no build config.

  These figures describe an archived repo and don't drift, so they carry no `data-measure`.
  "270 KB" is not a bundle size: the regex in §1.1 must not match it. Write it as "270&#8239;KB
  lockfile", or exclude it with a `data-measure-skip` attribute that the script honours. Pick one,
  and the check's own test proves it.
- **OT `before-after`:**
  > The old website is a great example of web framework archeology. 5 years later, and the whole build system moved and there's a major version of half the packages. With a mile-long package-lock.json, it is easier just to start from scratch, and VDX aims to make it the last time you have to do that.
- **OT `stability`,** with the owner's sentence from batch 1 #1 added after the first sentence
  ("Something along the lines of"). Use it as given unless the owner rewords it in review:
  > VDX doesn't claim to never break backwards compatibility, but it does it for good reason. The framework did have several extensive changes in the early (pre-v1) experimental phase, but the design is now largely settled. Working patterns will generally continue to work, while if something appears off or needs a workaround, it will get fixed.

### 2.7 Agents can work on it (replaces "ai-native"; owner turn 2)
- ST, one or two sentences: `FRAMEWORK.md` describes the whole model in one file, and agents work
  both on apps built with VDX and on the framework itself. Say "most of its commits were made with
  an agent". That stays true (224 of 355 today) and doesn't drift the way a count does.
- **OT `abandonment`:**
  > Since the project is extensively documented, has thorough unit/e2e tests, and is already developed by agents, anyone can maintain the framework even if the maintainer steps away.
- The ST must not restate the OT's point.

### 2.8 What this isn't (owner: all six kept)
Six short items, ST drafts from the mock-up. The owner phrase-checks them.
- **Not server-rendered:** no SSR; keep SEO content as static HTML and put components into it.
- **Not a large ecosystem:** one maintainer, no plugin market; React/JSX libraries won't drop in.
- **Not style-isolated:** no shadow DOM, so page CSS reaches into components. This is the page's
  only no-shadow-DOM mention (G).
- **Not for old browsers:** current desktop and mobile browsers only.
- **Not free of rules:** a few template patterns throw, and the lint catches them. The optional
  lint, optimizer and bundler are Node scripts with nothing to install.
- **Not frozen:** the owner's rule, "don't break correct defined behavior of the framework, if
  something feels broken or like a workaround it could change", stated plainly.

### 2.9 Footer
VDX · MIT · Tutorial · Components · Docs · GitHub. Nothing else.

## 3. The embedding page folds into §2.4 (owner, batch 1 #3)

- Replace `site/embedding/index.html` with a minimal stub: `<meta http-equiv="refresh"
  content="0; url=/#embed">` plus a plain link. Old external links keep working.
- Repoint the internal links to `/#embed`:
  - `site/tutorial/chapters/18-production.js:73`;
  - `examples/personal/apps.json:55`;
  - `docs/pwa.md:14` (repoint to `/site/embedding/pwa-offline/` instead, since that's what the
    sentence is about).
- The worked-demo pages and `COMPARISON.md` stay where they are.

## 4. New list demo: `site/landing/examples/lists/`

- `App.js` + `index.html` in the multi-file runner contract (imports `vdx/lib/...`).
- Build it from `ui/examples.js` `reorderPlayground` (line ~2349), composing `createWindowing`,
  `createRowGestures` and `cl-context-menu`. **Copy the full source.** The showcase's displayed
  source is an abbreviated fragment that errors when run.
- Use 10,000 rows. Follow the passive-safety table at the top of `lib/gestures.js`.
- **Check:** in a browser at desktop and phone widths, scroll, drag a row, right-click or long-press
  a row, and confirm the menu opens and the list stays windowed (DOM row count stays small). There's
  no e2e test, so the check is manual, and that is stated in the commit message.

## 5. Small fixes

- **J:** `site/tutorial/chapters/13-best-practices.js`, the check-id list gains `t13-bool-false`
  and `t14-bool-string`.
  Check: `rg -c "t13-bool-false|t14-bool-string" site/tutorial/chapters/13-best-practices.js` → 0
  before, ≥2 after.
- **I:** constructor state in every class snippet on the page (§2.4). It's moot if the snippet has no
  class.
  Check: `rg -n "^\s*state = \{" index.html site/embedding` → 0.

## 6. Tutorial and blurb pass (owner: "an accuracy and clarity pass")

Read all 20 chapters. For each claim, check it against the code or docs. Reword promotional lines
to plain statements, or cut them. Leave teaching content alone unless it's inaccurate. Known lines:

| Chapter | Line |
|---|---|
| ch 10 | callout "one of VDX's core strengths" |
| ch 11 | lead "VDX is fast by default" |
| ch 16 | lead "behave exactly like your own components"; "60+" gets `data-measure` |
| ch 17 | "never janks a scroll" |
| ch 18 | "which is the entire point"; the 27 KB figure gets `data-measure` |
| ch 19 | "refreshingly plain"; "~600 tests" → a floor such as "over 600 tests", checked against the current suite count |

Also `examples/personal/apps.json`: the ComponentLib blurb ("30+ components … PrimeReact-level
features") becomes a plain, accurate line.

Each change is visible in the diff for the owner's phrase check. Agent cost: none (a one-off pass
by the implementing session).

## 7. Order of work

1. §1 script, red on the current tree.
2. §4 list demo, so §2.5 has something to embed.
3. §2 landing rebuild, including §5 I.
4. §3 embedding stub and link repoints.
5. §6 tutorial and blurb pass, including §5 J.
6. §1 green, plus the injected-stale-value red.
7. Done-checks (§8).
8. Hand the diff to the owner for the phrase check.

## 8. Done means (decision log; run all of these before the work is called done)

- `node tests/node/site-numbers.mjs` → pass.
- `node tests/node/dist-check.mjs` → pass. dist/ is untouched by this plan; this confirms it.
- `node tools/template-lint.js lib ui site examples` → no new findings. It prints a non-zero file
  count.
- `cd tests/e2e && node run-framework-tests.js` → green. This also runs the two node checks.
- `cd tests/e2e && node test-runner.js --only-errors` → green.
- In a browser (test server on :9000): `/`, `/site/embedding/` (redirects), and tutorial ch 10, 11,
  13, 16–19. Check:
  - at about 400 px and about 1200 px;
  - in light and dark;
  - every `landing-live` loads and runs;
  - no horizontal scroll;
  - no console errors.
- **The goal's own measure is the owner's phrase check** of every OT and ST block in the diff. The
  work is not called done before it. A green suite says nothing about "honest" or "less
  auto-generated".

## Decided instead of asked (each logged and shown to the owner, who answered "No, it's fine")

- Replacement numbers come from measurement. The check is the owner's pick.
- The two grammar fixes in OT blocks.
- The before/after section replaces the comparison table. This is the session's reading of the
  owner's turn 1 ("unsure what to replace it with"); the owner then rewrote the before/after copy.
- Security is reduced to one line, and the no-shadow-DOM mention appears once.
- The page stays built in VDX with the existing tokens and fonts.
- The embedding page becomes a homepage section plus a redirect stub. This is the session's reading
  of "trim and shrink to a section". The stub is the session's choice, so external links don't
  break.
- "Most of its commits" instead of a count.
- Unused landing example dirs are deleted.

## Out of scope

- `site/playground.html`: left as is and not linked from the new site. Its README.md and apps.json
  links are untouched (session's reading of "Leave it, don't bother linking to it").
- README.md copy, `docs/`, the showcase and playground pages: not reviewed in this run.
- Downstream vendored copies (mrepo-web, codemap): this plan changes no `lib/`, `dist/` or `tools/`
  file they vendor, except the new test script, which they don't carry.

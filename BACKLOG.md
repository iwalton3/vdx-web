# Backlog

Working notes for maintainers — not shipped documentation. The full pre-v1
design rationale (API shape decisions, adversarial-review history, hardening
notes) lived in `V1-PLAN.md`, closed out at v1; see git history for the final
version.

## v1 release-cut checklist

The code, docs, and tutorial are release-ready; these are the remaining
mechanics for cutting the tag:

- [x] `export const VERSION` from framework.js; version banner comment in dist
      bundles (bundler stamps it from the framework.js export; source maps
      line-shifted to stay valid)
- [x] `CHANGELOG.md` (first entry: v1.0.0)
- [ ] Git tag `v1.0.0` (after downstream port verification) + GitHub release:
      `node tools/make-release-zips.js && gh release create v1.0.0 release/*.zip
      --title "VDX v1.0.0" --notes-file CHANGELOG.md`
- [x] Targeted zips: `tools/make-release-zips.js` → release/ (gitignored) —
      vdx-core / vdx-framework (+router+utils+windowing+gestures+opt) /
      vdx-ui (pairs with vdx-framework; showcase example files excluded) /
      vdx-full. Each unpacks to `vdx/` with LICENSE, CHANGELOG, README.txt.
- [x] Landing quickstart points at `releases/latest/download/vdx-full.zip`
      (clone + copy kept as the alternative)
- [x] Private deployment `__VDX_LS_PREFIX = 'swapi'` guard — already in both
      apps' index.html (public mrepo-web + private music) since the v1 adopt
      sync; kept here as a reminder for any OTHER deployment with pre-v1
      persisted data

## Post-v1: consciously deferred features

- **Class-store persistence** (`static persist = 'cart-v1'`, opt-in cross-tab
  sync via `static persistSync`) — phase 2 of class stores; additive.
- **`onFulfill` / settle-gate kernel and a `mode:` option for `createTask`**
  (`'latest' | 'drop' | 'queue'`, the ember-concurrency taxonomy) — reserved
  extension points; ship when something real asks. Two open policy questions
  for any queue mode: reject-skips-or-halts, and queued runs being blind to
  predecessors' failures.
- **`resource(depsFn, fetcher)`** (async computed, Solid-style) — buildable on
  createTask additively; not freezing a third async idiom at v1.
- **Handler closure freshness unification** — top-level inline handlers freeze
  their first-render closure (deliberate: function-valued props like
  `renderItem` need stable identity to avoid child re-render churn); handlers
  inside each()/nested templates re-read per event. Documented in
  docs/templates.md ("read state at call time"). A post-v1 design could give
  *event positions* getter freshness while keeping *prop positions* stable —
  needs its own perf-verified change.

## Post-v1: known small issues (LOW, from the 2026-07-12 review)

- Parser edges: unquoted attr values containing `/` truncate (`href=/docs`);
  a `${x}` after a bare boolean attribute becomes that attribute's value;
  `</div junk>` never closes the element; multiline templates keep boundary
  whitespace text nodes (defeats toKeyedChild's single-element unwrap for
  multiline each() items — falls back to the fragment path, works but skips
  the keyed-element optimization).
- opt.js: default-param arrows (`${(a = f()) => ...}`) get wrapped as contain
  vnodes (breaks the handler); dead `inString` tracking in extractExpressions;
  a regex literal containing `//` is misparsed as a comment.
- Duplication worth consolidating: store.js re-implements component-class.js's
  prototype scan + dep-free-getter fallback; utils `memoize` vs reactivity
  `memo`; windowing/gestures' identical `resolve()`/`resolveNum()` helpers.
- Misc: x-await-then retains a detached element via a never-settling promise's
  .then closure; utils `fetchJSON` forces Content-Type on GETs (extra CORS
  preflights); utils `throttle()` drops the trailing call; debug.js
  vnodeToString/diffVNodes expect a vnode shape the framework never produces.
- Unconfirmed: a template compiled before its component's `defineComponent()`
  runs may cache `isCustomElement: false` (children not deferred) — needs a
  browser repro against lazy-loading scenarios.

# decisions.md — 2026-11-20-site-honesty

First pass (Z14), from `sort.md` and `owner.md` alone. Nothing measured yet beyond what the survey
already measured. Nothing in this log has landed: on a todo list, nothing lands before the owner has
seen it (Z2).

## The log — decided by the session

### Level 8
- **A — stale numbers** (6 sites). Replace with measured values: framework ~32 KB gzipped; with
  router + utils ~39 KB; core ~9,300 lines (counted with comments and blanks, and the copy says so).
  Settled by: measurement. Check: `rg -n "27&nbsp;KB|27 KB|23&nbsp;KB|23 KB|33&nbsp;KB|8,000 lines" index.html site`
  → 6 hits now, 0 after. The final sentences are worded after D is decided.
- **I — embedding snippet state.** `state = { n: 0 }` class field → `constructor(props) { super(props); this.state = { n: 0 }; }`.
  Settled by: sibling `site/embedding/examples/embed/index.html:20`, ch 8. Check:
  `rg -n "^\s*state = \{" site/embedding/index.html` → 1 hit now, 0 after; then load the page and click
  the widget, since there is no automated test for it.
- **J — ch 13 lint ids.** Add `t13-bool-false` and `t14-bool-string` to the list. Settled by:
  CLAUDE.md Banned Patterns. Check: `rg -c "t13-bool-false|t14-bool-string" site/tutorial/chapters/13-best-practices.js`
  → 0 now, ≥2 after.

### Level 6
- **C, direction only.** Claims that overstate (F6, F7, F13) get narrowed to what is true, never made
  stronger. Settled by: the owner's stated goal ("more honest, less one-sided"). How the narrowing is
  done is still a decision (below).

### Level-7 changes
None yet.

### To measure
None.

## Decisions left for the owner

Ordered by what depends on what. D comes first because every rewrite's wording depends on it.

1. **D — voice, and who writes the copy** (level 5). Options:
   (a) the owner writes the new copy; the session handles structure, numbers and markup. This costs
   the owner the most time, and the copy is guaranteed to be in their voice.
   (b) the session drafts against a voice reference the owner names (the FAQ, the README, a page they
   like), and the owner edits. Cheaper. It risks sounding generated in a different way.
   (c) the session drafts, cutting rather than adding, and the owner rewrites the lines that still
   sound off. Cheapest. It is closest to the process that produced the current copy.
   Depends on it: the wording of A, C, E and K.
2. **E — limitations content** (level 5): whether to add it, and where (a landing section, FAQ
   entries, or a separate "is VDX a fit?" page), and which costs. The source material is in the repo.
3. **B — comparison table** (level 5): keep it and add the nearest build-less peers plus rows VDX
   loses; replace it with prose ("pick X if…"); or cut it.
4. **F — "ai-native" positioning** (level 5): keep it as a section, demote it to a FAQ entry, or cut it.
5. **C — the rule for half-true claims** (level 5): narrow each to its true part, or drop claims
   that need narrowing. One rule covers F6, F7 and F13.
6. **Suggestion scopes:** A2 (an automated check against number drift: none, a node check, or fewer
   exact numbers); G (repetition: settled by the new structure, or deduplicated explicitly); H (legacy
   playground: restyle, retire, or leave); K (light tutorial pass: yes or no).

---

## Second pass (Z14) — after Discuss First and two question batches

Nothing was marked *to measure*. Measurements taken while planning: old site package.json has 22
devDependencies and a 7,292-line package-lock.json; ch 13's id list is a hand copy of
`ALL_CHECKS` (tools/template-lint.js:953-958); README.md:277 and docs/bundles.md:339-340 carry
hand-typed sizes; links to site/embedding/ sit at index.html:275,538, ch 18:73, apps.json:55,
docs/pwa.md:14.

### The owner's decisions, answered (verbatim in owner.md)
- **D, voice:** collaborative layout; the owner phrase-checks and rewrites load-bearing parts. Six OT blocks supplied.
- **B, table:** goes (turn 1). The before/after section replaces it (session's reading, logged).
- **E, limitations:** "What this isn't", all six items (turn 2, batch 1 #2).
- **F, ai-native:** becomes "agent friendly" (turn 2).
- **FAQ:** dropped (turn 1).
- **Embedding:** "trim and shrink to a section" (batch 1 #3). Session's reading: homepage section plus a redirect stub.
- **A2, numbers:** "A node check" (batch 1 #4).
- **H, old playground:** "Leave it, don't bother linking to it" (batch 2 #1).
- **K, tutorial:** "accuracy and clarity pass" (batch 2 #2).
- **Stability wording:** the owner's sentence (batch 1 #1).

### Log, as printed to the owner before batch 2 ("No, it's fine", batch 2 #3)
- **Numbers:** measured replacements; tests/node/site-numbers.mjs with an injected-stale red.
- **Copy:** OT word for word, with two grammar fixes ("framework" → "frameworks"; "There's no" → "There are no"). Rot paragraph, FAQ and table removed. Before/after replaces the table. Stability OT plus the pre-v1 sentence. ai-native → "Agents can work on it". Security cut to one line. One no-shadow-DOM mention. ch 13 t13/t14. Embed snippet uses constructor state.
- **Build:** stays a VDX page with landing-live, existing tokens and fonts; the mock-up is a reference. Live demos: counter, store, embed, plus a new windowed + reorder list. Embedding becomes a homepage section with a stub.
- **Done means:** framework and componentlib suites, template lint, dist-check, the numbers check, and a browser pass at both widths in both themes.

### Changed after the coherence check (level 7, shown to the owner with the plan)
- No commit count in "Agents can work on it". "Most of its commits" restated the OT.
- J: drop ch 13's hand-copied id list (link to the table) rather than add t13/t14. Owner's tie-break: avoid tech debt.
- The numbers check scans README.md and docs/**/*.md too, also catches MB and component counts, has no skip attribute, and has a `--self-test` per failure branch.
- The lockfile figure is given in lines, not KB.
- **C, rule for half-true claims:** narrow rather than drop. Settled by the owner's own rewrites (each overstated claim was narrowed, none dropped) and the "accuracy and clarity pass" ruling. Previously listed as an owner decision; settled here at level 6 and shown with the plan.
- "Half the packages" (an OT claim) is verified against the npm registry before ship. If it doesn't hold, it goes back to the owner.

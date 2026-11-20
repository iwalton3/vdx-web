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

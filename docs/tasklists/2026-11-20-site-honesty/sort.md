# sort.md — 2026-11-20-site-honesty

**Who sorted it:** one sorter (this session), with the owner reading every item. Categories are
ez-plan's work-item categories: 1 Mechanical, 2 Requires additional design, 3 Suggestion,
4 Not correct as written.

**Purpose (S1), the session's reading and not the owner's:** the public site (landing, embedding
page, tutorial) tells a developer what VDX is and lets them decide honestly whether it fits, then
teaches it. Purpose stated by the owner: `not stated`. Goal, in their words: "make it more honest,
less one-sided, and feel less like it was auto-generated."

## The round

- **Member:** `vdx-web`, `/working/vdx-web` (a worktree of `/home/izzie/repos/vdx-web.git`), branch
  `site-restructure` cut from `main` @ 9ede2ad. It belongs because it holds the site. In-flight
  commit: `none` (tree clean). The input covered `index.html`, `site/embedding/index.html` and
  `site/tutorial/chapters/*.js` as of 9ede2ad.
- **Logical unit of work:** the site restructure (landing + embedding + tutorial copy). Correctable,
  not a question.
- **Walls:** `docs/rules/` — none. PRINCIPLES — `~/.claude/CLAUDE.md` ## PRINCIPLES (1: measure and
  consider a bounded spike before deferring). Project CLAUDE.md has no PRINCIPLES section.
- **Agents launched:** none.
- **Previous round:** no previous round for this unit.

## Items

### A — stale numbers on the pages (covers F1, F2, F3)
Category 1, Mechanical — **defect pattern**: 6 sites.
Command: `rg -n "27&nbsp;KB|27 KB|23&nbsp;KB|23 KB|33&nbsp;KB|8,000 lines" index.html site`
Fix: replace with measured values (framework ~32 KB gz; with router + utils ~39 KB; core ~9,300
lines incl. comments). Settled by: measurement (`gzip -c dist/*.js | wc -c`, `cat lib/core/*.js | wc -l`).
Level 8. No level-5 fork in the fix itself; how to stop it re-drifting is item A2.

### A2 — keep the numbers from drifting again (covers F1, F2, F3)
Category 3, Suggestion — scope is the plan's. Options seen: hand-update at release (status quo);
a node check like `tests/node/dist-check.mjs` that measures `dist/` and fails on a page claim more
than N% off; or state fewer exact numbers. Settled by: none. Level 7.

### J — chapter 13 lint list misses t13/t14 (covers F4)
Category 1, isolated. Site: `site/tutorial/chapters/13-best-practices.js` (the "Findings name their
check id" paragraph). Settled by: CLAUDE.md Banned Patterns lists t13-bool-false, t14-bool-string.
Level 8.

### I — embedding snippet uses a class-field state (covers F15)
Category 1, isolated. Site: `site/embedding/index.html`, "Vendor it in three lines" `<pre>`.
Settled by: sibling — `site/embedding/examples/embed/index.html:20` and every landing example assign
`this.state` in the constructor; ch 8 teaches it. Level 8.

### B — the comparison table (covers F5)
Category 2, Requires design. Which tools to compare against, whether VDX gets rows it loses, and
whether a table is the right form at all. Level 5 (site design). Settled by: none.

### C — claims that overstate (covers F6, F7, F13)
Category 2, Requires design. Direction is given by the owner's goal (narrow the claim to what is
true); what is left is a rule — narrow a half-true claim, or drop it — and the wording, which depends
on D. Level 6 for the direction (owner's stated goal), 5 for the rule.

### D — voice, and who writes the copy (covers F10, F11)
Category 2, Requires design. The fork that sets everything else's wording: the owner writes; the
session drafts against a voice reference the owner names (e.g. the FAQ); or the session drafts and
the owner rewrites. Rewriting generated copy with more generated copy may not reach "feel less
auto-generated". Level 5. Settled by: none. Evidence: abf39e4, c0620f5.

### E — limitations / when-not-to-use content (covers F8)
Category 2, Requires design. Whether, where (landing section, FAQ, separate page) and which costs.
Source material is in the repo (CLAUDE.md gotchas, tutorial ch 3/5/13/15). Level 5.

### F — "ai-native" positioning (covers F9)
Category 2, Requires design. Keep, demote into the FAQ, or cut. Level 5 (positioning).

### G — repetition across sections (covers F12)
Category 3, Suggestion. Falls out of the restructure once sections are chosen. Level 7.

### H — legacy `site/playground.html` (covers F14)
Category 3, Suggestion. Restyle into the site, retire it (and fix README.md:137,
examples/personal/apps.json:62), or leave it. Level 7.

### K — tutorial promotional lines (covers the tutorial half of F10)
Category 3, Suggestion. Light pass: ch 10, 11, 16, 17, 18, 19 lines listed in F10. The tutorial is
otherwise instructional and already states its limits (ch 3, 5, 13, 15). Wording depends on D. Level 7.

## Choice lines

- Session 1 (2026-11-20): opening — _pending_

## Counts

15 findings sorted into 12 items: 3 Mechanical (A, a pattern at 6 sites; I; J), 5 Requires design
(B, C, D, E, F), 4 Suggestions (A2, G, H, K), 0 Not correct as written.

## Carried sentences

- "The 27 KB figure was set in 7810748 (v1 readiness sweep) and has drifted since; 23 KB predates it."
  — the numbers were refreshed by hand once and drifted again.

Uncovered: none

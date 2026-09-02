# Handoff: the worklist is done, and the instrument now fails on purpose

> **SUPERSEDED by [ATTR-CONTRACT-CYCLE-3.md](ATTR-CONTRACT-CYCLE-3.md).** The
> review rounds this document calls for have run; their seven findings are
> fixed, and cycle 3 replaces the diagnosis both this document and
> ATTR-CONTRACT-HANDOFF.md operate under. Read cycle 3 first.

Branch `attr-contract-matrix`, 17 commits off `main` at `469065c` — 8 from the
previous cycle, 9 from this one. **Still not merged**; that is a decision, not a
blocker. Read `ATTR-CONTRACT-HANDOFF.md` first for why the previous cycle
stopped, then this.

The previous handoff's six-item worklist is complete, plus both deletion
candidates and two requests from the repo owner.

## Verified

| | |
|---|---|
| framework | 737/737 |
| componentlib e2e | 18/18 |
| attribute matrix | 2844 cells, **0** disagreements, baseline empty |
| sink branch coverage | **0** unexplained blocks |
| computed cells | 14/14 (node, ~0.1s) |
| template lint | clean, **198 files checked** |
| lint fixtures | 106 assertions / 20 files |
| `dist/` | regenerated, real bundle checked in a browser |
| **codemap** | **134/134**, 0 skipped — its vdx-lint suite ran |
| **mrepo-web** | **427/427**, 35 suites, 636s |

Both consumer trees were reverted afterwards and are clean. The vendored bundle
was checksummed against `dist/` before each run, so it is provable which bundle
was tested.

Downstream is still a **regression gate, not contract evidence** — mrepo has
returned an identical 427/0 across two high-severity fixes before.

## What changed, and why it is not just more cells

The previous cycle's verdict was that the matrix was throughput, not a solution:
1080 cells that could not reach the branches the implementation actually has.
That is now closed from the other end.

**The baseline is the instrument.** 37 accepted disagreements went to the places
that could express them — a `ruleFor` clause, `classify()`, `sameFor()`, the
harness — and it is empty and meant to stay empty. Only one of the four
categories was ever a VDX opinion; the rest were the instrument measuring the
wrong thing. A real regression had hidden in that list for two rounds by looking
like the other 36.

**Coverage is the stopping condition.** Each run prints V8 block coverage of the
sinks. An uncovered block is a missing axis or dead code; everything explained is
keyed on its source line and names the test that owns it. This independently
re-derived Fable's hand-found gaps, then closed them.

**Three axes, chosen from the gaps rather than from HTML**: transition (walk the
values on ONE element, so every value is measured as an update with a real prior
value), `${object}`, `${function}`. 2844 cells now, and no unexplained blocks.

**Every check was falsified.** Six deliberate mutations of `lib/`, each
confirming the run fails and each restored byte-identical: corrupt string styles
(5 rows), delete the global-boolean early return (4), stringify component props
(21), leave stale style keys (5), skip form-value clearing (4 — see below), drop
either computed healing trigger (1 and 2 cells).

## The findings

**Registration timing changed what a prop IS.** Measured across ten value
shapes, seven disagreed either side of registration, against a contract
`registration-timing.test.js` states outright. `da28d12` had not made lazy
components lossless — it made them receive the *string form*. Fixed with a
WeakMap side channel (`lib/core/pending-props.js`) that `_parseAttributes`
drains on upgrade. The previous handoff's "do not set expandos" ruled out a
*mechanism*, not the goal; a WeakMap has none of that hazard.

**An object or a function reached the DOM as text** — `"[object Object]"`, or a
whole function body — on the attribute *and* on an inherited property, where
`title="${obj}"` produced that as a tooltip. That one had to CLEAR rather than
skip: skipping left the previous render's title showing.

**`undefined` meant two different things.** Prop default on the first render,
literal `undefined` on an update. Now "not provided" in both, resolved in the
prop setter. `null` stays an explicit null. Consequence worth knowing: the mirror
follows the *resolved* value, so a string default shows in the DOM where the
template said `${undefined}`.

**Coverage is not enough on its own.** The form-value-clearing branch *executed*
under the matrix and nothing checked it — deleting the branch left the run green.
Found by mutation, not by coverage. A branch being reached says nothing about
whether an oracle has an opinion on it.

**A lint that checked nothing reported clean.** An existing directory with no
lintable files printed the success line and exited 0. Found by mining
downstream Claude memories, where codemap had recorded losing time to exactly
that. It now prints the file count and exits 1 on zero.

## Decisions taken, with the measurement behind each

Ratified by the repo owner during this cycle:

- `undefined` = not provided, on update as well as initial.
- Lazy props go through the side channel, losslessly, rather than the attribute.
- Never stringify objects, arrays or functions; primitives still mirror.
- **Keep** the `GLOBAL_BOOLEAN_ATTRS` early return. The previous handoff sized
  deleting it at 14 baselined rows; measured, it moves **4** cells, all SVG
  `${''}`/`${0}`, none on components, and none of the 4 renders differently
  because the UA's `[hidden]` rule is HTML-namespace-scoped. Recorded at the
  definition in `constants.js`.
- `isBooleanAttr`'s parameter is `notHtmlElement` (free, no caller ever passed
  the old name).
- The `computed()` double run is **pinned, not fixed** — reproduced rather than
  described, asserted as a count, with the reason in the cell.

## What is left

1. **Review rounds, not yet run.** Cycle 1's stop rule — *"do not run another
   review round before the duplication is gone"* — is satisfied: the comparison
   logic that reviewers kept re-finding, one cell per round, is factored into
   `judge()` and written once. So `/code-review high` and a codex round on the
   branch are both unblocked and are the sensible pre-merge step. Neither has
   been run; both are the owner's to trigger, being billed and (for codex)
   outward-facing.
2. **The merge decision.** Nothing here is known-broken and the downstream
   canary is green, but this branch produced a regression in every previous
   round, so the bar is the owner's, not mine.
3. **`noOpinion` is 305 cells** (~11%), up from 82 because the new axes ask
   questions the rule has no answer for — mostly `${object}`/`${function}` on
   native attributes. It is printed with every run now. Ruling on them would
   shrink it; leaving them is honest as long as the number stays visible.
4. **codemap's own memory is stale** and I did not edit another project's
   memory: it still lists "resolve conditionals BEFORE an `each`" as a standing
   workaround (fixed in `37da760`, re-verified here and the report closed out),
   says the lint lives at `tools/optimize.js`, and calls the bug reports
   untracked. See `downstream-vdx-workarounds` in this project's memory.

## The rule that keeps earning its keep

The previous handoff's lesson was: *when the mechanism reports something you are
about to explain away, write the check instead of the explanation.* It held four
more times this cycle, and each time the check was cheap and the explanation
would have been wrong:

- `literalAttrValue` showing **0 calls** looked like dead code. It is inlined by
  V8; the behaviour is live and already tested. A one-line probe settled it.
- The `${object}` component cells failing looked like a lossless-prop defect.
  The values were arriving *proxied* — the documented behaviour — because my own
  harness routed them through reactive state.
- The update pass reported *997 updates, none changed the DOM*. `flushSync`
  takes the mutation as a callback; the no-arg call was throwing into a catch.
  A guard now fails the run if no update moves anything.
- A probe "proving" that component props do not update at all was building a
  fresh strings array per call, so every render missed the template cache. The
  framework was fine.

Two of those four were my own instrument lying to me, which is the argument for
making the instrument fail on demand before believing it when it passes.

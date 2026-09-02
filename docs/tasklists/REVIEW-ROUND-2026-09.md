# Review round on the refactor batch

Branch `registry-answerer` at `7144100` was reviewed twice, in parallel and
framed the same way: aim at the six semantic changes rather than the pure
moves, refute rather than converge, `file:line` and a runnable command per
finding, and the instruments are the tiebreak (a claimed divergence in the
attribute sink is not a finding until it has a cell). Downstream had passed
first (mrepo-web 427/0, codemap 134/0).

- **codex** (read-only, one thread): 4 findings, 3 on HEAD plus one about a
  commit boundary. All four reproductions were run here and all four
  reproduced.
- **`/code-review high main..HEAD`**: 24 candidates across angles, 6 refuted
  by its verifiers, top 10 reported. Two overlapped codex.

## Where the findings landed

| commit | findings | what they had in common |
|---|---|---|
| `731fd69` host-and-prop | codex 1, 2, 3; review 2, 3, 5 | the host-applied table was a second authority on how a value reaches a component |
| `fc66522` light-DOM adoption | review 1, 6 | the capture dropped anchors and ran a connect in limbo |
| `e834552` slot classifier | review 4 | a bare Node became a first-class boundary value, and the boundary's fast path assumed it made every text node |
| `f19a018` marker refusal | review 10 | a nested array was refused with a reason that did not describe it |
| pre-existing | review 7, 8 | two literal sinks; `when()` unresolved in arrays and attributes |
| prose | review 9 | the lint's message still said the static form was unguarded |

Eight of ten in this session's own commits. That is the loop feeding itself,
and the response was to re-read each subsystem whole rather than fix sites.

## What changed, by subsystem

**Host-applied names** (`dacba0f`). `lib/core/host-attrs.js` holds the table
and its rules; the renderer's sink AND a component's prop mirror import it.
The mirror of a host-applied name IS the host rule, so `el.hidden = true` on
a class declaring `hidden` hides it as a template would. In the sink a
component value takes the ownership path a declared prop takes
(`deliverToOwner`: the owner with its type intact, or the side channel for
the upgrade), then the host write in a `finally`, under the attribute-
callback suppression. `parseAttributes` lets a value committed before
connect win over the attribute, default-equal or not. The timing relation
now declares `hidden`, `spellcheck` and `dataX`: 43 rows before, 0 after.

Codex's category-B answer, verbatim in spirit: the slot classifier created
no second authority; the host table did, because accessor existence at
render time decided whether the pending transport was bypassed. That is now
one path.

**Light-DOM adoption** (`702bb23`). Comments are adopted with the nodes they
anchor - a slot written straight between a lazy component's tags has only
its placeholder comment - and the children relation walks a bare shape as
well as a wrapped one (5 rows before, 0 after). `connectedCallback` returns
at once for an element that is not connected, so an adopted child that was
already upgraded is not rendered in limbo; pinned by the grandchild count.

**Boundary text** (`e66143f`). The boundary edits only a text node it made.

**Literal attributes** (`2163479`). `lib/core/literal-attr.js` is the one
writer for a literal on a native element, called by the compiler's static
path and by the renderer's element path. The matrix's literal half now
walks every literal twice - static, and on an element carrying a dynamic
attribute, which is what actually takes it off the compiler's path (a static
child of a dynamic parent is still pre-built; a void element has no children
to put a `${}` in). That found 20 rows: the 12 `value`/`checked` ones the
review named, and 8 SVG `hidden` literals the renderer had been normalising
to presence. 0 after. `for` on a label is an axis.

**when() everywhere it can appear** (`c55593a`). An array item resolves to
its branch, a nested array is its items, and `unwrapAttrValue` is the one
unwrapping in attribute position: getter, `when()`, `contain()`.

**Cleanups** (`e0235e0`). The lint message, one kebab converter, one
boundary reset, moved imports, three narrating comments.

## Refuted or ratified, with reasons

- **review 5, a string value on an owned global boolean makes host and prop
  disagree** (`hidden="${'false'}"`: host hidden, prop `'false'`). The same
  state on `main`; the prop is lossless and the host follows HTML, and
  `boolProp` exists for exactly this reading. Ratified, not fixed.
- **codex 4, `2fe9429` was not behaviour-identical** for a class declaring
  `hidden`. True: before it, a null update notified three times with a
  transient `false`; after, once with `false`; HEAD, once with `null`. The
  matrix had no cell there by design, and the commit claimed identity only
  for the instrumented surface. Recorded, superseded.
- **the reviewer's hot-path note** (per-update name classification and an
  allocation per changed prop in the setter). `run-fine-grained-benchmarks.js`
  on `main` and on this branch, same machine, same session: every scenario
  on both trees reports between 4.07 and 4.23 ms. That instrument is bound
  by a frame wait and cannot see work at this scale, so it neither confirms
  nor refutes the note. Left as stated; a benchmark that measures the sink
  and the setter directly would be the way to rule on it.

## Verified, at the end

| | |
|---|---|
| framework | 782/782 |
| componentlib e2e | 18/18 |
| matrix + relations | 3528 cells, 0 rows, baseline empty, 0 unexplained |
| lint / fixtures / computed | clean 200 files / 106 assertions / 14/14 |
| `dist/` | regenerated, idempotent |
| benchmark | floor-bound on both trees, see above |
| mrepo-web / codemap | re-run after the fixes - see the note below |

## What this round says about the process

The relations found nothing here that the reviewers found, and the reviewers
found nothing the relations could have: every finding was an axis the
instrument did not have (a declared host-applied name, a bare child shape,
a literal on a dynamic element). Each fix added the axis, so the next round
points somewhere else. The stop signal from the notes - findings landing in
code that predates the session - is not reached yet: eight of ten were in
this session's commits. The right next step is not a third round on the
same code; it is a re-read of `instantiateSlot` whole, which is the one
place this session touched three times.

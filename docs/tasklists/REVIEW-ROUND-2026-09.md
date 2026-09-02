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
| mrepo-web / codemap | 427/0 and 134/0 at `5a5817f`, bundle checksummed, lint suite ran |

## The one the round did not find, and the suites could not

The first post-fix downstream run failed catastrophically: `dist/framework.js`
did not parse. `host-attrs.js` and `literal-attr.js` each declared a
top-level `SVG_NS` (and `nullish`), and the bundler concatenates modules.
Every suite in this repo runs `lib/`, so every one was green; mrepo-web lost
34 of 35 suites at page load. The `bundler-dist-verification` memory note had
said exactly this could happen, and the real-bundle check it prescribes was
skipped after the review fixes.

Fixed in `5a5817f`, and made structurally impossible to repeat: the two
constants are exported once from `constants.js` (the renderer's
`RENDERER_SVG_NS` workaround for the same hazard is gone with them); the
bundler refuses to write a bundle that fails `node --check`;
`tests/node/dist-check.mjs` fails on a bundle that does not parse or lags
`lib/`, and regenerates it; `run-framework-tests.js` runs that before the
browser opens; and `tests/framework/dist-bundle.test.js` renders through the
real `/dist/framework.js`. Both guards were falsified: a used duplicate in
`lib/` stops the build with a non-zero exit, a corrupted bundle stops the
runner before any test. The rule for `lib/core/`: a top-level name is
unique across files.

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

## The re-read of `instantiateSlot`, and what it found

The step this record called for. `instantiateSlot` and the helpers it owns
(`slotKind`, `materialize`, `materializeArray`, `materializeKeyed`,
`memoEachToFragment`) read whole rather than by finding. Two defects, one
site each - the site count was checked before either fix, and neither
generalised into a class worth a guard.

**A contain() boundary's DOM outlived the slot that owned it** (`1d5d7dc`).
A boundary's nodes are `containNodes`, not the `currentNodes` the slot's
dispose walks, and nothing else removed them. The parent records the
boundary's FIRST nodes when it instantiates the branch, so while the
boundary reuses its DOM the two agree; once it replaces what it shows - a
structure change, or a keyed list that grew - the nodes on the page are ones
no dispose can reach. Hiding a `when()` branch left them behind and
re-showing it rendered a second copy. `clearBoundary`/`cleanupContain` move
to slot scope so dispose can reach them.

*This one predates the branch*: the dispose wrapper is `1105dc69`
(2025-12-26) and it reproduces unchanged on `main`. That is the stop signal
this record was looking for - the first finding of the session that is not
in the session's own code.

**A `when()` branch that is an array escaped every refusal** (`d22d784`).
`c55593a` dropped the array arm of the refusal so a nested array could
flatten, but the walk flattens BEFORE it resolves, so an array that only
exists after a `when()` resolves was neither flattened nor refused - it
reached `materialize()` whole and fell to `String(value)`. Three shapes that
threw a describing error at `2163479` rendered silently wrong DOM at HEAD
(`"xa,b"`, `"x,"`, `"x[contain]"`). `flattenSlotItems` interleaves the two.

*This one is the session's own fix regressing*, and it is the shape the
notes warn about: the repair moved a line to the wrong side of an operation
and the hole it left was the exact one the removed refusal had plugged.

### Two things about the tests

The first cleanup fixture **passed against the broken code**: each
`contain()` was wrapped in a `<p>`, and removing that `<p>` takes the
orphans with it. The leak needs the boundary at the top level of the slot's
content. The fixture was the reason the bug was invisible, again.

`slot-relations.test.js` could not have caught the second: it asserts the
two dispatchers AGREE, and they did - both stringified the array. The
relation is blind to any defect the two dispatchers share, and they share
`materializeArray` outright. Hence an assertion on rendered output rather
than a KINDS row.

## The loose ends, closed

**The hot-path note is answered: no change is justified.** This record said a
benchmark measuring the sink and the setter directly would be the way to
rule on it. Measured in-browser, against one prop update that rewrites three
attributes and a text node (5755 ns):

| | ns/op | share of one update |
|---|---|---|
| `hostAppliedRule`, all names mixed-case (worst case) | 36.3 | 0.63% |
| `hostAppliedRule`, all names lowercase | 15.4 | 0.27% |
| `isOwnElementProp` | 29.7 | 1.08% |
| `commitProp`'s `[name, value, old]` | 0.8 | 0.03% |

The unconditional `name.toLowerCase()` costs 20.9 ns only when it must
actually allocate; V8 returns an already-lowercase string unchanged. The
allocation the reviewer flagged is 1/3600th of the update it accompanies,
next to a `setAttribute` that costs 171 ns on its own. Memoising either
classifier would cost a Map lookup to save less than a percent. Closed.

**Array holes are not a hazard.** `flattenSlotItems` iterates holes that
`.flat(Infinity)` dropped, so `['a', , 'b']` yields three items where it
used to yield two. Probed across holes added, filled, moved, doubled,
trailing, and grown/shrunk: identical DOM and identical node counts every
time. A hole classifies as `'empty'`, the same as the `null`/`false`/
`undefined` that a `[cond && x]` idiom already produces, and a plain array
slot re-instantiates whole on every change, so there is no positional state
to desync.

**The bundler's `File not found` warning is a comment being read as code.**
`lib/core/versioned-list.js:15` carries a JSDoc `@example` line reading
`import { versionedList } from './lib/framework.js';`. `parseImports`
regex-scans the whole file including comments - the same class as the July
`stripImportsExports` break, fixed then only in the stripper. Today it is
inert: the phantom path does not exist and `topologicalSort` guards with
`modules.has(dep)`.

It is not only noise. A doc comment naming a REAL sibling creates a real
ordering edge, and order is the one thing a concatenating bundler
guarantees. Measured on a three-module fixture, reading the order back out
of the emitted bundle: a single `@example` line in `alpha.js` naming
`beta.js` flipped emission from `alpha, beta, entry` to `beta, alpha,
entry`. (An earlier note here cited a 19-to-12 move in `lib/`; that was the
verbose log's DISCOVERY order, which is a different list and only influences
emission through the sort's iteration order. The fixture measures emission
directly.)

Seven comment lines across `lib/` are currently scanned as code; the one
that names a real file (`lib/opt.js:27` -> `./utils.js`) is in a module that
is minified in place rather than discovered, and the two phantom `export`
lines in `component-class.js` do not reach the bundle's export list (which
comes from the entry). So there was no live bug - one latent hazard, one
comment away.

**Fixed.** `maskStringsAndComments` (the template lint's scanner, already
shared with `optimize.js`) grew a `keepStringContents` option, and the
bundler masks with it before both scans - comments blanked in place, string
contents kept, because the module specifier being read IS a string. Default
behaviour is unchanged, which the lint's 106 fixture assertions hold it to.
`dist/` is byte-identical after the change, which is the point: nothing that
was reaching the output moves. `tools/scripts/test-bundler-scan.mjs` pins
both halves - prose creates no edge, and a real import still does, because a
mask that is too eager would silently unbundle the framework while every
other check stayed green. Falsified against the pre-fix bundler: 2 of its
checks fail there.

The same scan was reaching one more place. `5a5817f`'s duplicate-declaration
guard - the one that catches two modules declaring the same top-level name,
which is what made `dist/` a SyntaxError - uses a `^`-anchored regex, so a
commented-out `function helper()` at column 0 matched and the file was
reported as a duplicate of itself. Only a warning, but a guard that cries
wolf is how the real duplicate gets scrolled past. It scans masked code now,
and the test holds both directions: prose is not a duplicate, and a genuine
one across two modules is still reported AND still refused at the write.

## Decided, not fixed: a bare array in markup goes stale

A mutated array in a slot does not update the DOM. The slot's identity fast
path (`value === previousValue`) skips the re-render because the reference
did not change. `versionedList` does not rescue it: the version bumps, the
effects fire, the component re-renders - and then the slot compares two
references and returns. `touch()` and `replace()` fail for the same reason,
which is worth knowing, because they are the documented answers for exactly
this and they do not reach here.

Measured, rather than reasoned about - the scope is one shape:

| surface | after an in-place `push` |
|---|---|
| `each()` / `memoEach()` | correct - a fresh marker every render |
| an array in ATTRIBUTE position (`items="${...}"`) | correct - child re-renders and sees the new contents |
| `props.children` / named slots | correct - a stable array of per-child reactive descriptors, whose contents update through their own slots |
| `${[a, b]}` written inline | correct - a fresh array every render, so the check never fires |
| `${this.state.items}` mutated in place | **stale** |

**Not fixed, by decision**: a bare array in non-attribute markup is an
anti-pattern in this library. It is not a list - it is `String(array)`,
comma-joined, with no keyed placeholders - and `each()` is the answer for a
list, `join()` for joined text. Nothing in `docs/` teaches it; every array
example in the docs is attribute position.

Two things make this the right call rather than a deferral. The identity skip
is load-bearing where arrays in markup are legitimate: `props.children` is a
stable reference by design, and exempting arrays from the skip would
re-instantiate every component's children on every parent render. And the
repair that would preserve that - a shallow compare instead of reference
identity - buys correctness for a shape the library tells you not to write.

It is also not lint-enforceable, which is why the rule went to
`docs/templates.md` rather than the banned-patterns table: the statically
visible form, `${[a, b]}`, is a fresh array each render and therefore the
SAFE one. The form that goes stale is `${someExpression}`, which no
source-level check can distinguish from a string. `guards.test.js` carries a
note so its "does NOT throw for an array of primitives" case is not read as
an endorsement - that path must stay open for children and slots.

## Verified, after the re-read

| | |
|---|---|
| framework | 785/785 |
| componentlib e2e | 18/18 |
| matrix + relations | 3528 cells, 0 disagreements, baseline empty, 0 unexplained |
| lint / fixtures / computed | clean 202 files / 106 assertions / 14/14 |
| `dist/` | regenerated, parses, idempotent |
| mrepo-web | 35 suites, 427/0, on a bundle checksummed against `dist/` |
| codemap | 134/134, 8 suites, `vdx-lint` suite ran rather than skipped |

# Step 3: the registry answerer

Branch `registry-answerer` off `main` at `2aa1be4`. Read
`ATTR-CONTRACT-CYCLE-4.md` for the plan this is step 3 of.

"Is this a component?" was answered by `componentDefinitions.has()` at three
times: compile time (`isFullyStatic`), instantiate time (children capture and
mount detachment), and dispatch time (`isComponentElement`). The compile-time
answer was frozen into a cache that outlives registration; the instantiate-time
answer decided how children reached the element, and the two deliveries did
not converge.

## What changed

- **The compiler no longer reads the registry**, or imports `component.js` at
  all. A hyphenated tag outside SVG is never static. Inside SVG it is an SVG
  element, exactly the renderer's `isCustomTag` rule - the first draft
  forgot the SVG half and the matrix caught it within one run (11 rows on
  `svg-hyphen`, see below). `.every(isFullyStatic)` became explicit arrows
  because threading a flag through `every` would have passed the array index.
- **Light-DOM capture adopts the live nodes.** `connectedCallback` used to
  serialise `innerHTML` and parse it back; every listener on a child was
  gone, and a nested component came back as a new instance. Now the same
  nodes are detached and handed to `props.children`; a nested component takes
  its reconnect path when the template places it. Pinned by
  `children.test.js` "Light DOM Adoption" (fails on `main`: the `<b>` is a
  copy) and by the 15 `relation:children` rows, which resolved. The baseline
  is empty again.
- **Mount detachment keys on tag shape**, not the registry. There is nothing
  to track for a tag that never registers, and one that registers later
  upgrades through the same `connectedCallback`.

Registry reads in the render path: 3 → 2. The remaining instantiate-time read
decides only *how* children are delivered (deferred descriptors for a
registered component, live light DOM for everything else), and the two
deliveries now converge. It stays keyed on the registry deliberately: a
third-party custom element needs its light DOM, and a descriptor expando set
before a VDX registration would shadow the accessor that registration
installs. The comment at the read says so.

## Verified

| | |
|---|---|
| framework | 771/771 |
| componentlib e2e | 18/18 |
| matrix | 3138 cells, 0 rows, baseline **empty**, 0 unexplained blocks |
| relations | all four, 0 rows |
| lint / computed | clean 198 files / 14/14 |
| `dist/` | regenerated, idempotent |
| mrepo-web / codemap | see the verification section at the end |

## Two two-sink divergences, surfaced and fixed

Both surfaced when the first compiler draft routed `svg-hyphen` through the
renderer instead of the compiler's static path. Both were pre-existing and
reached only a literal attribute inside a *dynamic* subtree, where the matrix
had no cell.

- **Literal `on*` and `srcdoc`-class names.** The compiler's static path
  wrote literal source text through; the renderer refused it. Izzie's call:
  refusing `on*` is a security feature for static text too, since a literal
  inline handler runs outside the framework and outside CSP just the same.
  Now one `isRefusedAttr()` in `constants.js`, used by both sinks. The matrix's
  literal half asserts *absence* for `on*` names instead of asking the parser
  (the one stated departure from "literal text is HTML source"); falsified by
  disabling the compiler's guard. Every doc that said the static form was
  unguarded says otherwise now (CLAUDE.md, FRAMEWORK.md, optimization.md, the
  lint's comment, tutorial chapters 3 and 13). Pinned by `security.test.js`
  "literal script sinks".
- **Global booleans on SVG elements.** The renderer's boolean branch did
  `el.hidden = true`, an expando on an `SVGElement`; the compiler wrote the
  attribute only. A previous audit called the expando fine because `hidden`
  means nothing on SVG. It is inert on the page, but it fakes an IDL property
  that instruments read back (that is exactly what the 11 `svg-hyphen` rows
  were), and the guard is `name in el`. Presence only in SVG now, in both the
  set and the clear paths. Pinned by `boolean-attrs.test.js` "Global booleans
  in SVG".

## Next (from the plan)

4. Split `defineComponent` by extraction: one prop-ingress path with a source
   tag, then children capture, style injection and render scheduling out of
   the closure.
5. One value classifier for `instantiateSlot`; the slot relation's
   known-divergent list is the acceptance test.
6. The three-phase attribute table. Its refusal phase already has its one
   rule (`isRefusedAttr`); the host-applied and ownership phases are what is
   left to lift out of the ladder.

# owner.md — 2026-11-20-site-honesty

Run: `/ez-plan` on the session's items (planning-only conversation, Z9). Record:
`docs/tasklists/2026-11-20-site-honesty/` (CLAUDE.md: "Round records live in `docs/tasklists/`").

## Session 1 (2026-11-20) — the discussion before /ez-plan, verbatim

> Could you take a look through this promo website?
> This is initial planning for a site restructure. I want to make it more honest, less one-sided,
> and feel less like it was auto-generated.
> After doing an initial survey of the landing site and tutorial, let's use /ez-plan to plan the
> changes.

### Earlier owner rulings in git, relevant to voice (quoted from commits without a Claude trailer)

- `abf39e4` "Linkify music player.": `a production music player` → `an extensive <a …>music player</a>`
- `c0620f5` "Update landing title": `VDX — a web framework you vendor and forget` →
  `VDX Build-less Component Framework`

These are evidence for the session's reading (both edits move toward plainer, descriptive copy). The
reading is the session's, not the owner's.

## Session 1 (2026-11-20) — Discuss First, verbatim

Opening picked: "Discuss First (Recommended)" (option label; its text is the session's).

**Owner, turn 1** (answering the session's questions on voice, a reference site, and who writes):

> 1. I would say drop the FAQ, no one has actually asked those questions
> 2. None come to mind, I want it to feel more like a showcase/explanation and less like a cookie cutter landing page from a marketing dept
> 3. I think the best approach would be we collaboratively lay out what the site will look like, then I phrasing check and possibly rewrite the load-bearing parts
>
> I think the comparison table also should probably go, although I am unsure what to replace it with
>
> The vendoring risks also deserve a reframe, the key consideration is there is one party to trust, not hundreds, and the framework is designed to be rot resistant.
>
> An example is my music player, the client side parts should continue to work in 5 years without me having to unravel a disaster like https://github.com/iwalton3/swapi-svelte or re-do my website routing because react router decided to break everything again
>
> As for stability, there have been some changes over the past year or so, but the core concepts have stayed remarkably stable and mrepo-web and codemap are built on top of it (among other things)
>
> The biggest strengths in my mind:
> - One party to trust
> - No mandatory build step
> - No requirement for a dev server
> - No npm packages to grab
> - Chained dependencies not being present means only one changelog to read and potential source of breaking changes (absent major web platform changes, which are relatively unlikely compared to website framework paradigm changes)
> - The framework is batteries included, there is a decent UI framework, routing, service worker, and even windowed scroll/context menu support
> - It integrates with static sites and web bundles without any ceremony, for instance if you want your .net app to have a web framework, you just copy some files and it works with no extra changes, same applies for an apache/cpanel type situation

**Owner, turn 2** (answering the session's questions on the draft layout; each `>` quote line
before the answer is the session's question, quoted by the owner):

> > Is mrepo-web the same app's successor?
>
> The successor is the "personal website" section of the example apps
>
> > "No requirement for a dev server"
>
> Yeah I meant "specialized" dev servers, literally any web server will work in hash routing mode
>
> > Embedding page
>
> Can be a section on the homepage, maybe with a separate page if needed
>
> > Section 7: does it stay, and in what tone?
>
> "What this isn't" section
>
> > "ai-native":
>
> The name "ai native" somewhat aged like milk, but we should mention it's agent friendly both for downstream development and framework code maintenance too. It derisks me abandoning it by a lot.
>
> > swapi-svelte: comfortable naming it on the page?
>
> Can be referred to as something along the lines of "my old personal website".

**Owner, turn 3** (on the session's draft "What this isn't" list):

> > Not frozen
>
> Yeah, the target is "don't break correct defined behavior of the framework", if something feels broken or like a workaround it could change.
>
> Let's draft the landing page as a Claude artifact for me to take a look at

Mock-up (elicitation only, Z6): https://claude.ai/artifact/EKG8z2AopnVCQjcXcMT45E (v2). The owner
asked for rewrite boxes under each load-bearing block and filled them in; read back with
`ArtifactData list rewrites` on 2026-11-20. Verbatim:

- **what-it-is:** VDX is a modern web application framework that aims to keep the "vanilla" experience of deploying the same files you edit directly, while having a feature set comparable to modern React and Svelte framework such as two-way data binding, stores, and components. There's no required build step or npm dependencies, so the code you write now should "just work" five years from now. It's batteries included, with a UI library, router, offline service worker, and optional linter/typescript support included.
- **trust:** VDX is maintained by a single party using AI assistance. There's no additional packages or delicate dependency chains to trust. There's one changelog for everything, and having been through several breaking change cycles forced on me before by other libraries, I have a commitment to avoiding breaking changes unless something was already obviously broken.
- **rot:** [I think this paragraph is redundant to the opening paragraph]
- **before-after:** The old website is a great example of web framework archeology. 5 years later, and the whole build system moved and there's a major version of half the packages. With a mile-long package-lock.json, it is easier just to start from scratch, and VDX aims to make it the last time you have to do that.
- **stability:** VDX doesn't claim to never break backwards compatibility, but it does it for good reason. Working patterns will generally continue to work, while if something appears off or needs a workaround, it will get fixed.

  [Claude: Check what changes happened before v1 vs after]
- **abandonment:** Since the project is extensively documented, has thorough unit/e2e tests, and is already developed by agents, anyone can maintain the framework even if the maintainer steps away.

**Owner, turn 4:**

> Alright, I updated the reworded versions!

Discussion ended: plan here.

## Session 1 (2026-11-20) — Plan with Questions, batch 1 (asked with AskUserQuestion)

Before the batch the session reported, at the owner's request in the stability box: pre-v1
(258 commits) held the large changes (Preact VDOM → fine-grained rendering 2025-12-26, options
objects → classes July 2026, rename, localStore prefix swapi → vdx at v1); since v1 (95 commits)
v1.1 made silent mistakes throw and v1.2 shipped the attribute contract whose changelog says no
correct code should need changing (two of its nine upgrade notes can affect code that worked by
accident). Session also said "a major version of half the packages" holds from its knowledge, not
checked against the registry.

1. **Stability.** Q: should the paragraph say when the big changes happened? Options (session's):
   "Add a dating sentence" / "Keep it as written" / "I'll reword it".
   A (owner's words): "Something along the lines of: The framework did have several extensive changes in the early (pre-v1) experimental phase, but the design is now largely settled."
2. **"What this isn't".** Q: which of the five unruled drafts stay? (multi-select)
   A: "Not server-rendered,Not a large ecosystem,Not style-isolated,Not for old browsers / not free of rules" — all five.
3. **Embedding page.** Q: what happens to site/embedding/? Options (session's): "Trim to an examples page" / "Fold in and remove" / "Leave it, fix numbers".
   A (owner's words): "I lean towards trim and shrink to a section, it is 4 main demos and some fluffy marketing text that could be condensed."
   Session's reading, not the owner's: the page's content becomes a homepage section carrying the four
   worked demos; the standalone pitch page goes. Put back to the owner with the plan.
4. **Numbers.** Q: how should the page keep size figures honest? A: "A node check".

## Session 1 (2026-11-20) — Plan with Questions, batch 2 (asked with AskUserQuestion)

The session printed its decision log in its own message (numbers, copy, build, done-means) before
this batch; it is in decisions.md.

1. **Legacy site/playground.html.** Options (session's): "Retire it" / "Restyle it" / "Leave it".
   A (owner's words): "Leave it, don't bother linking to it. The component framework covers most of what it demos."
   Session's reading, not the owner's: the page stays untouched and the new site does not link it;
   the existing README.md / apps.json links are left as they are.
2. **Tutorial light pass.** A (owner's words): "Yeah do a light pass, it predates a lot of the more dense Opus 5.0 style verbiage, but still deserves an accuracy and clarity pass."
3. **Decision log — any problem?** A: "No, it's fine".

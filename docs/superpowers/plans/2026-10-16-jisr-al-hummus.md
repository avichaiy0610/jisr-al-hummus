# Jisr al-Hummus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A free static Hebrew RTL site where every Instagram follower of the satirical village "ג'יסר א-חומוס" gets a fixed house, with search, a "my house" page, a resident list and a Three.js village.

**Architecture:** Node tools turn the official Instagram followers export into an append-only registry (`data/registry.json`) and sharded static JSON (`site/data`). The browser site is plain ES modules plus vendored Three.js (no build step). Pure logic shared by both (`site/js/shared/`) is unit-tested with `node --test`.

**Tech Stack:** Node 24 (ESM, node:test), fflate (zip reading in tools only), Three.js r1xx (vendored, MIT), GitHub Pages via Actions.

Spec: `docs/superpowers/specs/2026-10-16-jisr-al-hummus-design.md`

## File map
| File | Responsibility |
|---|---|
| `site/js/shared/sha256.js` | `sha256Hex(str)`: SHA-256 in pure JS (UTF-8) |
| `site/js/shared/username.js` | `normalize(input) → string|null` |
| `site/js/shared/layout.js` | `buildLayout(n) → {plots, streets, landmarks}`. Deterministic plots, streets and landmark zones |
| `site/js/shared/streets-names.js` | Street name parts (Hebrew) |
| `tools/lib/parse-export.mjs` | `parseExport(path) → [{u, t}]`. Reads .json/.zip and all known formats |
| `tools/lib/registry.mjs` | `updateRegistry(reg, followers, {force, date}) → {reg, stats}` |
| `tools/lib/emit.mjs` | `emitSite(reg, outDir)`. Writes meta/r/list |
| `tools/update.mjs` | CLI: parse → update → write registry → emit → optional git commit+push |
| `tools/make-sample.mjs` | Writes fake export plus demo data into `site/data-demo` |
| `tools/serve.mjs` | Static dev server |
| `tools/vendor.mjs` | Copies three into `site/vendor` |
| `site/index.html`, `site/css/app.css` | Shell, RTL layout, bottom nav, sheets |
| `site/js/copy.js` | All Hebrew copy and jokes |
| `site/js/data.js` | `loadMeta`, `findHouse(u)`, `listPage(i)` (fetch and cache) |
| `site/js/village.js` | Three.js scene: `createVillage(canvas, meta, layout)`, which returns `{flyTo(house), setMine(house), onPick(cb)}` |
| `site/js/landmarks.js` | Procedural landmark meshes |
| `site/js/ui.js` | Loading screen, header, tabs, search, house card, list, more |
| `site/js/main.js` | Bootstrap and wiring, plus `?u=` and `?demo` |
| `tests/*.test.mjs` | Unit tests |
| `.github/workflows/pages.yml` | test + deploy `site/` |
| `README.md` | Hebrew guide: setup, update, deploy |

## Tasks
- [ ] **1. Scaffold:** `package.json` (type module, scripts: test/start/update/demo/vendor), `.gitignore` (node_modules, exports/, site/data-demo/), install `three` and `fflate`, run `npm run vendor`, commit.
- [ ] **2. sha256 (TDD):** tests compare against `node:crypto` for '', 'abc', a Hebrew string, a 1000-char string and 55/56/64-byte boundaries. Then implement and commit.
- [ ] **3. normalize (TDD):** test cases are `@Name`, ` name `, `https://www.instagram.com/name/`, `instagram.com/name?igsh=x`, `https://instagram.com/_u/name`, `m.instagram.com/name`, `instagr.am/name`. Invalid inputs return null: `''`, `'a b'`, `'http://x.com/a'`, 31 chars, `'@'`. Then implement and commit.
- [ ] **4. parse-export (TDD):** fixtures inline in the test:
  - old shape: array of `string_list_data[{value, href, timestamp}]`
  - new shape: `title` plus href `/_u/`
  - wrapper `{relationships_followers: [...]}`
  - zip with `connections/followers_and_following/followers_1.json` and `followers_2.json`
  - HTML export, which must be rejected with a Hebrew message
  - duplicates removed, earliest timestamp kept

  Then implement and commit.
- [ ] **5. registry (TDD):**
  - first import is ordered by `(t, u)`
  - an unfollow blanks the entry to `{h}`
  - a refollow restores the same index
  - new followers append
  - the guard fails when the export has less than 50% of the active count; `--force` overrides it
  - history is appended

  Then implement and commit.
- [ ] **6. emit (TDD):** check shard placement through `sha256Hex(u).slice(0,2)`, that each list page has 1000 entries with `null` for blanks, the meta fields, and that stale shard files are cleared. Then implement and commit.
- [ ] **7. update CLI + sample + serve:** wire up `tools/update.mjs` (prints a Hebrew summary; `--push` runs git add/commit/push), `make-sample.mjs` and `serve.mjs`. Run the demo and commit.
- [ ] **8. layout (TDD):**
  - deterministic checksum for the first 5000 plots
  - no two plots closer than the plot size
  - no plot at `x < SEA_X`
  - no plot inside a landmark rect
  - each plot has a street name, and the first plots get un-suffixed names
  - 200k plots build in under 1.5s

  Then implement and commit.
- [ ] **9. Site shell:** index.html (import map, RTL, Rubik font), app.css (mobile-first, light/dark), copy.js, data.js, ui.js, main.js. Check by loading `?demo` in the dev server, then commit.
- [ ] **10. Village:** village.js and landmarks.js. Houses via InstancedMesh with picking, a pin, flyTo, and a sea. Verify with a Chrome headless screenshot, then commit.
- [ ] **11. Deploy + docs:** pages.yml and a Hebrew README with GitHub setup steps the user performs. Empty initial `site/data` (count 0 state). Commit.
- [ ] **12. Final verification:** `npm test`, screenshots in demo mode and the empty state on mobile and desktop sizes, and an update of HANDOFF.md.

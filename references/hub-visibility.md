# Visibility Tiers

Every research project has a **visibility** tier that controls where its files live, whether it syncs to the user's personal git repo, and whether it's shared to public libraries.

## The Three Tiers

| Tier | `visibility` | Files location | Config location | Personal git sync | Library sharing |
|---|---|---|---|---|---|
| **Local** | `"local"` | `src/local-projects/<slug>/` (gitignored) | `.local-config.json` (gitignored) | Never | No — sharing upgrades to public first |
| **Personal** | `"personal"` | `src/projects/<slug>/` | `hub-config.json` (committed) | Yes — committed + pushed | No — sharing upgrades to public first |
| **Public** | `"public"` | `src/projects/<slug>/` | `hub-config.json` (committed) | Yes — committed + pushed | Yes — auto-shared per library settings |

## Smart Default

- If `hub-config.json` has a valid `gitRepo` → default = **`"personal"`**
- If `hub-config.json` has NO `gitRepo` (empty/missing) → default = **`"local"`** (nowhere to sync)

## Sharing Upgrades Visibility — No Mixed States

There is no "local + published" state. If a user shares a local or personal project to a library, the project is **upgraded to public** first (local files move from `src/local-projects/` to `src/projects/`, metadata moves to `hub-config.json`). Sharing always means the project becomes public. This keeps the model clean: visibility = where files live, and public = synced + shared.

## Schema

**Personal and public projects** — stored in `hub-config.json` and mirrored in `src/projects/index.js`:

```json
{
  "slug": "career-pivot-explorer",
  "title": "Career Pivot Explorer",
  "visibility": "personal",
  ...
}
```

**Local projects** — stored in `.local-config.json` `localProjects` array and mirrored in `src/local-projects/index.js`:

```json
{
  "localProjects": [
    {
      "slug": "secret-salary-research",
      "title": "Secret Salary Research",
      "subtitle": "Confidential Compensation Analysis",
      "query": "Research salary ranges for...",
      "lens": "standard",
      "icon": "Lock",
      "accentColor": "gray",
      "visibility": "local",
      "createdAt": "2026-02-11T12:00:00Z"
    }
  ]
}
```

**Note:** Telemetry is NOT stored in config files or `index.js`. It lives in `<slug>/meta.json` and is lazy-loaded by the hub UI on demand.

## Behavior by Phase

| Phase | Behavior |
|---|---|
| **Phase 3D (checkpoint)** | After the research plan, **inform only** (don't ask) of the default visibility based on `gitRepo` presence (`"personal"` if gitRepo exists, `"local"` if not). Then handle contribution intent: if any library has `contributeEnabled: true`, ask per `confirmEachShare` setting — if `true` (default), ask the user; if `false` (power-user opt-in), auto-set to `"public"`. Projects always start as personal/local and are only upgraded to public when the user explicitly approves sharing (or has pre-approved via `confirmEachShare: false`). |
| **Phase 6 (BUILD)** | Write files to `src/projects/` (personal/public) or `src/local-projects/` (local). Update the correct registry and config. Set `visibility` field. |
| **Phase 7 step 5 (personal git sync)** | `git add -A` is safe — `src/local-projects/` is gitignored. Only personal + public projects get committed. |
| **Phase 7 step 6 (library share)** | Auto-share only if `visibility === "public"`. For personal/local: skip. |
| **Ad-hoc sharing** | "Share my X with the library" → if project is local or personal, **upgrade to public first** (move files if needed, update config), then share. Confirm with user: *"This will make the project public (synced + shared). Proceed?"* |

## Hub UI

The visibility tier is shown as a **read-only badge** on every project card in the hub:

**Visibility badges (on project cards in HubHome.jsx):**

| Badge | Icon | Color | Meaning |
|---|---|---|---|
| **Local** | `HardDrive` | gray | This machine only |
| **Synced** | `GitBranch` | blue | Synced to personal repo |
| **Public** | `Globe` | emerald | Synced + shared to public library |

**Visibility is config-only.** There is no UI to change visibility. The badge is informational. Visibility is set by:
- The skill during Phase 6 (based on Phase 3D contribution intent)
- Direct edits to `hub-config.json` or `.local-config.json`
- The `hub-doctor` script (`scripts/hub-doctor.mjs <hub-root>`) for reconciliation fixes

## Collection Visibility

Collections (template-mode output) use the same three visibility tiers at the **collection level** (not per-item):

| Tier | Files location | Config location |
|---|---|---|
| **Local** | `src/local-collections/<ext-slug>/` | `.local-config.json` |
| **Personal** | `src/collections/<ext-slug>/` | `hub-config.json` |
| **Public** | `src/collections/<ext-slug>/` | `hub-config.json` |

The same upgrade/downgrade rules apply. Sharing a collection to a library upgrades it to public.

## Edge Cases

| Situation | How to Handle |
|---|---|
| Existing projects missing `visibility` field | Treat missing `visibility` as `"personal"` (safe default). The agent should backfill the field when it next reads `hub-config.json`. |
| No `gitRepo` configured | All new projects default to `"local"`. User can still share to libraries (upgrades to public, but personal git sync won't work without a repo). |
| `src/local-projects/` directory doesn't exist yet | Create it on first local project. Hub App.jsx gracefully handles missing directory. |
| Dedup: user's project appears in both My Research and Public Library | Dedup logic removes it from Public Library. If dedup fails (no gitUsername match, no title+createdAt match), show in both — better to duplicate than to hide. |

# Community Library & Contribution

The Research Hub supports an optional community **contribution** model. Users can share their completed research dashboards to the public library, helping others learn and improving the skill through diverse research examples. This is separate from browsing — contributing requires a PAT.

## Architecture

```
┌─────────────────────┐     git push              ┌──────────────────────┐
│  User's Own Hub     │ ──────────────────────►   │  User's Own Repo     │
│  ~/git/personal-    │     (personal remote)     │  (their GitHub)      │
│  research-hub/      │                           │                      │
│                     │                           └──────────────────────┘
│                     │     GitHub API
│                     │  (blobs → tree → commit   ┌──────────────────────┐
│                     │   → update ref)           │  Public Library      │
│                     │ ──────────────────────►   │  mrshaun13/          │
│                     │     PAT auth              │  research-hub        │
└─────────────────────┘                           │  (agent-contributions│
                                                  │   branch)            │
                                                  └──────────┬───────────┘
                                                             │ push triggers
                                                  ┌──────────▼───────────┐
                                                  │  GitHub Action       │
                                                  │  • Detect projects   │
                                                  │  • Validate structure│
                                                  │  • Build test        │
                                                  │  • Auto-merge → main│
                                                  │  (or Issue on fail)  │
                                                  └──────────────────────┘
```

**Key design decision:** The personal hub and public library are **completely separate git repositories** with independent histories. Contributions cannot use `git push` across repos. Instead, the agent uses the **GitHub REST API** (Git Data endpoints) to create blobs, trees, and commits directly on the library's `agent-contributions` branch. This works with any PAT that has `Contents: write` permission — no local clone of the library is needed.

## Config

Contribution settings are stored in `hub-config.json` `libraries` array — each library entry has `contributeEnabled`, `token`, `gitUsername`, `branch`, and `remote` fields. See [hub-architecture.md](hub-architecture.md#libraries-array) for the full schema.

**Note on PAT storage:** The contributor PAT is stored in `hub-config.json` which IS committed to the personal hub repo. This is acceptable for **private** personal repos. If the personal repo is ever made public, GitHub push protection should block the push. Users should be aware of this tradeoff.

## Slug Collision Avoidance

When library sharing is enabled, project slugs are suffixed with the contributor's `gitUsername`:
- Local slug: `chainsaw-comparison`
- Library slug: `chainsaw-comparison-jdoe`

This ensures multiple contributors can research the same topic without overwriting each other's projects in the library.

## Agent-Side Setup (Phase 0B-LIBRARIES)

When the user opts in to contributing during Phase 0B-LIBRARIES and provides a PAT:

1. Update the library entry in `hub-config.json` with `contributeEnabled: true`, `token`, `gitUsername`, and `branch`
2. **No git remote is needed.** Contributions use the GitHub API directly.
3. The PAT is used as an `Authorization: token <PAT>` header on all API calls.

## Agent-Side Contribution Flow (Phase 7 Step 8)

For each library in `hub-config.json` `libraries` array where `contributeEnabled` is true, the agent shares the project via the GitHub REST API:

1. **Determine library slug:** `<local-slug>-<gitUsername>` (e.g., `pixel-upgrade-analysis-mrshaun13`)

2. **Get branch HEAD:**
   ```
   GET /repos/mrshaun13/research-hub/git/ref/heads/agent-contributions
   ```
   Extract the commit SHA, then get the tree SHA from that commit.

3. **Read the library's current `index.js`:**
   ```
   GET /repos/mrshaun13/research-hub/contents/src/projects/index.js?ref=agent-contributions
   ```
   Decode the base64 content. Add the new project's registry entry (lightweight metadata + telemetry from `meta.json`) to the `projectRegistry` array and add the lazy component import to `projectComponents`.

4. **Create blobs** for each project file and the updated `index.js`:
   ```
   POST /repos/mrshaun13/research-hub/git/blobs
   { "content": "<file content>", "encoding": "utf-8" }
   ```
   Files to push: `App.jsx`, all `components/*.jsx`, all `data/*.js`, `meta.json`, and the updated `index.js`.

5. **Create tree** with all blob entries:
   ```
   POST /repos/mrshaun13/research-hub/git/trees
   {
     "base_tree": "<tree SHA from step 2>",
     "tree": [
       { "path": "src/projects/<library-slug>/App.jsx", "mode": "100644", "type": "blob", "sha": "<blob SHA>" },
       { "path": "src/projects/<library-slug>/meta.json", "mode": "100644", "type": "blob", "sha": "<blob SHA>" },
       { "path": "src/projects/<library-slug>/components/Overview.jsx", ... },
       { "path": "src/projects/index.js", "mode": "100644", "type": "blob", "sha": "<updated index blob>" }
     ]
   }
   ```

6. **Create commit:**
   ```
   POST /repos/mrshaun13/research-hub/git/commits
   {
     "message": "Add <project title> (contributor: <gitUsername>)",
     "tree": "<new tree SHA>",
     "parents": ["<branch HEAD SHA from step 2>"]
   }
   ```

7. **Update ref** to point `agent-contributions` to the new commit:
   ```
   PATCH /repos/mrshaun13/research-hub/git/refs/heads/agent-contributions
   { "sha": "<new commit SHA>" }
   ```

8. **Inform the user:** "Your research has been shared with the public library. A validation workflow will run automatically — if it passes, your research will be merged to main without any manual steps."

All API calls use `Authorization: token <library.token>` header. If any call returns 401/403, inform the user the PAT may be invalid or expired.

## Automated Validation & Merge (Server-Side)

When a push lands on `agent-contributions`, a GitHub Action (`.github/workflows/process-contributions.yml`) runs automatically:

1. **Detect new projects** — compares `agent-contributions` against `main` to find new `App.jsx` files
2. **Validate project structure** — runs `.github/scripts/validate-research-project.mjs` which checks:
   - File structure: `App.jsx`, `meta.json`, `components/` (with Overview.jsx + Sources.jsx minimum), `data/` with substantial files
   - Registry entry: all required fields present, valid lens, valid slug format, ISO timestamps
   - Telemetry (in `meta.json`): all required fields, sane ranges, phase timing, content analysis, hours saved, consumption time
   - Content quality: React imports, JSX patterns, chart/visualization usage, data exports
   - Product lens extras: `productsCompared >= 3` for product lens projects
3. **Build test** — runs `npm ci && vite build` to verify no compilation errors
4. **If ALL pass** → auto-merges `agent-contributions` into `main` via the GitHub API merge endpoint (authenticated with `ADMIN_PAT` repo secret)
5. **If ANY fail** → creates a GitHub Issue with the full validation report, tagged `validation-failed`

## Security Model

| Layer | Protection |
|---|---|
| **Contributor PAT** | Fine-grained, scoped to `mrshaun13/research-hub` only, `Contents: write` permission. Can only push to `agent-contributions` (branch protection blocks `main`). |
| **Branch protection on `main`** | Repository ruleset requires PRs for changes. Only the repo admin (SSH) and the `ADMIN_PAT` (stored as a GitHub secret) can write to `main`. |
| **Validation script** | Lives on `main` — contributors cannot modify it. Runs server-side on GitHub's infrastructure. Checks structure, telemetry, content quality, and build integrity. |
| **Auto-merge** | Uses `ADMIN_PAT` (repo secret, invisible to contributors) via the GitHub API merge endpoint. Only executes after all validation checks pass. |
| **Failure notification** | Failed contributions create a GitHub Issue with details — visible to both the repo owner and the contributor. |

## Maintainer-Side Setup

The library maintainer (repo owner) needs to configure:

1. **Branch protection on `main`:**
   - Repository ruleset requiring pull requests for changes
   - Repository admin in the bypass list
   - `ADMIN_PAT` stored as a repo secret (Settings → Secrets → Actions) — this PAT must have `Contents: write` and belong to a repo admin

2. **GitHub Action** (`.github/workflows/process-contributions.yml`):
   - Already configured — triggers on push to `agent-contributions`
   - Validates, builds, and auto-merges on success

3. **Validation script** (`.github/scripts/validate-research-project.mjs`):
   - Already configured — comprehensive checks for structure, metadata, telemetry, and content quality

4. **Scoped PAT for contributors:**
   - Create a fine-grained PAT with:
     - Repository access: `mrshaun13/research-hub` only
     - Permissions: Contents (write)
   - Branch protection ensures this PAT can only write to `agent-contributions`
   - Distribute to users who opt in

## Zero-Effort Sharing

Users who don't have their own git repo can still share:
- The agent uses the GitHub API directly — no local clone of the library is needed
- After a build, the agent pushes project files via the API
- The user doesn't need to understand git — the agent handles everything

## Ad-Hoc Sharing

Users can share past research at any time by asking the skill:
> "Share my chainsaw comparison with the public library"

The skill will:
1. Read the project files from the user's local hub
2. Push them to `agent-contributions` via the GitHub API (same flow as Phase 7 step 8)
3. Confirm to the user: "Shared! The validation workflow will run automatically."

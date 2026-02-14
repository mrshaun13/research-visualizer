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
| **Phase 3D (checkpoint)** | After the research plan, **inform only** (don't ask): *"This project will be **[personal/local]** by default."* Default is based on `gitRepo` presence. User can change visibility later from the hub UI or by asking the agent. |
| **Phase 6 (BUILD)** | Write files to `src/projects/` (personal/public) or `src/local-projects/` (local). Update the correct registry and config. Set `visibility` field. |
| **Phase 7 step 5 (personal git sync)** | `git add -A` is safe — `src/local-projects/` is gitignored. Only personal + public projects get committed. |
| **Phase 7 step 6 (library share)** | Auto-share only if `visibility === "public"`. For personal/local: skip. |
| **Ad-hoc sharing** | "Share my X with the library" → if project is local or personal, **upgrade to public first** (move files if needed, update config), then share. Confirm with user: *"This will make the project public (synced + shared). Proceed?"* |

## Hub UI

The visibility tier is shown on every project card and controllable from the hub:

**Visibility badges (on project cards in HubHome.jsx):**

| Badge | Icon | Color | Meaning |
|---|---|---|---|
| **Local** | `HardDrive` | gray | This machine only |
| **Synced** | `GitBranch` | blue | Synced to personal repo |
| **Public** | `Globe` | emerald | Synced + shared to public library |

**VisibilitySelector (dropdown on each card):**
- Clicking the badge opens a small dropdown to change the tier
- **Upgrading** (local→personal, personal→public) requires a confirmation dialog
- **Downgrading** (public→personal) is instant (safe direction)
- **personal→local** warns: *"This project will be removed from your personal repo on next sync. Files remain locally and in git history."*

**Confirmation dialog (upgrade only):**
- Triggered when upgrading visibility
- For local→personal: "Sync this project to your personal repo? It will be available on all your machines."
- For personal→public or local→public: "Make this project public? It will be synced to your repo and shared to configured libraries."
- Two buttons: "Cancel" and "Confirm"
- Styled as a modal overlay with backdrop blur, consistent with hub dark theme

## Vite Server Middleware for Visibility Changes

Replace the old `/api/toggle-lock` with `/api/set-visibility`:

```js
{
  name: 'visibility-api',
  configureServer(server) {
    server.middlewares.use('/api/set-visibility', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const backup = {};
        try {
          const { slug, visibility } = JSON.parse(body);
          if (!['local', 'personal', 'public'].includes(visibility)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid visibility' }));
            return;
          }

          const configPath = path.resolve(__dirname, 'hub-config.json');
          const localConfigPath = path.resolve(__dirname, '.local-config.json');
          const config = JSON.parse(readFileSync(configPath, 'utf-8'));
          const localConfig = existsSync(localConfigPath)
            ? JSON.parse(readFileSync(localConfigPath, 'utf-8'))
            : { libraries: [] };
          if (!localConfig.localProjects) localConfig.localProjects = [];

          // Snapshot for rollback
          backup.config = JSON.stringify(config, null, 2);
          backup.localConfig = JSON.stringify(localConfig, null, 2);

          const inMain = config.projects.find(p => p.slug === slug);
          const inLocal = localConfig.localProjects.find(p => p.slug === slug);
          const project = inMain || inLocal;
          if (!project) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Project not found' }));
            return;
          }

          const currentVis = project.visibility || 'personal';
          const movingToLocal = visibility === 'local' && currentVis !== 'local';
          const movingFromLocal = visibility !== 'local' && currentVis === 'local';

          // Move files between directories if crossing the local boundary
          const projectsDir = path.resolve(__dirname, 'src/projects', slug);
          const localDir = path.resolve(__dirname, 'src/local-projects', slug);

          if (movingToLocal && existsSync(projectsDir)) {
            mkdirSync(path.resolve(__dirname, 'src/local-projects'), { recursive: true });
            renameSync(projectsDir, localDir);
            // Move metadata: hub-config → .local-config
            config.projects = config.projects.filter(p => p.slug !== slug);
            project.visibility = 'local';
            localConfig.localProjects.push(project);
          } else if (movingFromLocal && existsSync(localDir)) {
            renameSync(localDir, projectsDir);
            // Move metadata: .local-config → hub-config
            localConfig.localProjects = localConfig.localProjects.filter(p => p.slug !== slug);
            project.visibility = visibility;
            config.projects.push(project);
          } else {
            // Same directory — just update the field
            project.visibility = visibility;
          }

          writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
          writeFileSync(localConfigPath, JSON.stringify(localConfig, null, 2) + '\n');

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, slug, visibility, moved: movingToLocal || movingFromLocal }));
        } catch (e) {
          // Rollback on failure
          try {
            if (backup.config) writeFileSync(path.resolve(__dirname, 'hub-config.json'), backup.config + '\n');
            if (backup.localConfig) writeFileSync(path.resolve(__dirname, '.local-config.json'), backup.localConfig + '\n');
          } catch (_) {}
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    });
  },
}
```

**Note:** This middleware runs during `npm run dev` (Vite dev server). It reads/writes both `hub-config.json` and `.local-config.json`. The imports `writeFileSync`, `mkdirSync`, `renameSync`, and `existsSync` must all be imported from `'fs'` in `vite.config.js`. When files are moved between directories, the agent should regenerate both `index.js` registries on next invocation (or the user can restart the dev server).

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
| set-visibility API fails | Show error toast in hub UI. Visibility is not changed (rollback). User can retry or ask the agent to change it manually. |
| `src/local-projects/` directory doesn't exist yet | Create it on first local project (middleware uses `mkdirSync` with `recursive: true`). Hub App.jsx gracefully handles missing directory. |
| Dedup: user's project appears in both My Research and Public Library | Dedup logic removes it from Public Library. If dedup fails (no gitUsername match, no title+createdAt match), show in both — better to duplicate than to hide. |

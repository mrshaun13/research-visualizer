# First-Time Setup (Phase 0B)

This runs ONCE per machine. The goal is to either clone an existing personal hub or scaffold a new one, then create the machine-local pointer.

## Initial Prompt

1. **Inform the user immediately:**
   > "I see this is your first time running Research Visualizer on this machine. I'll set up a **Research Hub** — a single web app that will host all your research dashboards in one place. You'll never need multiple dev servers again."

2. **Ask about existing hub:**
   > "Do you have an existing personal Research Hub git repo from another machine? If so, I can clone it and you'll have all your previous research, settings, and library configs instantly. If not, I'll create a fresh one."

   - **If the user provides a git repo URL → Phase 0B-CLONE**
   - **If the user says no / skip → Phase 0B-SCAFFOLD**

## Phase 0B-CLONE: Clone Existing Hub

1. **Ask for install location:** Default: `~/git/personal-research-hub/`
2. **Clone the repo:** `git clone <repo-url> <chosen-path>`
3. **Run `npm install`** in the cloned directory
4. **Read `hub-config.json`** from the cloned repo — this has all projects, library configs, and settings already.
5. **Create pointer config** at `~/.codeium/windsurf/skills/research-visualizer/config.json`:
   ```json
   { "personalHubPath": "<chosen-path>" }
   ```
6. **Create `.local-config.json`** in the hub directory — for each library in `hub-config.json` `libraries` array where `browseEnabled` is true, ask the user where the library is cloned (or offer to clone it). Populate the `libraries` array with `{ name, alias, localPath }` entries.
7. **Inform the user:** "Cloned your Research Hub with N existing projects and M library connections."
8. **Continue to Phase 0B-LIBRARIES.**

## Phase 0B-SCAFFOLD: Create Fresh Hub

1. **Ask for hub location:** Default: `~/git/personal-research-hub/`
2. **Create the hub directory** and copy scaffold files verbatim from [hub-scaffold-templates.md](../assets/hub-scaffold-templates.md): `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.jsx`, `src/index.css`, `src/App.jsx`.
3. **Create `hub-config.json`** in the hub directory — set `version: "3.0"`, `skillVersion: "8.8"`, `port: 5180`, `gitRepo` (or null), empty `libraries` array, empty `projects` array, empty `collections` array.
4. **Run `node scripts/hub-gen.mjs <hub-path> scaffold`** — this generates: shared components (`GlossaryTerm`, `CustomTooltip`, `InsightCallout`), ESLint config, devDependencies, project registry, and stamps `skillVersion` in hub-config.json.
5. **Run `npm install`** in the hub directory.
6. **Initialize git repo:** `git init`, `git branch -m main`, `.gitignore` (node_modules/, dist/, .DS_Store, *.local, .local-config.json). Ask about connecting a remote — if provided, push; if skipped, local only.
7. **Create pointer config** at `~/.codeium/windsurf/skills/research-visualizer/config.json`:
   ```json
   { "personalHubPath": "<chosen-path>" }
   ```
8. **Create empty `.local-config.json`** in the hub directory: `{ "libraries": [] }`
9. **Continue to Phase 0B-LIBRARIES.**

## Phase 0B-LIBRARIES: Library Setup (One-Time Per Library)

**Skip if `hub-config.json` already has a non-empty `libraries` array.** This phase handles both browsing AND contributing for each library. Multiple libraries can be configured.

For each library the user wants to add (start with the default Community Research Hub):

1. **Ask about browsing:**
   > "Would you like to browse the **Community Research Hub**? Community-contributed dashboards you can explore alongside your own. No account needed — it's a public repo."

2. **If yes to browsing:**
   - Clone read-only: `git clone https://github.com/mrshaun13/research-hub.git <hubPath>/../research-hub` (or ask user for location)
   - Add library entry to `hub-config.json` `libraries` array with `browseEnabled: true`
   - Add entry to `.local-config.json` `libraries` array with `{ name, alias: "@public-library", localPath: "<clone-path>" }`
   - Run `npm install` in the library clone if needed

3. **Ask about contributing:**
   > "Would you also like to **contribute** your research back to this library? Zero effort after a one-time setup — your agent pushes via the GitHub API after each build."

4. **If yes to contributing:**
   - Capture `git config user.name` (for slug collision avoidance)
   - Ask for the contributor PAT (from the library maintainer). **Note:** The user does NOT need their own GitHub account or any git setup. The PAT is all that's needed — the agent uses the GitHub API directly.
   - Update the library entry in `hub-config.json`: set `contributeEnabled: true`, `confirmEachShare: true`, `token`, `gitUsername`, `branch: "agent-contributions"`
   - **Defaults:** `contributeEnabled` is `false` until the user explicitly provides a library remote AND a valid PAT. `confirmEachShare` defaults to `true` — the agent always asks before sharing. Users can set `confirmEachShare: false` later for auto-share (power-user opt-in).

5. **If no to browsing:** Add library entry with `browseEnabled: false`. User can enable later.
6. **If no to contributing:** Set `contributeEnabled: false` in the library entry. User can opt in later.

7. **Ask if the user wants to add another library:**
   > "Do you have any other shared research libraries to connect? (You can always add more later.)"
   - If yes → repeat steps 1-6 for the new library
   - If no → continue

8. **Continue to Phase 1** (or stop here if no topic was provided).

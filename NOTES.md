# Course Project 3: Wire Claude into Your Stack

## 1. Overview

This branch (`feature/claude-integrations`) connects Claude Code to the `course-api` Express project through four mechanisms: an MCP server, a project Skill, a custom slash command, and a `PostToolUse` hook. A headless-mode run is also documented below.

No application code, tests, or docs were changed. All additions live under `.claude/`, plus `.mcp.json` and this file.

Status markers used in this document:

- **Observed results** — outputs captured from actual terminal and Claude Code sessions.
- **Limitations** — what was configured but not tested, or not verified.

## 2. MCP server configuration

**Configuration** ([.mcp.json](.mcp.json)):

```json
{
  "mcpServers": {
    "docs": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem@2.0.1", "./docs"]
    }
  }
}
```

- Filesystem server named `docs`, scoped to `./docs` (the only directory argument).
- The server is enabled locally through `enabledMcpjsonServers` in `.claude/settings.local.json` (git-ignored, machine-local).

**Read-only permissions** ([.claude/settings.json](.claude/settings.json)):

| Rule | Tools |
|---|---|
| allow | `mcp__docs__read_text_file`, `mcp__docs__read_multiple_files`, `mcp__docs__list_directory` |
| deny | `mcp__docs__write_file`, `mcp__docs__edit_file`, `mcp__docs__move_file`, `mcp__docs__create_directory` |

Tools outside the allow list are not pre-approved, so they would prompt for permission.

**Observed results** (captured from earlier Claude Code sessions):

- The project MCP server `docs` connected, and `/mcp` displayed it as connected with 14 tools.
- `mcp__docs__read_text_file` successfully read `api.md` from the docs server root.
- The first attempt, using the path `docs/api.md`, returned `ENOENT`. The server root is already `./docs`, so paths must be relative to it (`api.md`).
- No files were modified.

**Limitations:** The names of all 14 tools were not recorded here. Only the read-only tools in the allow list were exercised, and the deny rules were not tested by attempting a write.

## 3. Project Skill: `express-route`

- **Location:** [.claude/skills/express-route/SKILL.md](.claude/skills/express-route/SKILL.md)
- **Purpose:** a workflow for creating or changing Express routes in this project. It covers route structure, data access through `db/store.js`, validation and status codes, tests, docs updates, and running `npm test` and `npm run lint`. It also says to preserve existing behavior.
- **Trigger description:** "Use this skill when the user asks to create, add, modify, or extend an Express API route, endpoint, or resource in this course-api project."

**Observed results** (captured from earlier Claude Code sessions):

- `express-route` appeared in `/skills` with status **On** and scope **project**.
- The Skill tool was invoked explicitly by Claude during planning for a `GET /products` request.
- No endpoint was implemented during that test.

**Limitations:** Automatic invocation without explicit selection was **not verified**. The observed invocation is the explicit Skill-tool call above, and no test showed the skill triggering on its own from the description alone.

## 4. Custom command: `/api-review`

- **Location:** [.claude/commands/api-review.md](.claude/commands/api-review.md)
- **Purpose:** a read-only review of an Express route (`/api-review users` reviews `routes/users.js`). It checks input validation, status codes and error shape, drift against `docs/api.md`, and test coverage. It uses only Read, Glob, and Grep, and never edits files.
- **Run:** Verified. `/api-review users` was executed and no files were modified.

Results of that run (suggestions only, none applied):

- **Medium**
  - A non-numeric `:id` returns `404` instead of `400` ([routes/users.js:13](routes/users.js#L13), [routes/users.js:36](routes/users.js#L36)).
  - `PUT` accepts empty or `null` `name`/`email` ([routes/users.js:33](routes/users.js#L33)).
  - There is no error-handling middleware, so malformed JSON returns HTML ([server.js:6](server.js#L6)).
  - No type or format checks on `POST` fields ([routes/users.js:23](routes/users.js#L23)).
- **Low**
  - `req.body` may be undefined under Express 5.
  - No JSON catch-all for unknown routes.
  - `listUsers()` returns the internal array.
  - A stale history comment sits at [routes/users.js:30](routes/users.js#L30).
- **Docs drift:** none.
- **Missing tests:** `GET /users/:id` success, `POST` `400`, and `PUT` `400`.

## 5. PostToolUse hook: ESLint after Write or Edit

- **Files:** [.claude/hooks/lint-on-edit.js](.claude/hooks/lint-on-edit.js), registered in [.claude/settings.json](.claude/settings.json) under `hooks.PostToolUse` with matcher `Write|Edit`.
- **Behavior:**
  - Only `.js`, `.cjs`, and `.mjs` files are linted. Markdown, JSON, and other extensions are skipped.
  - Files outside the project or inside `node_modules` are skipped.
  - Files not covered by the ESLint config are skipped silently (`--no-warn-ignored`).
  - ESLint is invoked via `process.execPath` and `node_modules/eslint/bin/eslint.js` to avoid `.cmd` shims on Windows.
  - It runs with `--max-warnings 0`, so warnings are reported too.
  - `--fix` is never passed. Problems are reported on stderr with exit code 2, which delivers them to Claude.
  - It exits 0 when ESLint is missing, input is malformed, or the file is clean.
- **Pre-install checks:** Verified. Before dependencies were installed, `README.md`, `package.json`, an out-of-project path, and invalid input all exited 0 silently, and `routes/users.js` exited 0 with a "not installed" notice.
- **Live test:** Verified. After `npm install`, `tmp-hook-test.js` was created with the Write tool, containing:

  ```js
  const unusedValue = 1;
  undefinedFunction();
  ```

  - The hook ran and reported to Claude: `1:7 warning 'unusedValue' is assigned a value but never used (no-unused-vars)` and `2:1 error 'undefinedFunction' is not defined (no-undef)`, totaling 2 problems (1 error, 1 warning).
  - **No automatic fix:** the file content was identical after the hook ran.
  - Only the temporary file was deleted afterward.

## 6. Headless mode

**Exact successful command** (PowerShell):

```powershell
claude -p "Read routes/users.js and summarize the available API endpoints. Do not modify any files." --tools "Read" --allowedTools "Read" --permission-mode dontAsk --max-turns 5
```

**`--tools` versus `--allowedTools`:**

- `--tools "Read"` restricts which built-in tools exist for the session. Only `Read` is available, so Write, Edit, and Bash are not offered to the model at all.
- `--allowedTools "Read"` pre-approves `Read` so it runs without a permission prompt.
- `--permission-mode dontAsk` makes any action that would need approval fail instead of prompting. This matters in non-interactive `-p` mode, where nobody can answer a prompt.
- `--max-turns 5` caps the number of agent turns.

**Observed output:** the command succeeded and correctly summarized the four endpoints in `routes/users.js`: `GET /users`, `GET /users/:id`, `POST /users`, and `PUT /users/:id`. No modifications were reported.

**Limitations:** The full raw output was not saved. The summary above is taken from the captured result.

## 7. Verification

All verified after `npm install`:

- `npm test`: 5 tests, 5 passed, 0 failed.
- `npm run lint`: passed (no output, exit code 0).
- `package.json` and `package-lock.json`: tracked, no diff.
- `git status`: only `.claude/` and `.mcp.json` untracked, plus this file.
- No application code, tests, or docs were modified. Nothing was staged, committed, or pushed.

## 8. Known limitations

- `npm install` reported 7 vulnerabilities (2 moderate, 4 high, 1 critical). No `npm audit fix` was run, so the dependency tree is unchanged, and the findings are untriaged.
- The hook treats warnings as failures (`--max-warnings 0`). Remove that flag if only errors should be surfaced.
- Automatic Skill triggering (section 3) was not verified.
- The MCP deny rules (section 2) were configured but not tested with an attempted write.
- The `/api-review` findings in section 4 have not been addressed.

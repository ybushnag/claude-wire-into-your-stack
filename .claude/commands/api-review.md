---
description: Read-only review of an Express route against validation rules, status codes, docs/api.md, and tests
argument-hint: [route or resource name, e.g. users]
allowed-tools: Read, Glob, Grep
---

# API review (read-only)

Review the Express route for: $ARGUMENTS

If no argument was given, review every file in `routes/`.

## Rules
- This command is strictly read-only. Do NOT edit, create, or delete any file.
- Do NOT run git commands that change state: no `git add`, `git commit`, or `git push`.
- Use only Read, Glob, and Grep. Report findings; do not fix them.

## Steps

1. **Locate the code.** Resolve the argument to `routes/<name>.js` (accept `users`, `/users`, or `users.js`). If nothing matches, list the files in `routes/` and stop. Then read:
   - the route file
   - `db/store.js` (the helpers the route uses)
   - how the route is mounted in `server.js`
   - `docs/api.md`
   - `tests/<name>.test.js`, if it exists

2. **Check input validation.** For each handler, verify against the project conventions:
   - Input is validated in the route, before touching the store, with early `return`s.
   - Required fields and edge cases (missing, empty, wrong type, non-numeric `:id`) are handled.
   - `Number(req.params.id)` is used for ids.

3. **Check HTTP status codes and errors.**
   - `400` for bad or missing input, `404` for a missing record, `201` for creation, `200` otherwise.
   - Every error body is JSON in the shape `{ "error": "message" }`.
   - All data access goes through `db/store.js`; the route holds no state.

4. **Compare with `docs/api.md`.** Flag:
   - endpoints in code but not documented
   - documented endpoints that do not exist in code
   - mismatches in request body, status codes, or behavior

5. **Identify missing test coverage.** Compare handlers to the tests in `tests/<name>.test.js`. For each handler, list which of the success, `400`, and `404` cases have no test. Note any test that does not follow the `'METHOD /path <behavior>'` naming or the `test.beforeEach(() => store.reset())` convention.

6. **Report.** Output exactly these sections:
   - **Scope:** the files reviewed.
   - **Findings:** a table with columns Severity (high/medium/low), Location (`file:line`), Issue.
   - **Docs drift:** differences from `docs/api.md`, or "none".
   - **Missing tests:** handler and uncovered cases, or "none".
   - **Recommendations:** a prioritized list of suggested changes. Suggest only; do not apply them.

If everything is consistent, say so plainly rather than inventing findings.

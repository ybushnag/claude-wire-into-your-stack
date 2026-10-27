---
name: express-route
description: >
  Use this skill when the user asks to create, add,
  modify, or extend an Express API route, endpoint,
  or resource in this course-api project.
---

# Express route workflow (course-api)

Follow these steps for any route, endpoint, or resource change. Read `routes/users.js`, `db/store.js`, and `tests/users.test.js` first and match their style.

## 1. Route structure
- CommonJS only (`require` / `module.exports`), single quotes, semicolons, 2-space indent.
- One file per resource in `routes/<resource>.js`: create `express.Router()`, define relative paths (`'/'`, `'/:id'`), and `module.exports = router`.
- New resource: mount it in `server.js` with `app.use('/<resource>', <resource>Router)`.
- Put a one-line `// METHOD /path — description` comment above each handler.
- Convert ids with `Number(req.params.id)`.

## 2. Data access
- All reads and writes go through `db/store.js`. Routes never hold state.
- Add new helpers to `db/store.js` (verb + noun, e.g. `listPosts`) and export them. Extend `seed()` / `reset()` if the new data needs seeding.

## 3. Validation and errors
- Validate input in the route, before touching the store, with early `return`s.
- `400` for bad or missing input, `404` when a record is missing, `201` for creation, `200` otherwise.
- Every error body is JSON: `{ "error": "message" }`.

## 4. Tests
- Add or update `tests/<resource>.test.js` using `node:test`, `node:assert`, and `supertest` against `require('../server')`.
- Keep `test.beforeEach(() => store.reset())`.
- Name tests `'METHOD /path <expected behavior>'`; assert status first, then body.
- Cover the success case plus each relevant `400` and `404` case.

## 5. Docs
- Update `docs/api.md` for every endpoint added or changed, in the existing format: heading, behavior, request body, and status codes.

## 6. Verify
- Run `npm test` and `npm run lint`. Both must pass before you finish; report any failure instead of hiding it.

## 7. Preserve behavior
- Do not change existing endpoints, status codes, error messages, or store behavior unless the user explicitly asks. Keep diffs limited to what the task needs.

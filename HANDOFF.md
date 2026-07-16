# Handoff log

Append-only. Every development session adds an entry here before merging or handing off,
in this format:

```
### [branch: feat/xxx] — YYYY-MM-DD HH:MM WIB
**changed:** what was implemented
**interface impact:** does this change the API contract in docs/api-contract.md?
**still open:** what's unfinished
**next agent should:** what to pick up, and anything not to touch without re-checking
```

Newest entries go at the bottom.

---

### [branch: feat/devops-gunta] — 2026-07-16 WIB
**changed:** added `.github/workflows/ci.yml` — three jobs (backend/ai-service/frontend),
each skips gracefully if that service's manifest file doesn't exist yet, runs on PRs to `main`
and pushes to `main`.
**interface impact:** none.
**still open:** branch protection on `main` (require this workflow as a status check, PR-only
merges) is not yet configured in GitHub settings — needs repo admin access via the web UI
or an authenticated `gh` CLI.
**next agent should:** once `backend/pom.xml`, `ai-service/requirements.txt`, or
`frontend/package.json` exist, verify the corresponding CI job actually runs (not just
skips) on the next PR.

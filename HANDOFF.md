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

### [branch: main] — 2026-07-17 WIB

**changed:** added `.github/workflows/ci.yml` (pulled from `feat/devops-gunta`, three jobs —
backend/ai-service/frontend, each skips gracefully if that service's manifest doesn't exist yet)
directly onto `main`. Retargeted triggers to `push: [main, staging]` + `pull_request: [main]`,
so `staging` gets non-blocking CI visibility on every push, and PRs into `main` get the same
jobs as required status checks once branch protection is turned on.
**interface impact:** none.
**still open:** branch protection on `main` (require PR, require the 3 CI jobs as status
checks, no required approvals) still needs to be configured in GitHub settings by a repo
admin — not something automatable from here. `staging` branch cut from this commit, intended to
be the default target for all `feat/*` merges (fast, unprotected); `main` only receives PRs from
`staging`. Vercel connection (Production Branch = `main`, root dir = `frontend`) also still
needs to be done via the Vercel dashboard by an account owner.
**next agent should:** once branch protection is live, verify a real PR from `staging` into
`main` actually shows the 3 jobs as required checks (not just running).

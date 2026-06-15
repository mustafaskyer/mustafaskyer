# Agent Notes

- Before rewriting a GitHub profile README, inspect the existing README and public
  repository evidence first. The profile should distinguish original public
  projects from forks/private context and avoid unsupported claims.
- Keep top profile badges compact and grouped near the opening statement when
  the user asks for "top tags"; avoid scattering stack badges through the file.
- Avoid third-party GitHub stats cards that label values as total commits or
  PRs unless the counting method is explained. GitHub's native contribution
  graph is filtered by profile contribution rules and is not a raw activity log.
- If syncing contribution numbers, use GitHub GraphQL's
  `contributionsCollection` and update only the bounded
  `GITHUB-ACTIVITY` block. Do not present public commit/PR breakdowns as total
  activity because restricted/private contributions are exposed only as a total.
- Recent activity in the README should come from `GET /users/{login}/events`
  and should be labelled public activity. The feed may temporarily be dominated
  by profile repository pushes after README/workflow maintenance.
- The activity workflow is intentionally scheduled once daily at 12:00 am UTC.
  Keep `scripts/check-activity-sync-config.mjs` aligned with the workflow cron
  whenever this cadence changes.
- Public events can omit web URLs such as `pull_request.html_url`; when
  formatting README activity, derive stable GitHub links from repo/name fields
  and cover those payload shapes with tests.

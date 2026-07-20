# Required checks for `main`

Configure repository branch protection to require:

## Build

- Frontend Build

## Security (required)

- npm audit (high+)
- Analyze *(CodeQL)*
- Gitleaks
- Crypto Static Guards
- Dependency Review *(pull requests — npm audit high+)*

Require the branch to be up to date and disable administrator bypass.

## Not required for merge (scheduled / informational)

- OpenSSF Scorecard (`ossf-scorecard.yml`)

## External checks (not controlled by this repo)

- **Vercel** — “Authorization required to deploy” means a team admin must open the
  Vercel authorize link on the PR (or reconnect the GitHub integration). It is not
  a frontend code failure.

# TripWeaver — instructions for Claude Code

This is a normal git repository (`origin` = `wadamczewski/tripweaver-unmocked`).
It is not synced or managed by any external project-mirror mechanism.

Start with `PROJECT_STATUS.md` for current architecture, provider status
(what's real vs. demo-fallback vs. not implemented), and known gaps.
`README.md` has setup instructions and a general project overview.

## Keep the docs current

Whenever a change affects what's described in `README.md` or
`PROJECT_STATUS.md` — a new feature, a provider moving from demo to real (or
the reverse), a newly discovered gap or limitation, a changed setup step, a
new module worth mentioning in the architecture section — update the
relevant file(s) as part of that same change. Don't treat it as a follow-up
or wait to be asked.

- `README.md`: setup/run instructions, architecture overview, provider list,
  known limitations.
- `PROJECT_STATUS.md`: the provider status table, what's implemented vs.
  not, suggested next steps.

Skip the update if the change is purely cosmetic or internal refactoring
with no user- or contributor-facing effect — don't pad these files with
noise just to satisfy this rule.

## Other conventions

- Never commit `.env.local` or any file containing real API keys/tokens.
- Don't run `npm run build` while the dev server (`npm run dev`) is running —
  they share `.next` and corrupt each other's build state. Stop the dev
  server, `rm -rf .next`, then rebuild/restart.
- Don't run local `npm run dev` and `docker compose up` at the same time —
  both bind port 3210, so the second one to start will fail. The
  container's `.next`/`node_modules` are isolated Docker volumes, not
  bind-mounted, so there's no build-state corruption risk between them
  the way there is with `npm run build`, but only one can hold the port.

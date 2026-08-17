# AGENTS.md

Guidance for human and AI contributors working in this repository.

## 1. Purpose

ATV-Teams is a control plane for AI-agent companies.
The current implementation target is V1 and is defined in `doc/SPEC-implementation.md`.

## 2. Read This First

Before making changes, read in this order:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` is long-horizon product context.
`doc/SPEC-implementation.md` is the concrete V1 build contract.

## 3. Repo Map

- `server/`: Express REST API and orchestration services
- `ui/`: React + Vite board UI
- `packages/db/`: Drizzle schema, migrations, DB clients
- `packages/shared/`: shared types, constants, validators, API path constants
- `packages/adapters/`: agent adapter implementations (Claude, Codex, Cursor, etc.)
- `packages/adapter-utils/`: shared adapter utilities
- `packages/plugins/`: plugin system packages
- `packages/skills-catalog/`: app-shipped skills catalog (`@paperclipai/skills-catalog`)
- `packages/teams-catalog/`: app-shipped teams catalog (`@paperclipai/teams-catalog`)
- `cli/`: `paperclipai` CLI package (published bin, agent-facing commands)
- `skills/`: Paperclip runtime/operational skills (not part of the app catalog)
- `doc/`: operational and product docs

## 4. Dev Setup (Auto DB)

Use embedded PGlite in dev by leaving `DATABASE_URL` unset.

```sh
pnpm install
pnpm dev
```

This starts:

- API: `http://localhost:3100`
- UI: `http://localhost:3100` (served by API server in dev middleware mode)

Quick checks:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

Reset local dev DB:

```sh
rm -rf data/pglite
pnpm dev
```

## 5. Core Engineering Rules

1. Keep changes company-scoped.
Every domain entity should be scoped to a company and company boundaries must be enforced in routes/services.

2. Keep contracts synchronized.
If you change schema/API behavior, update all impacted layers:
- `packages/db` schema and exports
- `packages/shared` types/constants/validators
- `server` routes/services
- `ui` API clients and pages

3. Preserve control-plane invariants.
- Single-assignee task model
- Atomic issue checkout semantics
- Approval gates for governed actions
- Budget hard-stop auto-pause behavior
- Activity logging for mutating actions

4. Do not replace strategic docs wholesale unless asked.
Prefer additive updates. Keep `doc/SPEC.md` and `doc/SPEC-implementation.md` aligned.

5. Keep repo plan docs dated and centralized.
When you are creating a plan file in the repository itself, new plan documents belong in `doc/plans/` and should use `YYYY-MM-DD-slug.md` filenames. This does not replace ATV-Teams issue planning: if a ATV-Teams issue asks for a plan, update the issue `plan` document per the `paperclip` skill instead of creating a repo markdown file.

6. Attach inspectable generated artifacts.
When your task produces a user-inspectable deliverable file, follow the Paperclip skill's "Generated Artifacts and Work Products" workflow before final disposition. In this repo, prefer the self-contained skill helper at `skills/paperclip/scripts/paperclip-upload-artifact.sh` so the file is available through the Paperclip API, create/update an artifact work product when the file is the deliverable, link the uploaded artifact in the final issue comment, and then set status. Do not rely on local filesystem paths as the only access path. If an important file intentionally remains workspace-only, create/update a work product with `metadata.resourceRef.kind: "workspace_file"` and a workspace-relative path, then name that work product and path in the final comment. Treat browse/search as a fallback for recovering workspace files, not the preferred deliverable path. See `doc/AGENT-ARTIFACTS.md` for details and `.mp4`/`.webm` examples.

## 6. Database Change Workflow

When changing data model:

1. Edit `packages/db/src/schema/*.ts`
2. Ensure new tables are exported from `packages/db/src/schema/index.ts`
3. Generate migration:

```sh
pnpm db:generate
```

4. Validate compile:

```sh
pnpm -r typecheck
```

Notes:
- `packages/db/drizzle.config.ts` reads compiled schema from `dist/schema/*.js`
- `pnpm db:generate` compiles `packages/db` first

## 7. Verification Before Hand-off

Default local/agent test path:

```sh
pnpm test
```

This is the cheap default and only runs the Vitest suite. Browser suites stay opt-in:

```sh
pnpm test:e2e
pnpm test:release-smoke
```

Run the browser suites only when your change touches them or when you are explicitly verifying CI/release flows.

For normal issue work, run the smallest relevant verification first. Do not default to repo-wide typecheck/build/test on every heartbeat when a narrower check is enough to prove the change.

Run this full check before claiming repo work done in a PR-ready hand-off, or when the change scope is broad enough that targeted checks are not sufficient:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

If anything cannot be run, explicitly report what was not run and why.

## 8. API and Auth Expectations

- Base path: `/api`
- Board access is treated as full-control operator context
- Agent access uses bearer API keys (`agent_api_keys`), hashed at rest
- Agent keys must not access other companies

When adding endpoints:

- apply company access checks
- enforce actor permissions (board vs agent)
- write activity log entries for mutations
- return consistent HTTP errors (`400/401/403/404/409/422/500`)

## 9. UI Expectations

- Keep routes and nav aligned with available API surface
- Use company selection context for company-scoped pages
- Surface failures clearly; do not silently ignore API errors

## 10. Pull Request Requirements

When creating a pull request (via `gh pr create` or any other method), you **must** read and fill in every section of [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). Do not craft ad-hoc PR bodies — use the template as the structure for your PR description. Required sections:

- **Thinking Path** — trace reasoning from project context to this change (see `CONTRIBUTING.md` for examples)
- **What Changed** — bullet list of concrete changes
- **Verification** — how a reviewer can confirm it works
- **Risks** — what could go wrong
- **Model Used** — the AI model that produced or assisted with the change (provider, exact model ID, context window, capabilities). Write "None — human-authored" if no AI was used.
- **Checklist** — all items checked

## 11. Definition of Done

A change is done when all are true:

1. Behavior matches `doc/SPEC-implementation.md`
2. Typecheck, tests, and build pass
3. Contracts are synced across db/shared/server/ui
4. Docs updated when behavior or commands change
5. PR description follows the [PR template](.github/PULL_REQUEST_TEMPLATE.md) with all sections filled in (including Model Used)

## Design system

`DESIGN.md` at the repo root is the source of truth for UI design decisions. The token-only rule applies to all `ui/` changes: every color, spacing, radius, type, shadow, and motion value in `ui/src/components/**` and `ui/src/pages/**` comes from the token layer in `ui/src/index.css` — no hex, raw px, arbitrary Tailwind bracket values, or raw `font-size`/`fontSize` declarations in components, outside the documented allowlist in `ui/src/index.css`. Run `pnpm check:token-gates` (`scripts/check-token-gates.mjs`) before committing UI changes — it fails on any violation not covered by that allowlist.

## 11. Fork-Specific: shyamsridhar123/ATV-Teams

This is the `shyamsridhar123/ATV-Teams` repository. The product is presented to end users as **ATV-Teams** while internal package names (`@paperclipai/*`), the `paperclipai` CLI binary, and the `~/.paperclip/` config directory are intentionally preserved for back-compat with the existing install path and the existing lockfile.

### Brand vs. internals

- **Rebrand:** display name, READMEs, docs, UI titles, web manifest, CLI banner, and `package.json` identity (`name`, `description`, `homepage`, `repository`) → ATV-Teams.
- **Kept as-is:** workspace package names (`@paperclipai/*`), CLI binary (`paperclipai`), user config dir (`~/.paperclip/`), runtime branding HTML comment markers (`PAPERCLIP_RUNTIME_BRANDING_*`, `PAPERCLIP_FAVICON_*`), telemetry env var (`PAPERCLIP_TELEMETRY_DISABLED`), and exported identifiers such as `resolvePaperclipEnvFile` or the `paperclipApiUrl` wire field.
- **CSS classes:** the fork renamed `paperclip-*` to `atv-*` in `ui/src/index.css` and its consumers. New classes arriving from upstream are renamed to match during a sync.
- When in doubt, prefer keeping internal identifiers stable; rebrand only user-visible strings.

### Running the CLI

Docs use `pnpm paperclipai <command>`, not `npx paperclipai`. The root `package.json` defines a `paperclipai` script that runs the CLI from this repo; `npx` would fetch the published upstream package instead.

### Repo identity

- All `paperclipai/paperclip` and `HenkDz/paperclip` references in top-level docs point to `shyamsridhar123/ATV-Teams`.
- External community URLs (`paperclip.ing`, Discord, Twitter) from upstream have been dropped. Add ATV-Teams equivalents here when they exist.

### Adapter story

- Built-in adapters in `packages/adapters/` (Claude, Codex, Cursor, Gemini, Grok, Hermes, OpenClaw, OpenCode, Pi) remain available.
- The standalone `acpx-local` adapter package was removed in the 2026-08 upstream sync. Upstream folded that capability into the shared `packages/adapter-utils/src/acpx-engine/`, which is still present.
- External adapters can still be loaded as plugins via `~/.paperclip/adapter-plugins.json` per the upstream plugin-loader contract.

### Upstream sync

- `upstream` remote: `https://github.com/paperclipai/paperclip.git` (branch `master`).
- `scripts/upstream-sync-rebrand.mjs` re-applies the rebrand rules above to a file taken from upstream. It guards internal identifiers with sentinels, so run it only on files resolved to upstream's version.

### Running tests on Windows

`pnpm test:run` does not fully pass on Windows, and did not before the 2026-08 upstream sync either. Measured on the same machine, `server/src/__tests__/claude-local-execute.test.ts` failed 15 of 16 tests at the pre-merge commit `5c05cb10` and 22 of 24 after the merge, with the identical error. The extra failures are additional upstream tests hitting the same limitation, not a regression.

Two causes, both from test fixtures written for Linux CI:

1. **Fake CLI binaries.** Adapter execute suites write an extensionless `bin/claude` or `bin/codex` shell script and spawn it. Windows cannot execute a file with no extension and no `#!` handling, so every spawn fails with `Failed to start command`. Affects `claude-local-execute`, `codex-local-execute`, and parts of `workspace-runtime`.
2. **Symlinks.** Fixtures call `fs.symlink` directly. Windows needs Developer Mode for unelevated symlink creation:

```powershell
Set-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' AllowDevelopmentWithoutDevLicense 1
```

With Developer Mode on, `workspace-runtime.test.ts` goes from failing to load to 48 passing. Without it, DB-backed suites self-skip via `getEmbeddedPostgresTestSupport()` rather than failing.

Two Windows fixes already applied to the runner itself:

- `scripts/ensure-workspace-package-links.ts` falls back to a junction when `fs.symlink` returns `EPERM`.
- `scripts/run-vitest-stable.mjs` spawns `node node_modules/vitest/vitest.mjs` directly. Going through the `pnpm` shim fails with `ENOENT` (it is a `.cmd`), and using `shell: true` instead hits the 8191-character command-line limit once the general-server lane passes ~270 `--exclude` args.

Treat CI (Linux) as the authority for a full green suite. On Windows, verify with `pnpm -r typecheck`, `pnpm build`, and targeted suites for the area you changed.

### AWS SDK is optional

`@aws-sdk/client-s3` sits in `server/package.json` under `optionalDependencies`, not `dependencies`. The fork defaults to local disk storage and does not use S3 or AWS Secrets Manager, and a required AWS dependency forces the whole SDK tree (dozens of packages) to resolve on every install.

Both consumers load it with a dynamic `import()` and fail with a clear 422 when it is absent:

- `server/src/storage/s3-provider.ts` — the `s3` storage provider
- `server/src/secrets/aws-secrets-manager-provider.ts` — the `aws_secrets_manager` secrets provider

To use either, install the SDK explicitly:

```sh
pnpm --filter @paperclipai/server add @aws-sdk/client-s3
```

This diverges from upstream, which keeps the dependency required. Expect a conflict here on future syncs.

### Registry-compatibility overrides

The `pnpm.overrides` block pins `cytoscape`, `eventsource-parser`, `hono`, and `ip-address` one release below what upstream's lockfile resolves. These are not product decisions: an internal npm mirror (`packagefeedproxy.microsoft.io`) had not yet synced the newest patch, so `pnpm install` failed with `ERR_PNPM_FETCH_404`. Each pin is at most one patch behind.

Drop a pin once the mirror catches up, or when installing against a registry that carries the newer version. To check:

```sh
curl -s https://packagefeedproxy.microsoft.io/npm/<pkg> | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)['dist-tags'].latest))"
```


### Local Dev notes (inherited from the fork lineage)

- Server can run on port 3101+ if 3100 is taken by an upstream instance.
- On NTFS, prefer `node node_modules/vite/bin/vite.js build` over `npx vite build`; server startup from NTFS can take 30–60s.
- Kill stale processes before starting: `pkill -f "paperclip"; pkill -f "tsx.*index.ts"`.
- Vite cache survives `rm -rf dist`; delete both `ui/dist` and `ui/node_modules/.vite`.
- `pnpm install` links the plugin SDK with a directory symlink. On Windows without Developer Mode that needs a junction fallback, which `scripts/link-plugin-dev-sdk.mjs` handles.

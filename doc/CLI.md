# CLI Reference

ATV-Teams CLI now supports both:

- installation and lifecycle management (`install`, `uninstall`, `update`, `upgrade`, `service`)
- instance setup/diagnostics (`onboard`, `doctor`, `configure`, `env`, `allowed-hostname`, `env-lab`)
- control-plane client operations (issues, approvals, agents, activity, dashboard)

## Security: safe invocation for content-bearing arguments

This fork is not published as the `paperclipai` npm package. An unversioned
`npx paperclipai` command can download and run upstream code instead of this
checkout.

Do not use `pnpm paperclipai` for a command with a caller-supplied value.
`pnpm` appends the value to a shell command string. The shell can interpret
command substitutions and environment-variable expansions before the CLI
starts.

Use this direct local command for every path, ref, id, name, payload, secret,
or free-text argument:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts <command> <args>
```

It runs the checked-out source and passes each argument as inert `argv` data
directly to the CLI.
For shorter interactive commands, define the local `paperclipai` alias from
`doc/DEVELOPING.md`.

`pnpm paperclipai` remains valid only for exact fixed commands on the guard
allowlist, such as `pnpm paperclipai --help`, `pnpm paperclipai onboard --yes`,
and `pnpm paperclipai doctor`. A fixed command has no path, id, ref, name,
placeholder, interpolation, or value-bearing option.

The fail-closed guard lives in
`server/src/__tests__/cli-invocation-safety.test.ts`. It checks all current
guidance surfaces.

### Offline and air-gapped use

The direct local command runs without registry access after dependencies are
installed. Copy the repository and pnpm store into the air-gapped environment,
complete the install from that store, and run:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts <command> <args>
```

Do not use `npx` as an offline fallback. It can resolve a different published
package.

## Base Usage

Use repo script in development:

```sh
pnpm paperclipai --help
```

Installation and interactive onboarding:

ATV-Teams is not published to npm, so the CLI runs from a clone via the root
`paperclipai` package script. There is no hosted installer for this fork.

```sh
git clone https://github.com/shyamsridhar123/ATV-Teams.git
cd ATV-Teams
pnpm install
pnpm paperclipai onboard --yes
```

The in-repo `scripts/install.sh` is inherited from upstream and expects a
published package, so it is not the supported path here.

First-time local bootstrap from a source checkout:

```sh
pnpm paperclipai run
```

Choose local instance:

```sh
paperclipai run --instance dev
```

## Install, Update, And Uninstall

Managed installs keep CLI payloads under `~/.paperclip/cli`, expose a stable
`~/.local/bin/paperclipai` shim, switch versions atomically, and retain two
previous payloads for rollback.

```sh
paperclipai install
paperclipai install --canary
paperclipai install --version <version>
paperclipai install --ref <branch|tag|sha> [--repo owner/repo]
paperclipai update
paperclipai update --latest|--canary|--version <version>
paperclipai update --rollback
paperclipai upgrade
paperclipai uninstall
```

`upgrade` aliases `update`. `uninstall` removes managed code and the shim but
preserves instance data under `~/.paperclip/instances/`. See
`doc/INSTALLING.md` for installation methods, security notes, PATH setup, and
the complete update and rollback behavior.

## Onboarding And Service Management

Interactive onboarding offers to install a background service on supported
platforms. `--yes` never installs it implicitly; automation must opt in.

```sh
paperclipai onboard
paperclipai onboard --yes
paperclipai onboard --yes --install-service
paperclipai onboard --yes --no-install-service
```

Service lifecycle commands remain under the `service` namespace:

```sh
paperclipai service install [--no-start-now] [--no-start-on-login]
paperclipai service uninstall
paperclipai service start
paperclipai service stop
paperclipai service restart [--wait]
paperclipai service status [--json]
paperclipai service logs [-f]
```

Every service verb supports `--instance <id>` and `--json`. Linux and WSL2 use
a systemd user unit when available; macOS uses a LaunchAgent. Unsupported
environments receive foreground `paperclipai run` guidance.

`paperclipai doctor` includes managed-install and service-health diagnostics in
addition to configuration, storage, database, logging, and port checks.

## Deployment Modes

Mode taxonomy and design intent are documented in `doc/DEPLOYMENT-MODES.md`.

Current CLI behavior:

- `paperclipai onboard` and `paperclipai configure --section server` set deployment mode in config
- server onboarding/configure ask for reachability intent and write `server.bind`
- `paperclipai run --bind <loopback|lan|tailnet>` passes a quickstart bind preset into first-run onboarding when config is missing
- runtime can override mode with `PAPERCLIP_DEPLOYMENT_MODE`
- `paperclipai run` and `paperclipai doctor` still do not expose a direct low-level `--mode` flag

Canonical behavior is documented in `doc/DEPLOYMENT-MODES.md`.

Allow an authenticated/private hostname (for example custom Tailscale DNS):

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts allowed-hostname dotta-macbook-pro
```

Bring up the default local SSH fixture for environment testing:

```sh
pnpm paperclipai env-lab up
pnpm paperclipai env-lab doctor
pnpm paperclipai env-lab status --json
pnpm paperclipai env-lab down
```

All client commands support:

- `--data-dir <path>`
- `--api-base <url>`
- `--api-key <token>`
- `--context <path>`
- `--profile <name>`
- `--json`

Company-scoped commands also support `--company-id <id>`.

API base resolution order:

1. `--api-base <url>`
2. `PAPERCLIP_API_URL`
3. selected context profile `apiBase`
4. local ATV-Teams config server port
5. `http://localhost:3100`

Connection failures include the attempted URL and a `GET /api/health` check hint.

## Connect Wizard

```sh
pnpm paperclipai connect
```

`connect` confirms the resolved API base, verifies `GET /api/health`, authenticates board access when needed, and saves a persona-aware profile:

- `persona=board` for board operator profiles
- `persona=agent` with `agentId` and `agentName` for agent profiles

Profiles store token env-var names, not plaintext tokens. The wizard prints shell exports for the newly created token.

Use `--data-dir` on any CLI command to isolate all default local state (config/context/db/logs/storage/secrets) away from `~/.paperclip`:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run --data-dir ./tmp/atv-dev
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue list --data-dir ./tmp/atv-dev
```

## Context Profiles

Store local defaults in `~/.paperclip/context.json`:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts context set --api-base http://localhost:3100 --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts context set --persona agent --agent-id <agent-id> --api-key-env-var-name PAPERCLIP_API_KEY
pnpm paperclipai context show
pnpm paperclipai context list
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts context use default
```

To avoid storing secrets in context, set `apiKeyEnvVarName` and keep the key in env:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts context set --api-key-env-var-name PAPERCLIP_API_KEY
export PAPERCLIP_API_KEY=...
```

## Company Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company list
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company get <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company current [--company-id <company-id>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company stats
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company create --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company update <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company branding:update <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company archive <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company export <company-id> --out ./company --include company,agents,projects,issues,skills
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company export:preview <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company export:api <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company import ./company --target new --new-company-name "Imported Company"
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company import:preview <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company import:apply <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Examples:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company delete PAP --yes --confirm PAP
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company delete 5cbe79ee-acb3-4597-896e-7662742593cd --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

Notes:

- With agent authentication, `company list` and `company current` are
  agent-safe company selectors. `company list` first tries the board-wide list;
  if that is forbidden, it uses `--company-id`, `PAPERCLIP_COMPANY_ID`, context,
  or `/api/agents/me` and then reads only that scoped company.
- `company create` requires board/instance-admin authentication because it is
  an instance-wide setup command.
- Deletion is server-gated by `PAPERCLIP_ENABLE_COMPANY_DELETION`.
- With agent authentication, company deletion is company-scoped. Use the current company ID/prefix (for example via `--company-id` or `PAPERCLIP_COMPANY_ID`), not another company.

## Issue Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue list --company-id <company-id> [--status todo,in_progress] [--assignee-agent-id <agent-id>] [--match text]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue get <issue-id-or-identifier>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue create --company-id <company-id> --title "..." [--description "..."] [--status todo] [--priority high]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue update <issue-id> [--status in_progress] [--comment "..."]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue delete <issue-id> --yes
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue comment <issue-id> --body "..." [--reopen]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue comments <issue-id> [--limit 50]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue comment:get <issue-id> <comment-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue comment:delete <issue-id> <comment-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue runs <issue-id-or-identifier>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue live-runs <issue-id-or-identifier>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue active-run <issue-id-or-identifier>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue heartbeat-context <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue checkout <issue-id> --agent-id <agent-id> [--expected-statuses todo,backlog,blocked]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue release <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue force-release <issue-id>
```

Issue subresources are exposed as ATV-Teams API wrappers. Commands that map to broad server schemas accept JSON payloads and validate them with shared schemas before sending.

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue child:create <issue-id> --payload-json '{"title":"Child task"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue approvals <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue approval:link <issue-id> <approval-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue approval:unlink <issue-id> <approval-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue read <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue unread <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue archive <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue unarchive <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue recovery-actions <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue recovery:resolve <issue-id> --outcome restored --source-issue-status todo
```

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue documents <issue-id> [--include-system]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue document:get <issue-id> <key>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue document:put <issue-id> <key> --body-file ./plan.md [--title Plan]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue document:lock <issue-id> <key>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue document:unlock <issue-id> <key>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue document:revisions <issue-id> <key>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue document:restore <issue-id> <key> <revision-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue document:delete <issue-id> <key>
```

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue work-products <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue work-product:create <issue-id> --payload-json '{"type":"pull_request","provider":"github","title":"PR"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue work-product:update <work-product-id> --payload-json '{"status":"archived"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue work-product:delete <work-product-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue interactions <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue interaction:create <issue-id> --payload-json '{"kind":"request_confirmation","payload":{"version":1,"prompt":"Continue?"}}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue interaction:accept <issue-id> <interaction-id> [--selected-client-keys key1,key2]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue interaction:reject <issue-id> <interaction-id> [--reason "..."]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue interaction:respond <issue-id> <interaction-id> --answers-json '[{"questionId":"q1","optionIds":["yes"]}]'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue interaction:cancel <issue-id> <interaction-id> [--reason "..."]
```

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue tree-state <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue tree-preview <issue-id> --payload-json '{"mode":"pause"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue tree-holds <issue-id> [--status active] [--include-members]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue tree-hold:create <issue-id> --payload-json '{"mode":"pause","reason":"review"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue tree-hold:get <issue-id> <hold-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue tree-hold:release <issue-id> <hold-id> [--payload-json '{"reason":"done"}']
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue attachments <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue attachment:upload <issue-id> --company-id <company-id> --file ./artifact.txt
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue attachment:download <attachment-id> [--out ./artifact.txt]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue attachment:delete <attachment-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue label:list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue label:create --company-id <company-id> --name bug --color '#ff0000'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue label:delete <label-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue feedback:votes <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue feedback:vote <issue-id> --payload-json '{"targetType":"issue_comment","targetId":"...","vote":"up"}'
```

## Project Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project get <project-id-or-shortname> [--company-id <company-id>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project create --company-id <company-id> --name "Launch Site" [--goal-ids <id1,id2>] [--lead-agent-id <id>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project update <project-id-or-shortname> [--status in_progress] [--company-id <company-id>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project delete <project-id-or-shortname> --yes [--company-id <company-id>]
```

Advanced project fields accept JSON:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project create --company-id <company-id> --name "Ops" --env-json '{"OPENAI_API_KEY":{"kind":"secret","secretName":"openai-api-key"}}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project update <project-id> --execution-workspace-policy-json '{"enabled":true,"defaultMode":"shared_workspace"}'
```

## Goal Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts goal list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts goal get <goal-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts goal create --company-id <company-id> --title "Grow revenue" [--level company] [--status active]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts goal update <goal-id> [--title "..."] [--status achieved]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts goal delete <goal-id> --yes
```

## Agent Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent get <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent create --company-id <company-id> --payload-json '{"name":"Builder","adapterType":"codex_local"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent hire --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent update <agent-id> --payload-json '{"title":"Senior Builder"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent delete <agent-id> --yes
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent me
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent inbox
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent inbox-mine --user-id <board-user-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent wake <agent-id-or-shortname> [--company-id <company-id>] [--reason "..."] [--payload '{"issueId":"..."}']
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent pause <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent resume <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent approve <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent terminate <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent heartbeat:invoke <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent claude-login <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

Agent configuration and runtime endpoints:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent permissions:update <agent-id> --payload-json '{"canCreateAgents":true,"canCreateSkills":true,"canAssignTasks":true}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent configuration <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent config-revisions <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent config-revision:get <agent-id> <revision-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent config-revision:rollback <agent-id> <revision-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent runtime-state <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent runtime-state:reset-session <agent-id> [--task-key <key>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent task-sessions <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent skills <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent skills:sync <agent-id> --desired-skills paperclip,github --mode add
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent instructions-path:update <agent-id> --payload-json '{"path":"/path/to/AGENTS.md"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent instructions-bundle <agent-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent instructions-bundle:update <agent-id> --payload-json '{"mode":"managed"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent instructions-file:get <agent-id> --path AGENTS.md
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent instructions-file:put <agent-id> --path AGENTS.md --content-file ./AGENTS.md
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent instructions-file:delete <agent-id> --path AGENTS.md
```

Agent config, instructions, skills, project env, environment, secret, and workspace edits affect the next run. Active runs finish with the config they started with. When a saved session, reused workspace, or sandbox lease no longer matches the effective next-run config, ATV-Teams may start fresh execution and records non-sensitive freshness categories in run result JSON and workspace operation logs.

`agent local-cli` is the quickest way to run local Claude/Codex manually as a ATV-Teams agent:

- creates a new long-lived agent API key
- installs missing ATV-Teams skills into `~/.codex/skills` and `~/.claude/skills`
- prints `export ...` lines for `PAPERCLIP_API_URL`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_AGENT_ID`, and `PAPERCLIP_API_KEY`

Example for shortname-based local setup:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent local-cli codexcoder --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent local-cli claudecoder --company-id <company-id>
```

## Token Commands

Agent API keys are scoped to one company and one agent. Plaintext tokens are printed once at creation.

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts token agent create --company-id <company-id> --agent <agent-id-or-name> --name external-worker
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts token agent list --company-id <company-id> --agent <agent-id-or-name>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts token agent revoke --company-id <company-id> --agent <agent-id-or-name> <key-id>
```

Named board API keys use the board authorization model, support revocation and expiration metadata, and are audited server-side.

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts token board create --company-id <company-id> --name external-admin
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts token board create --name short-lived --ttl-days 7
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts token board list
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts token board revoke <key-id>
```

## Run Commands

`paperclipai run` without a subcommand still bootstraps and starts a local ATV-Teams instance. The subcommands below inspect and control API heartbeat runs.

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run list --company-id <company-id> [--agent-id <agent-id>] [--limit 50]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run live --company-id <company-id> [--limit 50] [--min-count 0]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run get <run-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run events <run-id> [--after-seq 0] [--limit 200]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run log <run-id> [--offset 0] [--limit-bytes 16384] [--text]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run cancel <run-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run issues <run-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run workspace-operations <run-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run workspace-log <operation-id> [--offset 0] [--limit-bytes 16384] [--text]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts run watchdog-decision <run-id> --decision continue [--reason "..."]
```

## Routine Commands

`paperclipai routines disable-all` remains the local maintenance command. The singular `routine` group maps to the REST API.

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine list --company-id <company-id> [--project-id <project-id>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine create --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine get <routine-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine update <routine-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine revisions <routine-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine revision:restore <routine-id> <revision-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine runs <routine-id> [--limit 50]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine run <routine-id> [--payload-json '{...}']
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine trigger:create <routine-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine trigger:update <trigger-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine trigger:delete <trigger-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine trigger:rotate-secret <trigger-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts routine trigger:fire <public-id> [--payload-json '{...}']
```

## Prompt Handoff

Prompt handoff creates ATV-Teams work. It does not create a chat session.

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent-prompt <agent-name-or-id> <agent-api-key> "Prompt here"
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent prompt --agent <agent-name-or-id> --api-key-env PAPERCLIP_API_KEY "Prompt here"
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent prompt --profile my-agent "Prompt here"
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts board prompt --company-id <company-id> --agent <agent-name-or-id> "Prompt here"
```

By default the command creates a `todo` issue assigned to the target agent and wakes the agent. Use `--issue <issue-id>` to add a comment to existing work, and `--no-wake` to skip the wakeup.

## Skills Commands

`paperclipai skills` covers three distinct operations:

1. **Company install** — adds or updates a row in `company_skills` for the
   whole company. This is what `skills install`, `skills import`, `skills create`,
   and `skills scan-projects` do.
2. **Agent attach** — merges an agent's *desired* company skill set with an
   explicit `add`, `remove`, or `replace` mode (`skills agent sync`/`clear`).
   This is a desired-state operation on the agent's adapter config; it does not
   change the company library.
3. **Adapter runtime sync** — the adapter reconciles the desired skill set
   with files on disk and reports an `AgentSkillSnapshot` (`skills agent list`).
   `skills agent sync` triggers this automatically after updating desired state.

Required ATV-Teams runtime skills (heartbeat, etc.) remain server-enforced and
are added on top of whatever the desired set names.

Company skill mutations (`skills install`, `skills import`, `skills create`, and
`skills scan-projects`) are open to same-company actors by default. Missing
`skills:create` grants and `canCreateSkills` settings do not deny these commands;
only an explicit company skill policy restriction does. Core safety and company
boundary checks still apply, and `agents:create` remains required when a command
also creates agents.

### Catalog (app-shipped skills)

The ATV-Teams app ships a curated catalog under `@paperclipai/skills-catalog`.
Browse and inspect commands never mutate company state; `install` adds a catalog
skill to the company library.

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills browse [--kind bundled|optional] [--category <slug>] [--query <text>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills search "<text>" [--kind bundled|optional] [--category <slug>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills inspect <catalog-id-or-key-or-slug>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills install <catalog-id-or-key-or-slug> [--as <slug>] [--force] --company-id <company-id>
```

Catalog semantics:

- **Bundled** skills live in `packages/skills-catalog/catalog/bundled/<category>/<slug>`
  and are recommended defaults for most companies. They use canonical key
  `paperclipai/bundled/<category>/<slug>`.
- **Optional** skills live in `packages/skills-catalog/catalog/optional/<category>/<slug>`
  and are role-specific or domain-specific (browser, AWS ops, etc.). Same key
  shape with `optional` in place of `bundled`.
- `skills install` materializes the catalog files into a company-managed skill
  directory and records provenance (`catalogId`, `catalogKey`, `packageVersion`,
  `originHash`, …) so future updates and audit decisions stay consistent.
- `--as <slug>` overrides the company skill slug. `--force` may replace a
  same-key catalog-managed skill but never bypasses hard validation or hard-stop
  audit findings.

Examples:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills browse --kind bundled --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills search "pull request" --kind bundled
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills inspect github-pr-workflow
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills install github-pr-workflow --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills install paperclipai:optional:browser:agent-browser --company-id <company-id>
```

External GitHub, skills.sh, local-path, and URL sources still go through
`skills import`; catalog commands are for the app-shipped catalog only.

### Company library

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills show <skill-id-or-key-or-slug> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills file <skill-id-or-key-or-slug> [--path SKILL.md] --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills import <source> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills create --name "Review PRs" [--slug review-prs] [--description "..."] [--body-file SKILL.md] --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills scan-projects [--project-id <id>...] [--workspace-id <id>...] --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills check [skill-id-or-key-or-slug] --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills update <skill-id-or-key-or-slug> [--force] --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills update --all [--force] --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills audit [skill-id-or-key-or-slug] --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills reset <skill-id-or-key-or-slug> [--yes] [--force] --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills remove <skill-id-or-key-or-slug> --yes --company-id <company-id>
```

`skills import <source>` accepts a skills.sh URL, the equivalent
`<owner>/<repo>/<skill>` shorthand, a GitHub URL, a local path, or an
`npx skills add …` command. See `references/company-skills.md` in the agent
skill bundle for the source-type table.

`skills check`, `skills update`, `skills audit`, and `skills reset` are the
maintenance loop for catalog-installed skills:

- `check` reports whether each skill's installed bytes match its pinned origin
  (`hasUpdate`, `installedHash`, `originHash`, `updateHoldReason`,
  `auditVerdict`).
- `update` installs the pinned update through the existing install-update API.
  `--all` checks every company skill and updates only those with
  `hasUpdate=true`. `--force` discards local-modification or soft-audit holds;
  hard-stop audit findings still block the update.
- `audit` re-scans installed bytes and reports findings without executing
  anything.
- `reset` reinstalls a catalog-managed skill from its pinned origin, discarding
  local edits. Prompts in a TTY; requires `--yes` for non-interactive use.

### Agent attach

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills agent list <agent-id-or-shortname> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills agent sync <agent-id-or-shortname> --skill <skill-id-or-key-or-slug> [--skill <skill-id-or-key-or-slug>...] --mode <add|remove|replace> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills agent clear <agent-id-or-shortname> --yes --company-id <company-id>
```

`skills agent sync` requires a merge mode and returns the resulting adapter
`AgentSkillSnapshot`. `add` preserves all unnamed assignments, `remove` deletes
only named assignments, and `replace` destructively overwrites the complete
non-required desired skill set.
`skills agent clear` sends an empty desired list. Required ATV-Teams skills are
still enforced by the server in both cases.

### Notes

- Skill references accept company skill `id`, canonical `key`, or unique
  `slug`; catalog references accept catalog `id`, `key`, or unique `slug`.
- `skills file` prints raw file content in human mode so it can be piped.
- `skills create --body-file -` reads the skill markdown body from stdin.
- `skills remove`, `skills reset`, and `skills agent clear` prompt in a TTY and
  require `--yes` in non-interactive use.
- `--json` prints the raw API result for each command.

## Teams Commands

`paperclipai teams` works with the app-shipped team catalog in
`@paperclipai/teams-catalog`. Browse, search, inspect, and file reads do not
change company state. `preview` runs the company import planner, and `install`
imports the catalog team into an existing company.

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts teams browse [--kind bundled|optional] [--category <slug>] [--query <text>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts teams search "<text>" [--kind bundled|optional] [--category <slug>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts teams inspect <catalog-id-or-key-or-slug> [--file TEAM.md]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts teams preview <catalog-id-or-key-or-slug> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts teams install <catalog-id-or-key-or-slug> --company-id <company-id>
```

Preview/install options:

- Under agent authentication, use `paperclipai company list --json`,
  `paperclipai company current --json`, or `PAPERCLIP_COMPANY_ID` to select the
  target company. `company list` falls back to the scoped current company when
  board-wide listing is forbidden. `teams install` creates agents and therefore
  requires board authentication, an `agents:create` grant, or an agent with
  explicit `canCreateAgents` permission.
- `--request-approval-on-forbidden` turns a 403 install denial into a linked
  board approval request instead of a raw failed command; use
  `--approval-issue-id <id>` to attach it to a specific issue. During ATV-Teams
  task runs with `PAPERCLIP_TASK_ID` set, this fallback is automatic so
  agent-run walkthroughs leave a pending approval path instead of a raw 403.
- `--target-manager-agent-id <id>` or `--target-manager-slug <slug>` reparents
  catalog root agents under an existing manager.
- `--agent <slug>` and `--selected-file <path>` narrow the import.
- `--collision-strategy rename|skip|replace` controls name/key collisions.
- `--allow-external-sources`, `--allow-unpinned-optional-sources`, and
  `--allow-local-path-sources` explicitly opt into higher-trust source policy.
  Local-path sources are development-only and stay blocked unless that flag is
  passed.

## Secrets Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets declarations --company-id <company-id> [--include agents,projects] [--kind secret]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets create --company-id <company-id> --name anthropic-api-key --value-env ANTHROPIC_API_KEY
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets link --company-id <company-id> --name prod-stripe-key --provider aws_secrets_manager --external-ref <provider-ref>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets doctor --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets provider-configs --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets provider-config:create --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets provider-config:discovery-preview --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets provider-config:get <config-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets provider-config:update <config-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets provider-config:default <config-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets provider-config:health <config-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets provider-config:delete <config-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets remote-import:preview --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets remote-import --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts secrets migrate-inline-env --company-id <company-id> [--apply]
```

Secret listing and declarations never print secret values. `create` accepts
`--value-env` so shell history does not capture the value. `link` records
provider-owned references without copying the secret value into ATV-Teams.
For AWS-backed secrets, `secrets doctor` reports missing non-secret provider
env and the expected AWS SDK runtime credential source; do not store AWS
bootstrap credentials in ATV-Teams secrets.

Per-company provider vaults (multiple vault instances per provider, default
vault selection, coming-soon GCP/Vault) can be configured from the board UI under
`Company Settings → Secrets → Provider vaults` or through the provider-config CLI
commands above. See the
[secrets deploy guide](../docs/deploy/secrets.md#provider-vaults) and
[API reference](../docs/api/secrets.md#provider-vaults) for the contract.

## Approval Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval list --company-id <company-id> [--status pending]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval get <approval-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval approve <approval-id> [--decision-note "..."]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval reject <approval-id> [--decision-note "..."]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval request-revision <approval-id> [--decision-note "..."]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval resubmit <approval-id> [--payload '{"...":"..."}']
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts activity list --company-id <company-id> [--agent-id <agent-id>] [--entity-type issue] [--entity-id <id>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts activity create --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts activity issue <issue-id>
```

## Dashboard Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts dashboard get --company-id <company-id>
```

## Org And Agent Config Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts whoami
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts openapi
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts org get --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts org svg --company-id <company-id> [--out org.svg]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts org png --company-id <company-id> [--out org.png]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent-config list --company-id <company-id>
```

## Access, Profile, And Instance Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts profile session
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts profile get
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts profile update --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts profile company-user <user-slug> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts invite list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts invite create --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts invite revoke <invite-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts invite show <token>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts invite accept <token> [--payload-json '{...}']
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts invite onboarding:text <token>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts join list --company-id <company-id> [--status pending_approval]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts join approve <request-id> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts join reject <request-id> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts join claim-key <request-id> --claim-secret <secret>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts member list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts member update <member-id> --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts member role-and-grants <member-id> --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts member permissions <member-id> --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts member archive <member-id> --company-id <company-id> [--payload-json '{...}']
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts admin user list [--query <text>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts admin user promote <user-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts admin user demote <user-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts admin user company-access <user-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts admin user company-access:update <user-id> --payload-json '{...}'
```

CLI auth challenge endpoints are also exposed for tooling that needs the raw challenge lifecycle:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts auth challenge create --payload-json '{...}'
PAPERCLIP_CHALLENGE_SECRET=<challenge-secret> node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts auth challenge get <challenge-id> --token-env PAPERCLIP_CHALLENGE_SECRET
PAPERCLIP_CHALLENGE_SECRET=<challenge-secret> node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts auth challenge approve <challenge-id> --token-env PAPERCLIP_CHALLENGE_SECRET
PAPERCLIP_CHALLENGE_SECRET=<challenge-secret> node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts auth challenge cancel <challenge-id> --token-env PAPERCLIP_CHALLENGE_SECRET
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts auth revoke-current
```

`--token <challenge-secret>` is still supported for compatibility, but `--token-env` avoids putting challenge secrets in shell history or process arguments.

## Instance Settings Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts instance scheduler-heartbeats
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts instance settings:general
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts instance settings:general:update --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts instance settings:experimental
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts instance settings:experimental:update --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts instance database-backup
```

Experimental features are opt-in and are provided without compatibility guarantees. They may break, change, or be removed at any time. Use them at your own risk.

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts sidebar preferences
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts sidebar preferences:update --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts sidebar project-preferences --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts sidebar project-preferences:update --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts sidebar badges --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts inbox dismissals --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts inbox dismiss --company-id <company-id> --payload-json '{"itemKey":"run:<run-id>"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts board-claim show <token>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts board-claim claim <token> [--payload-json '{...}']
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts openclaw invite-prompt --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts available-skill list
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts available-skill index
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts available-skill get <skill-name>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts llm agent-configuration
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts llm agent-configuration:adapter <adapter-type>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts llm agent-icons
```

Hermes gateway uses the generic invite/join commands above rather than
`openclaw invite-prompt`. Create an agent invite, read
`invite onboarding:text`, submit a join request with
`adapterType: "hermes_gateway"` and `agentDefaultsPayload.apiBaseUrl` /
`agentDefaultsPayload.apiKey`, then approve and claim the key with the `join`
commands. See [HERMES_GATEWAY_ONBOARDING.md](./HERMES_GATEWAY_ONBOARDING.md).

## Adapter, Asset, And Skill Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter list
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter install --payload-json '{"packageName":"@scope/adapter","version":"1.2.3"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter get <adapter-type>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter update <adapter-type> --payload-json '{"disabled":true}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter override <adapter-type> --payload-json '{"paused":true}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter reload <adapter-type>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter reinstall <adapter-type>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter delete <adapter-type>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter config-schema <adapter-type>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter ui-parser <adapter-type>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter models <adapter-type> --company-id <company-id> [--refresh] [--environment-id <id>]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter model-profiles <adapter-type> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter detect-model <adapter-type> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts adapter test-environment <adapter-type> --company-id <company-id> --payload-json '{...}'
```

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts asset image:upload --company-id <company-id> --file ./image.png [--namespace docs] [--alt "..."]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts asset logo:upload --company-id <company-id> --file ./logo.svg
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts asset content <asset-id> --out ./asset.bin
```

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skill list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skill get <skill-id> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skill file <skill-id> --company-id <company-id> [--path SKILL.md]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skill create --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skill file:update <skill-id> --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skill import --company-id <company-id> --payload-json '{"source":"github:owner/repo/path"}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skill scan-projects --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skill update-status <skill-id> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skill install-update <skill-id> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skill delete <skill-id> --company-id <company-id>
```

## Cost, Finance, And Budget Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts cost summary --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts cost by-agent --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts cost by-agent-model --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts cost by-provider --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts cost by-biller --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts cost by-project --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts cost window-spend --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts cost quota-windows --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts cost issue <issue-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts cost event:create --company-id <company-id> --payload-json '{...}'
```

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts finance event:create --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts finance events --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts finance summary --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts finance by-biller --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts finance by-kind --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts budget overview --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts budget policy:upsert --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts budget company:update --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts budget agent:update <agent-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts budget incident:resolve <incident-id> --company-id <company-id> [--payload-json '{...}']
```

## Workspace And Environment Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts workspace list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts workspace get <execution-workspace-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts workspace close-readiness <execution-workspace-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts workspace operations <execution-workspace-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts workspace update <execution-workspace-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts workspace runtime-service <execution-workspace-id> start --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts workspace runtime-command <execution-workspace-id> run --payload-json '{...}'
```

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts environment list --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts environment capabilities --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts environment create --company-id <company-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts environment get <environment-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts environment leases <environment-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts environment lease <lease-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts environment update <environment-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts environment delete <environment-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts environment probe <environment-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts environment probe-config --company-id <company-id> --payload-json '{...}'
```

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project-workspace list <project-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project-workspace create <project-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project-workspace update <project-id> <workspace-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project-workspace delete <project-id> <workspace-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project-workspace runtime-service <project-id> <workspace-id> restart --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts project-workspace runtime-command <project-id> <workspace-id> run --payload-json '{...}'
```

## Plugin Commands

Existing plugin lifecycle commands remain available: `plugin init`, `list`, `install`, `uninstall`, `enable`, `disable`, `inspect`, and `examples`.

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin ui-contributions
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin tools
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin tool:execute --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin health <plugin-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin logs <plugin-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin upgrade <plugin-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin config <plugin-id> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin config:set <plugin-id> --company-id <company-id> --payload-json '{"configJson":{...}}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin config:test <plugin-id> --company-id <company-id> --payload-json '{"configJson":{...}}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin jobs <plugin-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin job:runs <plugin-id> <job-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin job:trigger <plugin-id> <job-id> [--payload-json '{...}']
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin webhook <plugin-id> <endpoint-key> [--payload-json '{...}']
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin dashboard <plugin-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin bridge:data <plugin-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin bridge:action <plugin-id> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin bridge:stream <plugin-id> <channel> [--duration-ms 10000]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin data <plugin-id> <key> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin action <plugin-id> <key> --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin local-folders <plugin-id> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin local-folder:status <plugin-id> <folder-key> --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin local-folder:validate <plugin-id> <folder-key> --company-id <company-id> [--payload-json '{...}']
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts plugin local-folder:set <plugin-id> <folder-key> --company-id <company-id> --payload-json '{...}'
```

Feedback traces can be fetched directly by ID when automating export workflows:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts feedback trace <trace-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts feedback bundle <trace-id>
```

## Heartbeat Command

`heartbeat run` now also supports context/api-key options and uses the shared client stack:

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100] [--api-key <token>]
```

## Local Storage Defaults

Local ATV-Teams data lives under the selected instance root. `PAPERCLIP_HOME` chooses the home directory and `PAPERCLIP_INSTANCE_ID` chooses the instance.

```text
~/.paperclip/                                     # PAPERCLIP_HOME
└── instances/
    └── default/                                  # instance root (PAPERCLIP_INSTANCE_ID)
        ├── config.json                           # runtime config
        ├── .env                                  # instance env file
        ├── db/                                   # embedded PostgreSQL data
        ├── data/
        │   ├── storage/                          # local_disk uploads
        │   └── backups/                          # automatic DB backups
        ├── logs/
        ├── secrets/
        │   └── master.key                        # local_encrypted master key
        ├── workspaces/                           # default agent workspaces
        ├── projects/                             # project execution workspaces
        ├── companies/                            # per-company adapter homes (e.g. codex-home)
        └── codex-home/                           # per-instance codex home (when not company-scoped)
```

Default paths for the canonical install:

- config: `~/.paperclip/instances/default/config.json`
- embedded db: `~/.paperclip/instances/default/db`
- logs: `~/.paperclip/instances/default/logs`
- storage: `~/.paperclip/instances/default/data/storage`
- secrets key: `~/.paperclip/instances/default/secrets/master.key`

Override base home or instance with env vars:

```sh
PAPERCLIP_HOME=/custom/home PAPERCLIP_INSTANCE_ID=dev pnpm paperclipai run
```

## Storage Configuration

Configure storage provider and settings:

```sh
pnpm paperclipai configure --section storage
```

Supported providers:

- `local_disk` (default; local single-user installs)
- `s3` (S3-compatible object storage)

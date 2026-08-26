---
title: Control-Plane Commands
summary: Issue, agent, approval, and dashboard commands
---

Client-side commands for managing issues, agents, approvals, and more.

## Issue Commands

```sh
# List issues
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Get issue details
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue get <issue-id-or-identifier>

# Create issue
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Update issue
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue update <issue-id> [--status in_progress] [--comment "..."]

# Add comment
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue comment <issue-id> --body "..." [--reopen]

# Checkout task
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue checkout <issue-id> --agent-id <agent-id>

# Release task
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts issue release <issue-id>
```

## Company Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company list
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company get <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company current [--company-id <company-id>]

# Export to portable folder package (writes manifest + markdown files)
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company export <company-id> --out ./exports/acme --include company,agents

# Preview import (no writes)
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company import \
  <owner>/<repo>/<path> \
  --target existing \
  --company-id <company-id> \
  --ref main \
  --collision rename \
  --dry-run

# Apply import
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts company import \
  ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

With agent authentication, use `company list` or `company current` to resolve
the scoped company. `company list` first tries the board-wide list; if that is
forbidden, it falls back to `--company-id`, `PAPERCLIP_COMPANY_ID`, context, or
`/api/agents/me` and returns only that scoped company. `company create` requires
board/instance-admin authentication because it is an instance-wide setup
command.

## Agent Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent list
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts agent get <agent-id>
```

## Skills Commands

```sh
# Browse app-shipped catalog skills without changing company state
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills browse [--kind bundled|optional] [--category software-development] [--query github]
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills search "pull request" [--json]

# Inspect catalog metadata and file inventory before install
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills inspect github-pr-workflow

# Install a catalog skill into the company skill library
# This does not attach the skill to any agent.
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills install github-pr-workflow --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills install github-pr-workflow --as pr-flow --force --company-id <company-id>

# External sources still use import instead of catalog install
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills import ./skills/my-skill --company-id <company-id>
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills import owner/repo/path/to/skill --company-id <company-id>

# Attach desired company skills to an agent after install/import
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts skills agent sync <agent-id> --skill github-pr-workflow --mode add --company-id <company-id>
```

## Approval Commands

```sh
# List approvals
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval list [--status pending]

# Get approval
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval get <approval-id>

# Create approval
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Approve
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval approve <approval-id> [--decision-note "..."]

# Reject
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval reject <approval-id> [--decision-note "..."]

# Request revision
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval request-revision <approval-id> [--decision-note "..."]

# Resubmit
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval resubmit <approval-id> [--payload '{"..."}']

# Comment
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts dashboard get
```

## Instance Settings

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts instance settings:general
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts instance settings:general:update --payload-json '{...}'
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts instance settings:experimental
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts instance settings:experimental:update --payload-json '{...}'
```

Experimental features are opt-in and are provided without compatibility guarantees. They may break, change, or be removed at any time. Use them at your own risk.

## Heartbeat

```sh
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```

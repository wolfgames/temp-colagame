## AIDD Agent Directives (Auto-appended)

The following directives were added by the AIDD CLI to ensure proper agent behavior.

### Directory Structure

Agents should examine the `ai/*` directory listings to understand the available commands, rules, and workflows.

### Index Files

Each folder in the `ai/` directory contains an `index.md` file that describes the purpose and contents of that folder. Agents can read these index files to learn the function of files in each folder.

**Important:** The `ai/**/index.md` files are auto-generated from frontmatter. Do not create or edit these files manually—they will be overwritten by the pre-commit hook.

### Progressive Discovery

Agents should only consume the root index until they need subfolder contents. For example:
- If the project is Python, there is no need to read JavaScript-specific folders
- Only drill into subfolders when the task requires that specific domain knowledge

### Vision Document Requirement

**Before creating or running any task, agents must first read the vision document (`vision.md`) in the project root.**

### Conflict Resolution

If any conflicts are detected between a requested task and the vision document, agents must ask the user to clarify how to resolve the conflict before proceeding.

### Custom Skills and Configuration

Project-specific customization lives in `aidd-custom/`. Before starting work,
read `aidd-custom/index.md` to discover available project-specific skills,
and read `aidd-custom/config.yml` to load configuration into context.

import aidd-custom/AGENTS.md // settings from this import should override the root AGENTS.md settings

---

# Wolf Games Critical References
## GameKit API

This project uses `@wolfgames/game-kit` for analytics, auth, assets, and error tracking. API reference lives in the game-kit repo — see `repos/game-kit/`.

## Documentation

All docs live in `docs/`. Read [`docs/INDEX.md`](docs/INDEX.md) for the full routing table.

## Best Practices

**Read [`docs/standards/best-practices.md`](docs/standards/best-practices.md) before writing any game code.**

Covers: GPU-only rendering (no DOM in gameplay), project structure (what to touch), asset conventions, module usage, and the game contract.

## Guardrails

**Read [`docs/standards/guardrails.md`](docs/standards/guardrails.md) before writing any game code.**

The companion to best practices — 15 rules covering what NOT to do. Silent failures (wrong bundle prefix, `eventMode = 'none'` on parents), memory leaks (orphaned tweens, per-frame allocations), and framework foot-guns (React imports in SolidJS, DOM in GPU code).

---

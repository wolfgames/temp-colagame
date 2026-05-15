# Claude Settings

## Permission Modes

| Mode | File | Can Edit | Blocks |
|------|------|----------|--------|
| **Design** | `settings.design.json` | `game/`, `docs/`, `public/` | `core/`, `modules/`, `ai/` |
| **Dev** | `settings.dev.json` | `game/`, `modules/`, `docs/`, `public/` | `core/`, `ai/` |
| **Admin** | `settings.admin.json` | Everything | Nothing |

## Quick Switch

```bash
# Design mode (game code only)
cp .claude/settings.design.json .claude/settings.local.json

# Dev mode (game + modules)
cp .claude/settings.dev.json .claude/settings.local.json

# Admin mode (unrestricted)
cp .claude/settings.admin.json .claude/settings.local.json
```

**Restart Claude Code after switching.**

## Current Settings

`settings.local.json` is the active file.

### Design Mode
- Edit: `src/game/**`, `docs/**`, `public/**`
- Read: everything
- Bash: git, bun, npm, tsc
- Blocks: `src/core/**`, `src/modules/**`, `ai/**`

### Dev Mode
- Edit: `src/game/**`, `src/modules/**`, `docs/**`, `public/**`
- Read: everything
- Bash: git, bun, npm, tsc
- Blocks: `src/core/**`, `ai/**`

### Admin Mode
- Everything allowed

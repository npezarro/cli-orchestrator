# cli-orchestrator

## Overview
Multi-model AI CLI orchestrator. Dispatches prompts to Claude, Gemini, or Codex CLIs via `execFileSync`/`execFile`. Zero dependencies.

## Repo Structure
```
src/
  providers.js     — Provider definitions (command, args, availability, output parsing)
  orchestrator.js  — Core dispatch logic (sync, async, fan-out)
  cli.js           — CLI entry point (orch command)
  index.js         — Public API exports
test/
  orchestrator.test.js — Node.js test runner tests
```

## Commands
```bash
npm test                    # Run tests (node --test)
node src/cli.js --list      # Check available providers
```

## Key Patterns
- **execFileSync/execFile only**: Never use execSync with string interpolation. All external commands use argument arrays to prevent shell injection.
- **Provider contract**: Each provider in `providers.js` must have: `name`, `command`, `buildArgs(prompt, opts)`, `isAvailable()`, `parseOutput(raw)`.
- **No dependencies**: Uses only Node.js built-ins (child_process, util).
- **No secrets in code**: Each CLI handles its own authentication. No API keys, tokens, or credentials anywhere in this repo.

## Public Repo
This is a **public repository**. Never commit secrets, credentials, private paths, personal information, or internal infrastructure details.

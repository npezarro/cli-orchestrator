# cli-orchestrator

Orchestrate multiple AI CLIs from a single controller. Dispatch prompts to Claude, Gemini, or Codex (or all at once) and get structured results back.

Built for the workflow where one AI CLI (e.g., Claude Code) acts as the primary agent and delegates tasks to others as subordinate tools.

## Why

Each major AI provider ships a CLI tool that can run headlessly:

| Provider | CLI | Auth | Free Tier |
|----------|-----|------|-----------|
| Anthropic | `claude` | Claude Max / API key | With subscription |
| Google | `gemini` | Google account (GCA) | 1,000 req/day |
| OpenAI | `codex` | ChatGPT Pro | With subscription |

Instead of choosing one, use all of them. Route code reviews to Gemini's 1M context window, image generation to Codex, and complex reasoning to Claude.

## Install

```bash
npm install cli-orchestrator
# or use directly
npx cli-orchestrator --list
```

### Prerequisites

Install at least one AI CLI:

```bash
# Claude (requires Claude Max subscription or API key)
npm install -g @anthropic-ai/claude-code

# Gemini (free with any Google account)
npm install -g @google/gemini-cli

# Codex (requires ChatGPT Pro subscription)
npm install -g @openai/codex
```

For Gemini, set these env vars (or add to `~/.bashrc`):
```bash
export GOOGLE_GENAI_USE_GCA=true
export GEMINI_CLI_TRUST_WORKSPACE=true
```

## CLI Usage

```bash
# Single provider
orch gemini "Explain closures in JavaScript"
orch claude "Review this function for bugs" --cwd ./src

# Fan-out to all available providers
orch --all "What are the tradeoffs of SQLite vs PostgreSQL?"

# List available providers
orch --list

# Options
orch gemini "Hello" --timeout 60000 --model gemini-2.5-pro
```

## Library Usage

```js
import { dispatch, dispatchAsync, dispatchAll, listAvailable } from 'cli-orchestrator';

// Synchronous (blocks until response)
const result = dispatch('gemini', 'Explain async/await in 3 sentences');
console.log(result.output);       // The response text
console.log(result.durationMs);   // How long it took

// Async
const result = await dispatchAsync('claude', 'Review this code', {
  cwd: '/path/to/repo',
  timeout: 60000,
});

// Fan-out: same prompt to multiple providers in parallel
const results = await dispatchAll(['claude', 'gemini'], 'What is 2+2?');
for (const r of results) {
  console.log(`${r.provider}: ${r.output}`);
}

// Check what's installed
const available = listAvailable();  // ['claude', 'gemini']
```

## Adding a Provider

Providers are defined in `src/providers.js`. Each provider needs:

```js
{
  name: 'Human-readable name',
  command: 'cli-binary-name',
  buildArgs: (prompt, opts) => ['--flag', prompt],  // Return arg array
  isAvailable: () => true/false,                     // Check if installed
  parseOutput: (rawStdout) => 'cleaned text',        // Strip noise
}
```

To add a new provider, add an entry to the `providers` object and it's immediately available via `dispatch()` and the CLI.

## Architecture

```
Your primary AI CLI (e.g., Claude Code)
  |
  |-- dispatch('gemini', 'Review this codebase')
  |     |
  |     +-- execFileSync('gemini', ['-p', prompt])
  |     +-- parse output, return { provider, output, durationMs }
  |
  |-- dispatch('codex', 'Generate an image of a cat')
  |     |
  |     +-- execFileSync('codex', ['exec', '--full-auto', prompt])
  |     +-- parse output, return { provider, output, durationMs }
  |
  +-- dispatchAll(['claude','gemini'], 'Compare approaches')
        |
        +-- Promise.all([dispatchAsync('claude',...), dispatchAsync('gemini',...)])
```

Key design choices:
- **execFileSync/execFile** (not execSync) to prevent shell injection
- **Argument arrays** instead of string interpolation
- **No API keys in code**: each CLI handles its own auth
- **Zero dependencies**: just Node.js built-ins

## License

MIT

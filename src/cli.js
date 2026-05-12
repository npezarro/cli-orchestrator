#!/usr/bin/env node

/**
 * CLI entry point for cli-orchestrator.
 *
 * Usage:
 *   orch gemini "Explain closures in JS"
 *   orch claude "Review this code" --cwd ./my-project --timeout 60000
 *   orch --all "What is the capital of France?"
 *   orch --list
 */

import { dispatch, dispatchAll, listAvailable } from './orchestrator.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
cli-orchestrator - Dispatch prompts to AI CLIs

Usage:
  orch <provider> "<prompt>"        Send prompt to a specific provider
  orch --all "<prompt>"             Fan-out to all available providers
  orch --list                       List available providers

Providers: claude, gemini, codex

Options:
  --timeout <ms>    Timeout in milliseconds (default: 120000)
  --cwd <dir>       Working directory for the provider
  --model <name>    Model override

Examples:
  orch gemini "List 3 pros of SQLite"
  orch claude "Review this function" --cwd ./src
  orch --all "What is 2+2?"
  `.trim());
  process.exit(0);
}

if (args.includes('--list')) {
  const available = listAvailable();
  if (available.length === 0) {
    console.log('No providers available. Install claude, gemini, or codex CLI.');
  } else {
    console.log('Available providers:');
    available.forEach(p => console.log(`  - ${p}`));
  }
  process.exit(0);
}

// Parse options
function getOpt(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

const timeout = getOpt('--timeout') ? parseInt(getOpt('--timeout'), 10) : undefined;
const cwd = getOpt('--cwd');
const model = getOpt('--model');
const opts = { timeout, cwd, model };

// Fan-out mode
if (args.includes('--all')) {
  const prompt = args.find(a => !a.startsWith('--') && a !== getOpt('--timeout') && a !== getOpt('--cwd') && a !== getOpt('--model'));
  if (!prompt) {
    console.error('Error: No prompt provided.');
    process.exit(1);
  }

  const available = listAvailable();
  if (available.length === 0) {
    console.error('No providers available.');
    process.exit(1);
  }

  console.log(`Dispatching to: ${available.join(', ')}...\n`);
  const results = await dispatchAll(available, prompt, opts);

  for (const r of results) {
    console.log(`--- ${r.provider} (${r.durationMs}ms) ---`);
    if (r.error) {
      console.log(`Error: ${r.error}`);
    } else {
      console.log(r.output);
    }
    console.log();
  }
  process.exit(0);
}

// Single provider mode
const providerName = args[0];
const prompt = args[1];

if (!prompt) {
  console.error('Error: No prompt provided. Usage: orch <provider> "<prompt>"');
  process.exit(1);
}

const result = dispatch(providerName, prompt, opts);
if (result.error) {
  console.error(`Error from ${result.provider}: ${result.error}`);
  process.exit(1);
}

console.log(result.output);

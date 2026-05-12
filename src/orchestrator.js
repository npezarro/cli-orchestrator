/**
 * Core orchestrator: dispatch prompts to AI CLI providers.
 *
 * Usage:
 *   import { dispatch, dispatchAll } from './orchestrator.js';
 *
 *   // Single provider
 *   const result = dispatch('gemini', 'Explain async/await', { timeout: 30000 });
 *
 *   // Fan-out to multiple providers (parallel)
 *   const results = await dispatchAll(['claude', 'gemini'], 'Review this code');
 */

import { execFileSync } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import providers from './providers.js';

const execFileAsync = promisify(execFile);

/**
 * Dispatch a prompt to a single provider (synchronous).
 *
 * @param {string} providerName - Key from providers map
 * @param {string} prompt - The prompt to send
 * @param {Object} [opts] - Options
 * @param {number} [opts.timeout=120000] - Timeout in ms
 * @param {string} [opts.cwd] - Working directory
 * @param {string} [opts.model] - Model override
 * @param {Record<string, string>} [opts.env] - Extra env vars
 * @returns {{ provider: string, output: string, durationMs: number }}
 */
export function dispatch(providerName, prompt, opts = {}) {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}. Available: ${Object.keys(providers).join(', ')}`);
  }

  const args = provider.buildArgs(prompt, opts);
  const timeout = opts.timeout || 120_000;
  const env = { ...process.env, ...opts.env };

  const start = Date.now();
  try {
    const raw = execFileSync(provider.command, args, {
      encoding: 'utf-8',
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      cwd: opts.cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      provider: providerName,
      output: provider.parseOutput(raw),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      provider: providerName,
      output: '',
      error: err.message?.slice(0, 500),
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Dispatch a prompt to a single provider (async).
 *
 * @param {string} providerName - Key from providers map
 * @param {string} prompt - The prompt to send
 * @param {Object} [opts] - Same as dispatch()
 * @returns {Promise<{ provider: string, output: string, durationMs: number }>}
 */
export async function dispatchAsync(providerName, prompt, opts = {}) {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}. Available: ${Object.keys(providers).join(', ')}`);
  }

  const args = provider.buildArgs(prompt, opts);
  const timeout = opts.timeout || 120_000;
  const env = { ...process.env, ...opts.env };

  const start = Date.now();
  try {
    const { stdout } = await execFileAsync(provider.command, args, {
      encoding: 'utf-8',
      timeout,
      maxBuffer: 10 * 1024 * 1024,
      cwd: opts.cwd,
      env,
    });

    return {
      provider: providerName,
      output: provider.parseOutput(stdout),
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      provider: providerName,
      output: '',
      error: err.message?.slice(0, 500),
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Fan-out a prompt to multiple providers in parallel.
 *
 * @param {string[]} providerNames - Array of provider keys
 * @param {string} prompt - The prompt to send
 * @param {Object} [opts] - Options passed to each provider
 * @returns {Promise<Array<{ provider: string, output: string, durationMs: number }>>}
 */
export async function dispatchAll(providerNames, prompt, opts = {}) {
  return Promise.all(
    providerNames.map(name => dispatchAsync(name, prompt, opts))
  );
}

/**
 * List available (installed + authenticated) providers.
 *
 * @returns {string[]}
 */
export function listAvailable() {
  return Object.entries(providers)
    .filter(([, p]) => p.isAvailable())
    .map(([name]) => name);
}

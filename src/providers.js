/**
 * Provider definitions for AI CLIs.
 *
 * Each provider describes how to invoke a specific AI CLI tool
 * in headless/non-interactive mode and parse its output.
 */

import { execFileSync } from 'node:child_process';

/**
 * @typedef {Object} Provider
 * @property {string} name - Human-readable name
 * @property {string} command - CLI binary name
 * @property {function(string, Object): string[]} buildArgs - Build argument array from prompt + options
 * @property {function(): boolean} isAvailable - Check if the CLI is installed and authenticated
 * @property {function(string): string} parseOutput - Extract the response text from raw stdout
 */

/** @type {Record<string, Provider>} */
const providers = {
  claude: {
    name: 'Claude (Anthropic)',
    command: 'claude',
    buildArgs: (prompt, opts = {}) => {
      const args = ['-p', prompt, '--no-input'];
      if (opts.model) args.push('--model', opts.model);
      return args;
    },
    isAvailable: () => {
      try {
        execFileSync('claude', ['--version'], { stdio: 'pipe', timeout: 5000 });
        return true;
      } catch { return false; }
    },
    parseOutput: (raw) => raw.trim(),
  },

  gemini: {
    name: 'Gemini (Google)',
    command: 'gemini',
    buildArgs: (prompt, opts = {}) => {
      const args = ['-p', prompt];
      if (opts.model) args.push('-m', opts.model);
      return args;
    },
    isAvailable: () => {
      try {
        execFileSync('gemini', ['--version'], { stdio: 'pipe', timeout: 5000 });
        return true;
      } catch { return false; }
    },
    parseOutput: (raw) => {
      // Strip Gemini's warning lines (true color, ripgrep)
      return raw.split('\n')
        .filter(l => !l.startsWith('Warning:') && !l.startsWith('Ripgrep'))
        .join('\n')
        .trim();
    },
  },

  codex: {
    name: 'Codex (OpenAI)',
    command: 'codex',
    buildArgs: (prompt, opts = {}) => {
      const args = ['exec', '--full-auto', prompt];
      if (opts.cwd) args.push('-C', opts.cwd);
      return args;
    },
    isAvailable: () => {
      try {
        execFileSync('codex', ['--version'], { stdio: 'pipe', timeout: 5000 });
        return true;
      } catch { return false; }
    },
    parseOutput: (raw) => raw.trim(),
  },
};

export default providers;

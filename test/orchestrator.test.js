import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dispatch, listAvailable } from '../src/orchestrator.js';
import providers from '../src/providers.js';

describe('providers', () => {
  it('has claude, gemini, and codex defined', () => {
    assert.ok(providers.claude);
    assert.ok(providers.gemini);
    assert.ok(providers.codex);
  });

  it('each provider has required fields', () => {
    for (const [name, p] of Object.entries(providers)) {
      assert.ok(p.name, `${name} missing name`);
      assert.ok(p.command, `${name} missing command`);
      assert.equal(typeof p.buildArgs, 'function', `${name} buildArgs not a function`);
      assert.equal(typeof p.isAvailable, 'function', `${name} isAvailable not a function`);
      assert.equal(typeof p.parseOutput, 'function', `${name} parseOutput not a function`);
    }
  });

  it('buildArgs returns an array with -p for gemini', () => {
    const args = providers.gemini.buildArgs('hello');
    assert.ok(Array.isArray(args));
    assert.ok(args.includes('-p'));
    assert.ok(args.includes('hello'));
  });

  it('buildArgs includes model when provided', () => {
    const args = providers.claude.buildArgs('test', { model: 'claude-sonnet-4-6' });
    assert.ok(args.includes('--model'));
    assert.ok(args.includes('claude-sonnet-4-6'));
  });
});

describe('dispatch', () => {
  it('throws on unknown provider', () => {
    assert.throws(() => dispatch('nonexistent', 'hello'), /Unknown provider/);
  });

  it('returns error object when command not found', () => {
    // Use a provider name that exists but binary won't be found
    const origCommand = providers.codex.command;
    providers.codex.command = 'definitely-not-installed-cli-tool';
    try {
      const result = dispatch('codex', 'hello', { timeout: 5000 });
      assert.equal(result.provider, 'codex');
      assert.ok(result.error);
      assert.equal(result.output, '');
    } finally {
      providers.codex.command = origCommand;
    }
  });
});

describe('listAvailable', () => {
  it('returns an array', () => {
    const available = listAvailable();
    assert.ok(Array.isArray(available));
  });
});

describe('gemini parseOutput', () => {
  it('strips warning lines', () => {
    const raw = 'Warning: True color support not detected.\nRipgrep is not available.\nHello world!';
    const parsed = providers.gemini.parseOutput(raw);
    assert.equal(parsed, 'Hello world!');
  });

  it('passes through clean output', () => {
    const raw = 'This is a clean response.';
    assert.equal(providers.gemini.parseOutput(raw), 'This is a clean response.');
  });
});

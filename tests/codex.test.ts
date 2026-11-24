import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
const { CodexBackend } = await import(new URL('../.dev/test/codex.mjs', import.meta.url).href);
const create = () => new CodexBackend(resolve('tests/fixtures/mock-codex.mjs'), mkdtempSync(tmpdir() + '/ai-chat-test-'));
const options = (prompt: string) => ({ prompt, onThread: (_: string) => {}, onText: (_: string) => {}, onStatus: (_: string) => {} });
test('streams only the right thread, deduplicates final text, and resumes IDs', async () => {
  const backend = create(); let id = '', text = ''; const updates: string[] = [];
  try {
    assert.equal(await backend.run({ ...options('test'), onThread: (v: string) => { id = v; }, onText: (v: string) => { text = v; updates.push(v); } }), 'complete');
    assert.equal(id, 'test-thread'); assert.equal(text, '第一段第二段'); assert.ok(updates.length >= 2);
    assert.equal(await backend.run({ ...options('followup'), threadId: id }), 'complete');
  } finally { backend.dispose(); }
});
test('provider failures reject rather than displaying empty success', async () => {
  const b = create(); try { await assert.rejects(b.run(options('FAIL')), /Test failure/); } finally { b.dispose(); }
});
test('process exit rejects and can reconnect', async () => {
  const b = create(); try {
    await assert.rejects(b.run(options('CRASH')), /退出/);
    assert.equal(await b.run(options('again')), 'complete');
  } finally { b.dispose(); }
});
test('stop interrupts the correct turn', async () => {
  const b = create(); try {
    const running = b.run({ ...options('WAIT'), onStatus: (s: string) => { if (s.includes('阅读')) setTimeout(() => { void b.stop(); }, 50); } });
    assert.equal(await running, 'stopped');
  } finally { b.dispose(); }
});
test('overlapping sends are rejected', async () => {
  const b = create(); try {
    const running = b.run({ ...options('WAIT'), onStatus: (s: string) => { if (s.includes('阅读')) setTimeout(() => { void b.stop(); }, 50); } });
    await assert.rejects(b.run(options('overlap')), /上一条/); await running;
  } finally { b.dispose(); }
});

test('empty completion rejects and malformed event fields do not pollute text', async () => {
  const b = create(); let text = '';
  try {
    await assert.rejects(b.run(options('EMPTY')), /未返回完整回答/);
    assert.equal(await b.run({ ...options('MALFORMED'), onText: (value: string) => { text = value; } }), 'complete');
    assert.equal(text, '第一段第二段');
  } finally { b.dispose(); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
const { GeminiBackend } = await import(new URL('../.dev/test/gemini.mjs', import.meta.url).href);
const options = (prompt: string) => ({ prompt, onThread: (_: string) => {}, onText: (_: string) => {}, onStatus: (_: string) => {} });
const create = () => new GeminiBackend(resolve('tests/fixtures/mock-gemini.mjs'), mkdtempSync(tmpdir() + '/gemini-chat-test-'));
test('Gemini streams text and resumes the specific conversation', async () => {
 const b = create(); let id = '', text = '';
 assert.equal(await b.run({...options('hello'), onThread: (v: string) => { id = v; }, onText: (v: string) => {text = v;}}), 'complete');
 assert.equal(text, '第一段第二段'); assert.equal(id,'gemini-session');
 assert.equal(await b.run({...options('RESUME'),threadId:id}), 'complete');
});
test('Gemini authentication, provider error, and empty result are not successful answers', async () => {
 const b = create();
 await assert.rejects(b.run(options('LOGIN')), /尚未登录/);
 await assert.rejects(b.run(options('FAIL')), /Test failure/);
 await assert.rejects(b.run(options('EMPTY')), /退出/);
});
test('Gemini stop interrupts and guards overlapping sends', async () => {
 const b = create(); const running = b.run({...options('WAIT'),onThread: () => {setTimeout(() => b.stop(),20);}});
 await assert.rejects(b.run(options('hello')), /上一条/);
 assert.equal(await running, 'stopped');
});

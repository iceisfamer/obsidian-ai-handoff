import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTurn, makeConversation, selectQuote } from '../src/conversation.ts';
const article = { title: '测试文章', path: '资料/测试.md', text: '首段\n\n第二段\n\n末段' };
test('first message supplies complete article without truncation', () => {
  const long = { ...article, text: '中文😀\n'.repeat(40000) + '末尾唯一标记' };
  assert.ok(buildTurn(long, '分析全文', undefined).prompt.includes(long.text));
});
test('follow-up reuses unchanged context but always supplies question and quote', () => {
  const first = buildTurn(article, '概括', undefined);
  const next = buildTurn(article, '这句话呢？', { path: article.path, text: '第二段' }, first.hash);
  assert.ok(!next.prompt.includes(article.text));
  assert.ok(next.prompt.includes('第二段'));
  assert.ok(next.prompt.includes('这句话呢？'));
});
test('edited article sends new full snapshot', () => {
  const first = buildTurn(article, '概括', undefined);
  const edited = { ...article, text: article.text + '\n新增的论点' };
  const next = buildTurn(edited, '现在呢', undefined, first.hash);
  assert.ok(next.prompt.includes(edited.text));
  assert.notEqual(next.hash, first.hash);
});
test('selecting text preserves the draft and collapsing selection retains the quote', () => {
  const session = makeConversation('codex'); session.draft = '我已经写了一半的问题';
  selectQuote(session, article, '第二段', 4, 7);
  selectQuote(session, article, '');
  assert.equal(session.quote?.text, '第二段');
  assert.equal(session.draft, '我已经写了一半的问题');
});
test('fresh selection replaces the pending quote, never auto-submits', () => {
  const s = makeConversation('codex'); selectQuote(s, article, '首段'); selectQuote(s, article, '末段');
  assert.equal(s.quote?.text, '末段'); assert.equal(s.messages.length, 0);
});
test('cross-note quotes and empty messages are rejected', () => {
  assert.throws(() => buildTurn(article, '问题', { path: '别的.md', text: '内容' }), /另一篇/);
  assert.throws(() => buildTurn(article, ' ', undefined), /输入问题/);
  assert.throws(() => buildTurn({ ...article, text: ' ' }, '问题', undefined), /没有正文/);
});
test('separate notes and providers never share mutable history', () => {
  const a = makeConversation('codex'), b = makeConversation('codex'), c = makeConversation('gemini');
  a.draft = '我的问题'; a.threadId = 'abc';
  assert.notEqual(a.id, b.id); assert.equal(b.threadId, undefined); assert.equal(c.draft, '');
});

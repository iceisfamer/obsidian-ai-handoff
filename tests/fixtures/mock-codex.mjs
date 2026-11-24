#!/usr/bin/env node
import { createInterface } from 'node:readline';
let threadId = 'test-thread', turnId = 0, timer;
const write = value => process.stdout.write(JSON.stringify(value) + '\n');
const notice = (method, params) => write({ method, params });
createInterface({ input: process.stdin }).on('line', line => {
  const m = JSON.parse(line), result = value => write({ id: m.id, result: value });
  if (m.method === 'initialize') result({});
  if (m.method === 'config/read') result({ config: { mcp_servers: { fakeExternal: {} } } });
  if (['thread/start', 'thread/resume'].includes(m.method)) {
    if (m.params.sandbox !== 'read-only' || m.params.config['mcp_servers.fakeExternal.enabled'] !== false) return write({ id: m.id, error: { message: 'Unsafe test configuration' } });
    threadId = m.params.threadId ?? 'test-thread'; result({ thread: { id: threadId } });
  }
  if (m.method === 'turn/start') {
    const text = m.params.input[0].text;
    turnId++; result({ turn: { id: String(turnId) } }); notice('turn/started', { threadId, turn: { id: String(turnId) } });
    if (text === 'CRASH') return setTimeout(() => process.exit(1), 10);
    if (text === 'FAIL') return notice('turn/completed', { threadId, turn: { status: 'failed', error: { message: 'Test failure' } } });
    if (text === 'EMPTY') return notice('turn/completed', { threadId, turn: { status: 'completed' } });
    if (text === 'MALFORMED') { notice('item/agentMessage/delta', { threadId, itemId: {}, delta: 123 }); notice('item/completed', { threadId, item: { type: 'agentMessage', id: 1, text: {} } }); }
    if (text === 'WAIT') { timer = setTimeout(() => {}, 30000); return; }
    notice('item/agentMessage/delta', { threadId: 'other-thread', itemId: 'wrong', delta: '不能混入' });
    notice('item/agentMessage/delta', { threadId, itemId: 'reply', delta: '第一段' });
    notice('item/agentMessage/delta', { threadId, itemId: 'reply', delta: '第二段' });
    notice('item/completed', { threadId, item: { id: 'reply', type: 'agentMessage', text: '第一段第二段' } });
    notice('turn/completed', { threadId, turn: { status: 'completed' } });
  }
  if (m.method === 'turn/interrupt') { clearTimeout(timer); result({}); notice('turn/completed', { threadId, turn: { status: 'interrupted' } }); }
});

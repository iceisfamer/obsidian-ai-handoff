// Node transport timers are independent of the UI window lifecycle.
import * as timers from 'node:timers';
import { record, text as stringValue } from './protocol';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { accessSync, constants, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, isAbsolute, dirname } from 'node:path';
import { createInterface } from 'node:readline';
import type { ChatBackend, RunOptions } from './conversation';
export function findGemini(custom = ''): string {
  const candidates = custom.trim() ? [custom.trim()] : [join(homedir(), '.local/bin/agy'), '/opt/homebrew/bin/agy', '/usr/local/bin/agy', ...(process.env.PATH ?? '').split(':').filter(Boolean).map(p => join(p, 'agy'))];
  for (const p of candidates) { try { if (isAbsolute(p)) { accessSync(p, constants.X_OK); return p; } } catch { /* Try the next executable path. */ } }
  throw new Error('找不到 Gemini 的 Antigravity CLI。请先安装官方 agy 并完成 Google 登录，再到插件设置填写路径。');
}
export class GeminiBackend implements ChatBackend {
  private child?: ChildProcessWithoutNullStreams;
  private stopped = false;
  private killTimer?: ReturnType<typeof timers.setTimeout>;
  constructor(private executable: string, private cwd: string) {}
  async run(options: RunOptions): Promise<'complete' | 'stopped'> {
    if (this.child) throw new Error('上一条回答还未结束。');
    this.stopped = false;
    mkdirSync(this.cwd, { recursive: true });
    const settings = { permissions: { deny: ['command(*)', 'read_file(*)', 'write_file(*)', 'read_url(*)', 'execute_url(*)', 'mcp(*)'] } };
    const args = ['--input-format', 'stream-json', '--output-format', 'stream-json', '--disable-slash-commands', '--settings', JSON.stringify(settings), '--print-timeout', '10m'];
    if (options.threadId) args.push('--conversation', options.threadId);
    if (options.model?.trim()) args.push('--model', options.model.trim());
    options.onStatus('正在连接 Gemini…');
    return new Promise((resolve, reject) => {
      const child = spawn(this.executable, args, { cwd: this.cwd, env: { ...process.env, PATH: `${dirname(this.executable)}:${process.env.PATH ?? ''}:/opt/homebrew/bin:/usr/local/bin:${homedir()}/.npm-global/bin` }, stdio: 'pipe', windowsHide: true });
      this.child = child;
      let text = '', stderr = '', failure = '', success = false, settled = false;
      const timeout = timers.setTimeout(() => { failure = 'Gemini 等待超过 10 分钟，已停止。'; child.kill(); this.killTimer = timers.setTimeout(() => child.kill('SIGKILL'), 3000); }, 600000);
      const finish = (error?: Error) => {
        if (settled) return; settled = true; timers.clearTimeout(timeout); timers.clearTimeout(this.killTimer);
        this.child = undefined;
        if (this.stopped) resolve('stopped');
        else if (error) reject(error); else resolve('complete');
      };
      child.stdin.on('error', () => {});
      child.on('error', e => finish(new Error(`无法启动 Gemini：${e.message}`)));
      child.stderr.on('data', (data: Buffer) => { stderr = (stderr + data.toString()).slice(-6000); });
      createInterface({ input: child.stdout }).on('line', line => {
        let event: Record<string, unknown>; try { event = record(JSON.parse(line)); } catch { return; }
        if (event.event === 'init' && typeof event.conversation_id === 'string' && event.conversation_id) { options.onThread(event.conversation_id); options.onStatus('正在阅读并回答…'); }
        const step = record(event.step_update);
        if (event.event === 'step_update' && step?.step_type === 'agent_response' && typeof step.text_delta === 'string') {
          if (!options.threadId || !step.conversation_id || step.conversation_id === options.threadId) { text += step.text_delta; options.onText(text); }
        }
        if (event.event === 'result') {
          const result = record(event.result); success = result.status === 'SUCCESS';
          if (typeof result.conversation_id === 'string' && result.conversation_id) options.onThread(result.conversation_id);
          if (typeof result.response === 'string' && result.response) { text = result.response; options.onText(text); }
          if (!success) failure = stringValue(result.error, 'Gemini 回答未完成。');
        }
      });
      child.on('close', code => {
        if (this.stopped) return finish();
        if (code === 0 && success && text && !failure) return finish();
        const details = failure || stderr || `Gemini 退出（${code}）。`;
        const needsLogin = /auth|login|credentials|GEMINI_API_KEY|认证|登录/i.test(details);
        // Strip ANSI escapes from local CLI diagnostics before showing them.
        // eslint-disable-next-line no-control-regex -- ANSI escape removal requires matching ESC.
        finish(new Error(needsLogin ? 'Gemini 的 Antigravity CLI 尚未登录或登录已失效。请在终端运行 ~/.local/bin/agy 完成 Google 登录，再回到这里重试。' : details.replace(/\x1b\[[0-9;]*m/g, '').slice(-1200)));
      });
      child.stdin.end(JSON.stringify({ event: 'user', message: { content: options.prompt } }) + '\n');
    });
  }
  async stop() {
    if (!this.child) return; this.stopped = true;
    const child = this.child; child.kill('SIGTERM');
    this.killTimer = timers.setTimeout(() => child.kill('SIGKILL'), 3000);
  }
  dispose() { void this.stop(); }
}

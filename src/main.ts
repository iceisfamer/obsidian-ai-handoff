import { App, Component, FileSystemAdapter, ItemView, MarkdownRenderer, MarkdownView, Menu, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, type SettingDefinitionItem, setIcon } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CodexBackend, findCodex } from './codex';
import { GeminiBackend, findGemini } from './gemini';
import { buildTurn, makeConversation, selectQuote } from './conversation';
import type { Article, ChatBackend, Conversation, Message, Provider } from './conversation';

const VIEW = 'ai-handoff-chat';
interface Settings { codexPath: string; codexModel: string; geminiPath: string; geminiModel: string }
interface Data { version: number; settings: Settings; sessions: Record<string, Conversation>; archives: Record<string, Conversation[]> }
const defaults = (): Data => ({ version: 2, settings: { codexPath: '', codexModel: '', geminiPath: '', geminiModel: '' }, sessions: {}, archives: {} });

export default class AIChatPlugin extends Plugin {
  data: Data = defaults();
  article?: Article;
  markdownView?: MarkdownView;
  provider: Provider = 'codex';
  running?: { key: string; conversation: Conversation; answer: Message; status: string; backend: ChatBackend };
  private backend?: CodexBackend;
  private geminiBackend?: GeminiBackend;
  private queue = Promise.resolve();
  private saveTimer?: number;
  private renderTimer?: number;
  private selectionDocuments = new WeakSet<Document>();
  private unloaded = false;
  private preparing = false;

  async onload() {
    if (process.platform !== 'darwin') { new Notice('AI Handoff 公开测试版目前仅支持 macOS。', 10000); return; }
    const saved = await this.loadData() as Partial<Data> | null;
    if (saved?.version === 2) this.data = { ...defaults(), ...saved, settings: { ...defaults().settings, ...saved.settings } };
    // Restore unfinished drafts after interruption without implying the old run is still active.
    for (const session of Object.values(this.data.sessions)) for (const message of session.messages) if (message.role === 'assistant' && !message.state) message.state = 'stopped';
    this.registerView(VIEW, leaf => new ChatView(leaf, this));
    this.addSettingTab(new ChatSettings(this.app, this));
    this.addRibbonIcon('messages-square', '问 AI · 当前文章', () => { void this.openChat(); });
    this.addCommand({ id: 'open-chat', name: '打开文章对话', callback: () => this.openChat() });
    this.addCommand({ id: 'quote-selection', name: '引用选中文字并打开对话', callback: async () => { this.captureSelection(); await this.openChat(); } });
    this.addCommand({ id: 'stop-response', name: '停止当前回答', callback: () => this.stop() });
    this.registerEvent(this.app.workspace.on('active-leaf-change', leaf => {
      if (leaf?.view instanceof MarkdownView) void this.attach(leaf.view);
    }));
    this.registerEvent(this.app.workspace.on('editor-change', (_editor, info) => {
      if (info instanceof MarkdownView && info === this.markdownView) void this.attach(info, false);
    }));
    this.registerEvent(this.app.vault.on('modify', file => {
      if (file.path === this.article?.path && this.markdownView?.getMode() === 'preview') void this.attach(this.markdownView, false);
    }));
    this.registerEvent(this.app.vault.on('delete', file => {
      if (file.path === this.article?.path) { this.article = undefined; this.markdownView = undefined; this.refresh(); }
    }));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      for (const provider of ['codex', 'gemini'] as Provider[]) {
        const old = this.key(oldPath, provider), next = this.key(file.path, provider);
        if (this.data.sessions[old]) { this.data.sessions[next] = this.data.sessions[old]; delete this.data.sessions[old]; }
        if (this.data.archives[old]) { this.data.archives[next] = this.data.archives[old]; delete this.data.archives[old]; }
        if (this.running?.key === old) this.running.key = next;
        const session = this.data.sessions[next]; if (session?.quote) session.quote.path = file.path;
      }
      if (this.article?.path === oldPath) { this.article.path = file.path; this.article.title = file instanceof TFile ? file.basename : file.name; }
      this.scheduleSave(); this.refresh();
    }));
    this.registerEditorExtension(EditorView.updateListener.of(update => {
      if (!update.selectionSet || !this.markdownView?.containerEl.contains(update.view.dom)) return;
      const { from, to } = update.state.selection.main;
      if (to > from) this.acceptQuote(update.state.doc.sliceString(from, to), from, to);
    }));
    this.app.workspace.onLayoutReady(() => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) void this.attach(view);
    });
  }
  onunload() {
    if (process.platform !== 'darwin') return;
    this.unloaded = true; window.clearTimeout(this.saveTimer); window.clearTimeout(this.renderTimer);
    if (this.running) this.running.answer.state = 'stopped';
    this.backend?.dispose(); this.geminiBackend?.dispose(); void this.persist().catch(() => new Notice('对话保存失败，请检查笔记库是否可写。'));
  }
  key(path = this.article?.path ?? '', provider = this.provider) { return `${provider}:${path}`; }
  session(): Conversation | undefined {
    if (!this.article) return;
    const key = this.key();
    return this.data.sessions[key] ?? (this.data.sessions[key] = makeConversation(this.provider));
  }
  persist() {
    const snapshot: unknown = JSON.parse(JSON.stringify(this.data));
    this.queue = this.queue.catch(() => {}).then(() => this.saveData(snapshot));
    return this.queue;
  }
  scheduleSave() { window.clearTimeout(this.saveTimer); this.saveTimer = window.setTimeout(() => { void this.persist().catch(() => new Notice('对话保存失败，请检查笔记库是否可写。')); }, 350); }
  refresh() { if (!this.unloaded) for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) (leaf.view as ChatView).refresh(); }
  updateMessages() {
    if (this.renderTimer) return;
    this.renderTimer = window.setTimeout(() => { this.renderTimer = undefined; this.refresh(); }, 100);
  }
  async attach(view: MarkdownView, rerender = true) {
    if (!view.file) return;
    const file = view.file;
    const previous = this.article?.path;
    this.markdownView = view;
    const doc = view.containerEl.ownerDocument;
    if (!this.selectionDocuments.has(doc)) {
      this.selectionDocuments.add(doc);
      // Each editor document owns its events, including detached windows.
      this.registerDomEvent(doc, 'mouseup', event => {
        const target = event.target;
        if (target && 'nodeType' in target && this.markdownView?.containerEl.contains(target as Node)) this.captureSelection();
      });
      this.registerDomEvent(doc, 'keyup', event => { if (event.shiftKey) this.captureSelection(); });
    }
    const text = view.getMode() === 'source' ? view.editor.getValue() : await this.app.vault.read(file);
    if (this.markdownView !== view || view.file?.path !== file.path) return;
    this.article = { title: file.basename, path: file.path, text };
    if (previous !== file.path || rerender) this.refresh();
  }
  async openChat() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view) { await this.attach(view); this.captureSelection(); }
    let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
    if (!leaf) { leaf = this.app.workspace.getRightLeaf(false)!; await leaf.setViewState({ type: VIEW, active: true }); }
    await this.app.workspace.revealLeaf(leaf);
    (leaf.view as ChatView).refresh();
  }
  acceptQuote(text: string, from?: number, to?: number) {
    const session = this.session();
    if (!session || !this.article || !selectQuote(session, this.article, text, from, to)) return;
    this.scheduleSave();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) (leaf.view as ChatView).renderQuote();
  }
  captureSelection() {
    const view = this.markdownView;
    if (!view?.file || view.file.path !== this.article?.path) return;
    if (view.getMode() === 'source') {
      // Ignore clicks in the chat panel: an old editor selection must not reattach a removed quote.
      if (!view.containerEl.contains(view.containerEl.ownerDocument.activeElement)) return;
      this.acceptQuote(view.editor.getSelection());
    } else {
      const selection = view.containerEl.ownerDocument.getSelection();
      if (selection?.anchorNode && selection.focusNode && view.containerEl.contains(selection.anchorNode) && view.containerEl.contains(selection.focusNode)) this.acceptQuote(selection.toString());
    }
  }
  historyMenu(event: MouseEvent) {
    const current = this.session(); if (!current) return;
    const key = this.key(); const menu = new Menu();
    menu.addItem(item => item.setTitle('新对话').setIcon('plus').setDisabled(!!this.running).onClick(() => {
      (this.data.archives[key] ??= []).push(current); this.data.sessions[key] = makeConversation(this.provider);
      this.scheduleSave(); this.refresh();
    }));
    for (const session of [...(this.data.archives[key] ?? [])].reverse()) menu.addItem(item => item
      .setTitle(session.messages.find(m => m.role === 'user')?.text.slice(0, 36) ?? '空对话')
      .setDisabled(!!this.running).onClick(() => {
        this.data.archives[key] = (this.data.archives[key] ?? []).filter(s => s.id !== session.id);
        this.data.archives[key].push(current); this.data.sessions[key] = session; this.scheduleSave(); this.refresh();
      }));
    menu.showAtMouseEvent(event);
  }
  resetBackend() { if (this.running) throw new Error('请先停止当前回答再修改连接设置。'); this.backend?.dispose(); this.backend = undefined; this.geminiBackend?.dispose(); this.geminiBackend = undefined; }
  async stop() { if (this.running) { this.running.status = '正在停止…'; this.refresh(); await this.running.backend.stop(); } }
  async send() {
    if (this.running || this.preparing) return;
    const session = this.session(), view = this.markdownView;
    if (!session || !view || !session.draft.trim()) return;
    this.preparing = true;
    const question = session.draft, originalQuote = session.quote;
    let started = false;
    try {
      await this.attach(view, false);
      if (session !== this.session()) throw new Error('文章已切换，请在当前文章下重新发送。');
      const article = this.article!; const key = this.key();
      const turn = buildTurn(article, question, session.quote, session.threadId ? session.contextHash : undefined);
      if (!(this.app.vault.adapter instanceof FileSystemAdapter)) throw new Error('需要本地桌面笔记库。');
      const cwd = join(this.app.vault.adapter.getBasePath(), this.manifest.dir!, 'runtime');
      const backend = this.provider === 'codex'
        ? (this.backend ??= new CodexBackend(findCodex(this.data.settings.codexPath), join(cwd, 'codex')))
        : (this.geminiBackend ??= new GeminiBackend(findGemini(this.data.settings.geminiPath), join(cwd, 'gemini')));
      const model = this.provider === 'codex' ? this.data.settings.codexModel : this.data.settings.geminiModel;
      const user: Message = { id: randomUUID(), role: 'user', text: question.trim(), quote: session.quote, at: Date.now(), state: 'complete' };
      const answer: Message = { id: randomUUID(), role: 'assistant', text: '', at: Date.now() };
      session.messages.push(user, answer); session.draft = ''; session.quote = undefined;
      this.running = { key, conversation: session, answer, status: '正在连接…', backend };
      started = true; this.refresh(); await this.persist();
      const outcome = await backend.run({
        prompt: turn.prompt, threadId: session.threadId, model,
        onThread: id => { session.threadId = id; this.scheduleSave(); },
        onText: text => { answer.text = text; this.updateMessages(); },
        onStatus: status => { if (this.running?.answer === answer) { this.running.status = status; this.refresh(); } },
      });
      answer.state = outcome === 'complete' ? 'complete' : 'stopped';
      if (outcome === 'complete') session.contextHash = turn.hash;
      else if (!answer.text) answer.text = '已停止生成。';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (started && this.running) {
        this.running.answer.state = 'error';
        this.running.answer.text += `${this.running.answer.text ? '\n\n' : ''}连接或回答失败：${message}`;
        if (!session.draft) session.draft = question;
        if (!session.quote) session.quote = originalQuote;
      } else new Notice(message, 9000);
    } finally {
      this.preparing = false;
      if (started) { this.running = undefined; await this.persist().catch(() => new Notice('对话保存失败。')); }
      this.refresh();
    }
  }
}

export class ChatView extends ItemView {
  private plugin: AIChatPlugin;
  private articleTitleEl!: HTMLElement; private metaEl!: HTMLElement; private messagesEl!: HTMLElement;
  private quoteEl!: HTMLElement; private input!: HTMLTextAreaElement; private action!: HTMLButtonElement;
  private providerEl!: HTMLSelectElement;
  private statusEl!: HTMLElement; private messageComponent = new Component();
  private shownSession?: string; private messageSignature = '';
  constructor(leaf: WorkspaceLeaf, plugin: AIChatPlugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return VIEW; }
  getDisplayText() { return '文章对话'; }
  getIcon() { return 'messages-square'; }
  async onOpen() {
    this.contentEl.empty(); this.contentEl.addClass('ai-chat');
    const header = this.contentEl.createDiv({ cls: 'ai-chat-header' });
    const brand = header.createDiv({ cls: 'ai-chat-brand', text: '问 ' });
    this.providerEl = brand.createEl('select', { attr: { 'aria-label': '选择 AI 客户端' } });
    this.providerEl.createEl('option', { value: 'codex', text: 'Codex' });
    this.providerEl.createEl('option', { value: 'gemini', text: 'Gemini' });
    this.providerEl.onchange = () => { this.plugin.provider = this.providerEl.value as Provider; this.plugin.refresh(); };
    const history = header.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': '新对话与历史记录', title: '新对话与历史记录' } });
    setIcon(history, 'history'); history.onclick = e => this.plugin.historyMenu(e);
    const context = this.contentEl.createDiv({ cls: 'ai-chat-context' });
    this.articleTitleEl = context.createDiv({ cls: 'ai-chat-title' });
    this.metaEl = context.createDiv({ cls: 'ai-chat-meta' });
    this.messagesEl = this.contentEl.createDiv({ cls: 'ai-chat-messages', attr: { 'role': 'log', 'aria-label': '文章对话记录' } });
    const composer = this.contentEl.createDiv({ cls: 'ai-chat-composer' });
    this.quoteEl = composer.createDiv({ cls: 'ai-chat-quote' });
    this.input = composer.createEl('textarea', { cls: 'ai-chat-input', attr: { placeholder: '围绕这篇文章提问…', 'aria-label': '输入关于文章的问题', rows: '3' } });
    this.input.oninput = () => { const session = this.plugin.session(); if (session) { session.draft = this.input.value; this.plugin.scheduleSave(); } this.updateAction(); };
    this.input.onkeydown = event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if (!this.plugin.running) void this.plugin.send(); }
    };
    const footer = composer.createDiv({ cls: 'ai-chat-footer' });
    this.statusEl = footer.createDiv({ cls: 'ai-chat-status', attr: { role: 'status' } });
    this.action = footer.createEl('button', { text: '发送', cls: 'mod-cta' });
    this.action.onclick = () => { if (this.plugin.running) void this.plugin.stop(); else void this.plugin.send(); };
    this.addChild(this.messageComponent); this.refresh();
  }
  async onClose() { this.messageComponent.unload(); }
  updateAction() {
    if (!this.action) return;
    this.action.textContent = this.plugin.running ? '停止' : '发送';
    this.action.disabled = !this.plugin.running && (!this.plugin.article || !this.input.value.trim());
  }
  renderQuote() {
    if (!this.quoteEl) return;
    this.quoteEl.empty(); const quote = this.plugin.session()?.quote;
    this.quoteEl.toggleClass('is-empty', !quote);
    if (!quote) return;
    const heading = this.quoteEl.createDiv({ cls: 'ai-chat-quote-heading' });
    heading.createSpan({ text: '本次引用 · 结合全文回答' });
    const remove = heading.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': '移除引用', title: '移除引用' } });
    setIcon(remove, 'x'); remove.onclick = () => { const session = this.plugin.session(); if (session) { session.quote = undefined; this.plugin.scheduleSave(); this.renderQuote(); } };
    this.quoteEl.createDiv({ cls: 'ai-chat-quote-text', text: quote.text });
  }
  refresh() {
    if (!this.input) return;
    const article = this.plugin.article, session = this.plugin.session(), running = this.plugin.running;
    this.articleTitleEl.textContent = article?.title ?? '打开一篇文章开始';
    this.articleTitleEl.title = article?.path ?? '';
    this.metaEl.textContent = article ? `全文上下文 · ${Array.from(article.text).length.toLocaleString()} 字符` : '左侧阅读，右侧讨论';
    this.providerEl.value = this.plugin.provider;
    this.providerEl.disabled = !!running;
    const changed = this.shownSession !== session?.id;
    if (changed || this.input.value !== (session?.draft ?? '')) this.input.value = session?.draft ?? '';
    this.shownSession = session?.id;
    this.input.disabled = !article;
    this.statusEl.textContent = running ? (running.key === this.plugin.key() ? running.status : '另一篇文章正在回答…') : 'Enter 发送 · Shift+Enter 换行';
    this.renderQuote(); this.updateAction();
    const signature = JSON.stringify([session?.id, session?.messages]);
    if (signature === this.messageSignature && !changed) return;
    this.messageSignature = signature;
    const nearBottom = this.messagesEl.scrollHeight - this.messagesEl.scrollTop - this.messagesEl.clientHeight < 100;
    this.messageComponent.unload(); this.messageComponent = new Component(); this.messageComponent.load();
    this.messagesEl.empty();
    if (!session?.messages.length) {
      const empty = this.messagesEl.createDiv({ cls: 'ai-chat-empty' });
      empty.createEl('h3', { text: '读到哪里，聊到哪里' });
      empty.createEl('p', { text: '直接提问会结合全文。选中左侧文字，会自动成为本次引用。' });
      for (const text of ['概括这篇文章的核心观点', '这篇文章的论证有哪些不足？']) {
        const button = empty.createEl('button', { text }); button.disabled = !article;
        button.onclick = () => { const s = this.plugin.session(); if (s) { s.draft = text; this.refresh(); this.input.focus(); } };
      }
    }
    for (const message of session?.messages ?? []) {
      const bubble = this.messagesEl.createDiv({ cls: `ai-chat-message is-${message.role}` });
      bubble.createDiv({ cls: 'ai-chat-role', text: message.role === 'user' ? '你' : (session?.provider === 'gemini' ? 'Gemini' : 'Codex') });
      if (message.quote) bubble.createEl('blockquote', { text: message.quote.text, cls: 'ai-chat-sent-quote' });
      const body = bubble.createDiv({ cls: 'ai-chat-body' });
      if (message.role === 'assistant' && message.state === 'complete') void MarkdownRenderer.render(this.app, message.text, body, article?.path ?? '', this.messageComponent);
      else body.setText(message.text || '正在思考…');
      if (message.state === 'error' || message.state === 'stopped') bubble.createDiv({ cls: 'ai-chat-message-state', text: message.state === 'error' ? '本轮未完成 · 可以重新提问' : '已停止' });
    }
    if (nearBottom || changed) {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      this.contentEl.ownerDocument.defaultView?.requestAnimationFrame(() => {
        if (this.messageSignature === signature) this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      });
    }
  }
}
class ChatSettings extends PluginSettingTab {
  constructor(app: App, private plugin: AIChatPlugin) { super(app, plugin); }
  getSettingDefinitions(): SettingDefinitionItem[] {
    const entries: { key: keyof Settings; name: string; desc: string }[] = [
      { key: 'codexPath', name: 'Codex 可执行文件', desc: '留空自动检测。使用本机已有登录；自定义时填写完整路径。' },
      { key: 'codexModel', name: 'Codex 模型', desc: '留空沿用本机 Codex 默认模型。' },
      { key: 'geminiPath', name: 'Gemini 后端可执行文件', desc: '使用官方 Antigravity CLI（agy）。留空自动检测；需先在终端完成登录。' },
      { key: 'geminiModel', name: 'Gemini 模型', desc: '留空沿用 Antigravity CLI 默认模型，该默认值未必是 Gemini。' },
    ];
    return [
      ...entries.map(({ key, name, desc }) => ({ name, desc, render: (setting: Setting) => {
        setting.addText(input => input.setValue(this.plugin.data.settings[key]).onChange(value => {
          if (this.plugin.running) { new Notice('请先停止回答，再修改连接设置。'); return; }
          this.plugin.resetBackend(); this.plugin.data.settings[key] = value; this.plugin.scheduleSave();
        }));
      } })),
      { name: '数据与网络', desc: '发送时将文章全文、相对路径、引用和问题交给所选客户端及其模型服务。需要联网及可用账号，可能消耗付费额度。对话和草稿保存在插件 data.json；本地客户端另存会话。笔记库同步也可能同步这些数据。' },
      { name: '阅读讨论模式', desc: '插件不提供笔记改写功能。图片、PDF 和双链目标暂不自动展开。详情见安装包的隐私说明。' },
    ];
  }
}

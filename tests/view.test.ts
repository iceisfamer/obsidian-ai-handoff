import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { makeConversation, selectQuote } from '../src/conversation.ts';
const window = new Window(); (globalThis as any).document = window.document;
const proto = window.HTMLElement.prototype as any;
proto.empty = function() {this.replaceChildren();};
proto.addClass = function(value: string) {this.classList.add(value);};
proto.toggleClass = function(value: string, enabled: boolean) {this.classList.toggle(value,enabled);};
proto.setText = function(value: string) {this.textContent=value;};
proto.createEl = function(tag: string, opts: any = {}) {
 const el = window.document.createElement(tag);
 if (opts.cls) el.className = opts.cls;
 if (opts.text) el.textContent = opts.text;
 if (opts.value) (el as any).value = opts.value;
 for (const [key,value] of Object.entries(opts.attr ?? {})) el.setAttribute(key,String(value));
 this.append(el); return el;
};
proto.createDiv = function(opts: any) {return this.createEl('div',opts);};
proto.createSpan = function(opts: any) {return this.createEl('span',opts);};
const { ChatView } = await import(new URL('../.dev/test/view.mjs', import.meta.url).href);
const setup = async () => {
 const s = makeConversation('codex');
 const plugin: any = {article:{title:'测试文章',path:'test.md',text:'第一阶段7棵，第二阶段加2棵。'}, provider:'codex',session:()=>s,scheduleSave:()=>{},key:()=>'codex:test.md'};
 const view = new ChatView({app:{}},plugin); plugin.refresh=()=>view.refresh();
 view.load(); await view.onOpen(); return {view,s,plugin};
};
test('sidebar mounts without overwriting Obsidian ItemView title and shows full context', async () => {
 const {view}=await setup();
 assert.equal(view.titleEl.textContent,'文章对话');
 assert.ok(view.contentEl.textContent.includes('测试文章'));
 assert.equal(view.contentEl.querySelectorAll('textarea').length,1);
 assert.ok(view.contentEl.textContent.includes('全文上下文'));
 await view.onClose();
});
test('quote renders independently from draft and can be removed without losing draft', async () => {
 const {view,s,plugin}=await setup(); s.draft='这个判断合理吗？';view.refresh();
 selectQuote(s,plugin.article,'第一阶段7棵');view.renderQuote();
 assert.ok(view.contentEl.textContent.includes('本次引用'));
 assert.equal(view.contentEl.querySelector('textarea').value,s.draft);
 view.contentEl.querySelector('[aria-label="移除引用"]').click();
 assert.equal(s.quote,undefined); assert.equal(s.draft,'这个判断合理吗？');
 await view.onClose();
});

export class Component { load() {} unload() {} addChild(c: any) { return c; } }
export class ItemView extends Component {
 app: any; containerEl: HTMLElement; contentEl: HTMLElement; titleEl: HTMLElement;
 constructor(leaf: any) { super(); this.app = leaf.app; this.containerEl = document.createElement('div'); this.titleEl = document.createElement('div'); this.contentEl = document.createElement('div'); this.containerEl.append(this.titleEl, this.contentEl); }
 load() { this.titleEl.setText((this as any).getDisplayText()); }
}
export class Plugin extends Component {}
export class PluginSettingTab {}
export class App {} export class FileSystemAdapter {} export class MarkdownView {} export class Menu {} export class Notice {} export class Setting {} export class TFile {} export class WorkspaceLeaf {}
export const setIcon = () => {};
export const MarkdownRenderer = {render: async (_app: any, text: string, el: HTMLElement) => { el.textContent = text; }};

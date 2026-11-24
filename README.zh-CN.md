# AI Handoff · macOS 公开测试版

在 Obsidian 左侧阅读、右侧与 Codex 或 Gemini 对话。直接提问结合文章全文；选中文字自动形成引用卡片；无需复制粘贴，能够连续追问。

**版本：0.3.0｜作者：cybrea｜许可证：MIT**

[下载公开测试版](https://github.com/iceisfamer/obsidian-ai-handoff/releases/tag/0.3.0) · [提交测试反馈](https://github.com/iceisfamer/obsidian-ai-handoff/issues)

## 使用前准备

- macOS、Obsidian **1.15.1 或更新版本**。目前只在 Apple Silicon Mac 上实测；Intel Mac 未验证。本版不支持 Windows、Linux 和手机。
- 自行安装并登录 Codex 或 [Antigravity CLI（agy）](https://antigravity.google/docs/getting-started?tab=cli)，至少选择一个。先确认在客户端中能够正常提问，再连接插件。Gemini 选项连接的是 `agy`，不是旧 `gemini` 可执行文件。
- 需要联网和对应模型的可用账号。插件免费，但 AI 服务可能需要付费套餐、消耗额度，或按客户端已有的 API 配置计费。
- 插件不会安装或更新客户端。它调用本地客户端后端，并不是把桌面聊天窗口嵌入 Obsidian。

## 安装和升级

当前通过安装包手动测试，尚未在社区插件市场上架。

1. 退出 Obsidian，或先停用旧版 AI Handoff。
2. 解压 `ai-handoff-0.3.0-macos.zip`，将其中 `ai-handoff` 文件夹复制到目标笔记库的 `.obsidian/plugins/`。使用自定义配置目录时替换 `.obsidian`。
3. 确认 `main.js`、`manifest.json`、`styles.css` 直接位于 `.obsidian/plugins/ai-handoff/` 内，避免重复嵌套文件夹。
4. 重新打开 Obsidian，在「设置 → 第三方插件」中启用 AI Handoff。
5. 「设置 → AI Handoff」中的客户端路径留空可自动检测，也可以填写完整路径。模型留空沿用客户端默认值。Antigravity 默认模型可能不是 Gemini；需要 Gemini 时，请明确选择账号支持的 Gemini 模型。

升级前备份插件目录，只替换三个运行文件，保留自己的 `data.json` 和 `runtime/`。0.3.0 沿用 0.2.0 的对话数据格式。回退时停用插件并恢复备份。

## 阅读与对话

1. 打开 Markdown 文章，点击左侧「问 AI · 当前文章」图标，或运行「AI Handoff: 打开文章对话」命令。
2. 在右侧选择 Codex 或 Gemini，输入问题。第一次发送会提供文章全文。
3. 选中正文中的文字，输入框上方自动出现引用卡片。草稿不变，可以移除引用；选中文字本身不会自动发送。
4. Enter 发送，Shift+Enter 换行。继续在原对话中追问；生成中可点「停止」。
5. 文章和后端各自保留独立对话；历史按钮可以新建对话或恢复旧对话。

## 发送什么、保存在哪里

**点击发送后，会把完整 Markdown、文章标题、库内相对路径、引用和问题交给所选客户端及其配置的模型服务。** 本地调用并不等于离线推理。文章更新后，下一轮重新提供最新全文；正文未变则复用原会话。

对话、引用、草稿、设置和客户端会话 ID 保存在插件的 `data.json`；客户端还会在笔记库外保存登录、配置和会话。笔记库同步及备份可能包含这些记录。插件本身没有遥测，也没有作者运营的中转服务器；外部客户端和服务有各自的数据政策。

插件提供阅读讨论，不提供改写笔记的操作。它向客户端传递工具限制，但不构成独立的系统安全沙箱；客户端原有的 hooks、扩展、账号及自定义服务配置仍可能生效。完整说明、服务隐私链接及删除方法见 [PRIVACY.md](PRIVACY.md)。

## 已知边界

- 当前为中文界面；图片、PDF、附件和双链目标不会自动作为输入展开。
- 长文不被插件静默截断，但仍受模型上下文长度限制。
- 同时只生成一条回答。客户端历史被删除后，可能需要新建对话。
- 实机验收覆盖主窗口；弹出窗口、Intel Mac 和第三方主题仍需要更多公开测试。
- 找不到客户端或登录失败时，先在客户端直接验证，再检查插件设置的完整路径。

[测试记录](VALIDATION.md) · [更新日志](CHANGELOG.md) · [MIT 许可证](LICENSE)

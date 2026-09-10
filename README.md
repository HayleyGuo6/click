# 一会儿 · Click

个人对话训练试用版。需求来源：上级目录《一会儿-Site需求说明.md》。

- `app/click-app.tsx`：场景、逐节点文字反馈、历史和对照界面。
- `app/api/`：身份校验、按用户隔离的 D1 记录及模型调用；兼容旧附件读取与删除。
- `lib/model.ts`：模型服务选择、Responses API 调用、结构校验和错误分类；默认 DeepSeek。
- `lib/server.ts`：网站身份与记录共用逻辑。
- `db/schema.ts` / `drizzle/`：数据库结构与迁移。

默认使用 `AI_PROVIDER=deepseek`、`DEEPSEEK_MODEL=deepseek-flash`，向固定的 `https://api.deepseek.com/responses` 发送请求。没有 `DEEPSEEK_API_KEY` 时，仅运行明确标注的预设示例，不回退到旧的 OpenAI 密钥。配置后场景、节点参考、对方回复和复盘通过 DeepSeek 生成。每次调用将当前练习所需的文字上下文发送给选定服务；录音不发送给 DeepSeek。

当前版本仅支持文字训练（2026-09-11 用户确认）。录音、转写、回听与朗读入口已移除；`POST /api/audio` 返回 410，新回答拒绝音频附件。旧录音数据未被删除，保留已鉴权的历史附件读取及关联删除逻辑。

如将来明确切回原服务，可设置 `AI_PROVIDER=openai`；服务的密钥不会混用。`configured` 表示密钥已配置，实际额度和连通性仍需真实请求验证。

## 运行

使用已安装的 pnpm：`pnpm dev`。生产构建：`pnpm build`。
配置项见 `.env.example`；生产密钥只写入 Sites secret。不要提交 `.env`、本地录音或数据库。

## 验证

`tsc --noEmit` 和 `pnpm build`。
`python3 scripts/check_flow.py` 仅针对 localhost 的无模型连接测试环境，创建并清理自身测试记录；不得用于真实训练验收。它检查节点顺序、重答、冲突、分支、独立记录及语音上传关闭。
网页公开两个 WebMCP 接口：读取当前练习、打开已有记录。已验证注册、有效导航和无效参数拒绝。

`node --experimental-strip-types --test scripts/check_model.mjs` 验证供应商隔离、结构错误及计费错误分类，使用模拟响应，不发送真实数据、不产生模型费用。

`python3 scripts/check_live_text.py` 使用本地已配置的 DeepSeek 服务进行真实文字流程验收，产生少量 API 调用，仅使用虚构场景并清理自身测试会话。2026-09-11 已通过这项真实检查。反馈新增 `answerQuote`，服务端核对它是否逐字属于本次回答；检查失败时保留原答并提示重试。真实体验质量还需要本人持续试用。

DeepSeek 官方接入与兼容性依据（2026-09-11）：
- https://api-docs.deepseek.com/
- https://api-docs.deepseek.com/guides/responses_api/
- https://api-docs.deepseek.com/guides/thinking_mode/

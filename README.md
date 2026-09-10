# 一会儿 · Click

个人对话训练试用版。需求来源：上级目录《一会儿-Site需求说明.md》。

- `app/click-app.tsx`：场景、逐节点反馈、录音、历史和对照界面。
- `app/api/`：身份校验、按用户隔离的 D1 记录、R2 录音及模型调用。
- `lib/model.ts`：模型服务选择、Responses API 调用、结构校验和错误分类；默认 DeepSeek。
- `lib/server.ts`：网站身份与记录共用逻辑。
- `db/schema.ts` / `drizzle/`：数据库结构与迁移。

默认使用 `AI_PROVIDER=deepseek`、`DEEPSEEK_MODEL=deepseek-flash`，向固定的 `https://api.deepseek.com/responses` 发送请求。没有 `DEEPSEEK_API_KEY` 时，仅运行明确标注的预设示例，不回退到旧的 OpenAI 密钥。配置后场景、节点参考、对方回复和复盘通过 DeepSeek 生成。每次调用将当前练习所需的文字上下文发送给选定服务；录音不发送给 DeepSeek。

语音转写与文字模型分别启用：默认 `TRANSCRIPTION_PROVIDER=none`，支持录音保存和回听，提交时需要用户补充对应文字。原 OpenAI 转写仅在明确设置 `TRANSCRIPTION_PROVIDER=openai` 且配置对应密钥后使用。目前不评价音频语气。文字模型连接状态不能代表自动转写可用。

如将来明确切回原服务，可设置 `AI_PROVIDER=openai`；服务的密钥不会混用。`configured` 表示密钥已配置，实际额度和连通性仍需真实请求验证。

## 运行

使用已安装的 pnpm：`pnpm dev`。生产构建：`pnpm build`。
配置项见 `.env.example`；生产密钥只写入 Sites secret。不要提交 `.env`、本地录音或数据库。

## 验证

`tsc --noEmit` 和 `pnpm build`。
`python3 scripts/check_flow.py` 仅针对 localhost 的无模型连接测试环境，创建并清理自身测试记录；不得用于真实训练验收。它检查节点顺序、重答、冲突、分支、独立记录和音频字节一致性。
网页公开两个 WebMCP 接口：读取当前练习、打开已有记录。已验证注册、有效导航和无效参数拒绝。

`node --experimental-strip-types --test scripts/check_model.mjs` 验证供应商隔离、独立转写开关、结构错误及计费错误分类，使用模拟响应，不发送真实数据、不产生模型费用。

真实 DeepSeek 调用、动态场景质量与语音转写需要配置对应服务后另行验证。

DeepSeek 官方接入与兼容性依据（2026-09-11）：
- https://api-docs.deepseek.com/
- https://api-docs.deepseek.com/guides/responses_api/
- https://api-docs.deepseek.com/guides/thinking_mode/

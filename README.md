# 一会儿 · Click

个人对话训练试用版。需求来源：上级目录《一会儿-Site需求说明.md》。

- `app/click-app.tsx`：场景、逐节点反馈、录音、历史和对照界面。
- `app/api/`：身份校验、按用户隔离的 D1 记录、R2 录音及模型调用。
- `lib/server.ts`：OpenAI Responses API 与服务端共用逻辑。
- `db/schema.ts` / `drizzle/`：数据库结构与迁移。

没有 `OPENAI_API_KEY` 时，仅运行明确标注的预设示例；不声称分析了任意输入。连接后，场景、节点参考和对方回复通过 OpenAI 生成。语音转写使用独立端点；目前不评价音频语气。

## 运行

使用已安装的 pnpm：`pnpm dev`。生产构建：`pnpm build`。
配置项见 `.env.example`；生产密钥只写入 Sites secret。不要提交 `.env`、本地录音或数据库。

## 验证

`tsc --noEmit` 和 `pnpm build`。
`python3 scripts/check_flow.py` 仅针对 localhost 的无模型连接测试环境，创建并清理自身测试记录；不得用于真实训练验收。它检查节点顺序、重答、冲突、分支、独立记录和音频字节一致性。
网页公开两个 WebMCP 接口：读取当前练习、打开已有记录。已验证注册、有效导航和无效参数拒绝。

真实模型调用、动态场景质量与语音转写需要接通 OpenAI 后另行验证。

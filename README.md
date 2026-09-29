# dsh-kimi-code-oauth

DSH 的 Kimi Code 订阅 OAuth 插件。默认文档语言为中文，Web 设置界面会跟随 DSH 的中英文语言设置，并使用当前主题配色。

## 功能

- 仅支持 Kimi Code 订阅，不包含其他供应商。
- 使用设备码登录，不需要粘贴 API Key。
- 仅暴露 `kimi-code-oauth` 模型路由。
- 请求使用 `Authorization: Bearer`，不会发送 `x-api-key`。
- 凭据保存在 `${DSH_HOME}/kimi-code-oauth.json`。

## 使用

```bash
pnpm install
pnpm run build
node lib/bin.js login
```

检查登录状态：

```bash
node lib/bin.js status
```

退出登录：

```bash
node lib/bin.js logout
```

## English

This is a standalone DeepSeek Harness plugin for Kimi Code subscription OAuth. The Web settings surface follows the DSH language and theme automatically. It uses device-code login, exposes only `kimi-code-oauth`, and sends Bearer authentication without an `x-api-key` header.

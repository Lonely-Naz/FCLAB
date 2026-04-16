# FCLAB 个人网站

## 项目结构

- `index.html`：首页
- `about.html`：关于我
- `portfolio.html`：作品集
- `thoughts.html`：AI 随想录
- `assets/css/theme.css`：全站共享样式
- `assets/js/main.js`：全站基础脚本（如动态年份）

## 使用方式

1. 直接双击 `index.html` 预览。
2. 或在当前目录启动静态服务后访问首页。

如果要启用飞书知识库 AI 问答，请使用后端服务启动：

```bash
npm start
```

然后访问 `http://localhost:3000`。

## 飞书知识库接入

1. 复制 `.env.example` 为 `.env`。
2. 填入飞书开放平台应用的 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。
3. 选择一种同步来源：
   - `FEISHU_WIKI_NODE_TOKENS`：同步指定 Wiki 节点。
   - `FEISHU_WIKI_SPACE_ID`：同步整个 Wiki 空间，可用 `FEISHU_WIKI_ROOT_NODE_TOKEN` 限制根节点。
   - `FEISHU_DOCX_DOCUMENT_IDS`：同步指定新版文档 ID。
4. 执行同步：

```bash
npm run sync:feishu
```

5. 启动后端：

```bash
npm start
```

首页聊天框会优先请求 `/api/ask`，后端会基于本地已同步的飞书知识库进行 RAG 检索。

## API

- `GET /api/health`：服务健康检查。
- `GET /api/kb/status`：查看知识库同步状态。
- `POST /api/sync/feishu`：同步飞书知识库，需要请求头 `x-sync-secret`。
- `POST /api/ask`：公开问答接口，请求体为 `{ "question": "..." }`。

## 说明

- 采用统一视觉主题与导航结构。
- 页面均已互相链接，可作为完整静态站点直接部署。
- 当前后端不依赖第三方 npm 包，Node.js 版本需 `>=18`。

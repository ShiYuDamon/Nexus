## Nexus - 协同富文本编辑器

Nexus 是一个基于 React + Vite 与 NestJS 的协同富文本块编辑器，采用 Nx 管理的 Monorepo 架构，内置实时协作（Yjs + y-websocket）、版本历史、评论与工作区管理。

### 技术栈

- 前端：React 19、Vite、TailwindCSS、Zustand
- 后端：NestJS 10、Prisma、PostgreSQL
- 实时协作：Yjs、y-websocket（独立进程）
- Monorepo：Nx、pnpm workspaces

---

## 项目结构

- `apps/web`：前端应用（Vite）
- `apps/server`：后端应用（NestJS）
- `packages/common`：通用 DTO/类型
- `packages/editor`：富文本块编辑器组件库
- `packages/database`：Prisma Schema 与数据库工具

---

## 环境要求

- Node.js ≥ 18（推荐 20）
- pnpm ≥ 9（仓库内声明为 10，可自动安装）
- PostgreSQL ≥ 14
- Git、Docker（可选，用于本地数据库）

---

## 快速开始

### 1) 克隆与安装

```bash
git clone <repository-url>
cd nexus_main
pnpm install
```

### 2) 启动数据库（可选：使用 Docker）

```bash
docker compose up -d   # 或 docker-compose up -d
```

服务包含：

- Postgres: `localhost:5432`（user: postgres / password: password / db: nexus）

### 3) 环境变量配置

项目会从进程环境读取配置。常用变量：

- `PORT`：后端服务端口（默认 `3000`）
- `JWT_SECRET`：JWT 密钥（默认 `nexus-development-secret-key`）
- `JWT_EXPIRES_IN`：访问令牌有效期（默认 `1d`）
- `REFRESH_TOKEN_EXPIRES_IN`：刷新令牌有效期（默认 `7d`）
- `DATABASE_URL`：Prisma 数据库连接串（形如 `postgresql://postgres:password@localhost:5432/nexus?schema=public`）
- `HOST`、`PORT`（Yjs WebSocket 进程使用，默认 `localhost:1234`）

建议创建 `.env` 并在终端导入，或使用你的进程管理器/IDE 进行注入。你也可以参考示例变量（在仓库根目录创建 `.env.example`，内容类似以下）：

```
PORT=3000
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_EXPIRES_IN=7d
DATABASE_URL=postgresql://postgres:password@localhost:5432/nexus?schema=public
# Yjs 进程可单独使用 HOST/PORT（默认 localhost:1234）
#HOST=localhost
#PORT=1234
```

### 4) 初始化数据库（Prisma）

```bash
pnpm db:generate
pnpm db:push      # 或者 pnpm db:migrate（开发阶段）
```

### 5) 一键本地开发

```bash
pnpm dev
```

这将并发启动：

- Web（Vite，`http://localhost:4200`）
- Server（NestJS，默认 `http://localhost:3000`）
- Yjs WebSocket（`ws://localhost:1234`）

前端已在 `apps/web/vite.config.ts` 中配置了代理：

```ts
proxy: { '/uploads': { target: 'http://localhost:3000', changeOrigin: true, secure: false } }
```

---

## 常用命令

- 开发：`pnpm dev`
- 单独启动：`pnpm dev:web`、`pnpm dev:server`、`pnpm dev:yjs`
- 构建全部：`pnpm build`
- 构建单项：`pnpm build:web`、`pnpm build:server`
- 预览前端产物：`pnpm web:preview`
- 生产启动（本地）：`pnpm start:prod`（先构建，再同时启动 API/前端预览/Yjs）
- 数据库：`pnpm db:generate`、`pnpm db:push`、`pnpm db:migrate`

> 亦可直接使用 Nx：`pnpm nx serve <project>` / `pnpm nx build <project>` / `pnpm nx run-many ...`

---

## 开发说明

- 静态资源：后端会将仓库根目录下 `uploads/` 目录以 `/uploads/` 路径暴露。
- WebSocket：协作编辑使用独立的 y-websocket 进程，默认 `ws://localhost:1234`。
- 代码风格：已配置 ESLint/Prettier（可按需扩展 `lint`、`test` 目标）。
- 构建：
  - Web：Vite 输出至 `dist/apps/web`
  - Server：通过 Nx + webpack 输出至 `dist/apps/server`

---

## 项目特性

- 实时协作编辑（Yjs）
- 富文本块编辑（自研编辑器库）
- 用户与权限
- 工作区/文档管理
- 版本历史与评论

---


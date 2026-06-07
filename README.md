# AI 英语口语陪练 MVP

七牛云 AI 英语口语教练本地开发与联调指南。当前版本默认使用 **mock ASR / LLM / TTS**，无需真实云服务 API Key，即可跑通完整主流程。

## 项目结构

```text
apps/
  api/          # FastAPI 后端
  web/          # Next.js 前端
infra/
  docker-compose.yml   # MySQL / RabbitMQ / MinIO 本地依赖
.env.example           # 环境变量模板（复制后按需设置）
packages/contracts/    # OpenAPI 契约（如有）
docs/                  # 详细设计与联调记录
```

## 前置条件

| 工具 | 版本建议 | 用途 |
|---|---|---|
| Python | 3.11+ | API、DB 初始化、Playwright 自动拉起 API |
| Node.js | 20+ | Web 开发与 E2E |
| npm | 10+ | 安装前端依赖 |
| Docker Desktop | 20.10+ | 启动 MySQL / RabbitMQ / MinIO（完整联调） |
| Git | 任意 | 克隆仓库 |

> API 进程不会自动读取 `.env` 文件，环境变量需在启动终端中显式设置。`.env.example` 作为变量清单与默认值参考。

---

## 快速启动（SQLite，推荐新人首跑）

不依赖 Docker，适合前端开发、接口联调与 Playwright E2E。API 默认使用 `apps/api/dev.db`。

### 1. 安装 API 依赖并初始化数据库

```powershell
cd apps/api
python -m pip install -e .
python -m src.scripts.init_db
python -m src.scripts.seed_scenarios
```

期望输出：

```text
Database tables are ready.
Seeded 3 scenarios.
```

### 2. 启动 API

```powershell
# 仍在 apps/api 目录
python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

验证：浏览器或 curl 访问 <http://127.0.0.1:8000/health>，应返回 `{"status":"ok"}`。

可选：带鉴权拉取场景列表（需先匿名登录获取 token）：

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/auth/anonymous `
  -H "Content-Type: application/json" `
  -d '{"anonymous_id":"demo-device","anonymous_secret":"demo-secret"}'
```

### 3. 启动 Web

新开一个终端：

```powershell
cd apps/web
npm install
npm run dev
```

访问 <http://127.0.0.1:3000>，首页应展示 3 个场景（英文面试、餐厅点餐、项目会议）。

> 本地开发默认通过 Next.js 将 `/api/v1` 代理到 `http://127.0.0.1:8000`。若 API 端口不同，可设置 `API_PROXY_ORIGIN=http://127.0.0.1:<port>` 后重启 `npm run dev`。

---

## 完整本地环境（Docker Compose）

需要与生产更接近的 MySQL / 消息队列 / 对象存储时，先启动依赖服务，再启动 API 与 Web。

### 1. 准备环境变量

在仓库根目录：

```powershell
# PowerShell
Copy-Item .env.example .env
```

```bash
# Git Bash / macOS / Linux
cp .env.example .env
```

`.env` 中关键项已与 `infra/docker-compose.yml` 默认凭据对齐，一般无需修改。使用 MySQL 时需在 API 环境安装驱动：

```powershell
cd apps/api
python -m pip install -e .
python -m pip install pymysql
```

### 2. 启动 MySQL / RabbitMQ / MinIO

在仓库根目录：

```powershell
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps
```

| 服务 | 容器名 | 端口 | 用途 |
|---|---|---|---|
| mysql | ai-coach-mysql | 3306 | 业务数据库 `conversation_coach` |
| rabbitmq | ai-coach-rabbitmq | 5672 / 15672 | 报告任务队列 / 管理台 |
| minio | ai-coach-minio | 9000 / 9001 | S3 兼容对象存储 / 控制台 |
| minio-init | ai-coach-minio-init | — | 一次性创建私有 bucket |

管理入口：

- RabbitMQ：<http://127.0.0.1:15672>（`coach` / `coach_dev`）
- MinIO：<http://127.0.0.1:9001>（`minioadmin` / `minioadmin`）

停止服务（保留数据卷）：

```powershell
docker compose -f infra/docker-compose.yml down
```

### 3. 初始化 DB 并 seed 场景

```powershell
cd apps/api

$env:DATABASE_URL = "mysql+pymysql://coach:coach_dev@127.0.0.1:3306/conversation_coach?charset=utf8mb4"
$env:AI_PROVIDER = "mock"
$env:REPORT_WORKER_MODE = "sync"
$env:JWT_SECRET = "dev-only-change-me-before-production"

python -m src.scripts.init_db
python -m src.scripts.seed_scenarios
```

### 4. 启动 API（MySQL 模式）

```powershell
# 同上环境变量保持生效
python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

### 5. 启动 Web

```powershell
cd apps/web
$env:NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000/api/v1"
npm run dev
```

---

## Mock Provider 说明

MVP 阶段 **默认不接真实 ASR / LLM / TTS**，通过 mock provider 返回固定或可预测的联调数据：

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `AI_PROVIDER` | `mock` | 启用 mock 对话链路 |
| `ASR_PROVIDER` | 空 | 留空即走 mock ASR |
| `TTS_PROVIDER` | 空 | 留空即走 mock TTS |
| `REPORT_WORKER_MODE` | `sync` | 报告在 API 进程内同步生成，无需单独起 Worker |

Mock 行为摘要：

- **ASR**：接收任意音频，返回固定 transcript（面试场景为 *"My name is Alex. I worked on a shopping app."*），`asr_confidence=0.91`
- **LLM**：按场景与轮次返回短句角色回复
- **TTS**：返回静态音频 URL；无音频文件时 `audio_url=null`，前端文本降级展示
- **Report**：返回固定结构化报告（总分 76、4 项细分、发音/表达建议各 1 条）

低置信度调试：设置 `MOCK_ASR_LOW_CONFIDENCE=true` 或使用 `low_confidence` 相关 mock 音频文件名触发。

---

## 手动演示主流程

API 与 Web 均启动后，按以下路径自测：

1. 打开 <http://127.0.0.1:3000>，确认 3 个场景卡片可见
2. 点击「英文面试」→ 开练确认页 →「开始练习」
3. 进入练习页，「按住说话」录音后松开（mock ASR 返回识别文本）
4. 在「识别结果」面板点击「确认」，等待 mock AI 回复展示
5. 点击「结束练习」→ 确认结束，跳转报告页
6. 报告页查看总分与细分 →「查看改进建议」
7.「打开练习历史」→ 点击最近练习 → 查看历史详情与报告入口

---

## Playwright 测试

E2E 在 `apps/web` 下运行。`playwright.config.ts` 会自动：

1. 用 SQLite 初始化测试库并 seed 3 个场景
2. 拉起 API（`:8000`）与 Web（`:3000`）
3. 注入 mock 录音 fixture，避免真实麦克风依赖

### 安装浏览器（首次）

```powershell
cd apps/web
npm install
npx playwright install chromium
```

### 冒烟测试（首页可访问）

```powershell
npm run test:e2e:smoke
```

覆盖：`e2e/smoke/home.spec.ts` — 首页标题与主标题可见。

### 主流程 E2E（mock 全链路）

```powershell
npm run test:e2e:main-flow
```

覆盖：`e2e/main-flow/mock-practice.spec.ts` — 选场景 → 开练 → mock 录音上传 → 确认 → AI 回复 → 结束 → 报告 → 改进详情 → 历史。

### 运行全部 E2E

```powershell
npm run test:e2e
```

### 复用已启动的 API / Web（加快调试）

若本地已手动启动服务，可跳过 Playwright 内置 `webServer`：

```powershell
$env:PLAYWRIGHT_REUSE_SERVER = "1"
npm run test:e2e:main-flow
```

---

## 常见问题

### 端口被占用

| 端口 | 占用进程 | 处理 |
|---|---|---|
| 3000 | Next.js dev | 换端口：`npm run dev -- --port 3001`，并同步 `PLAYWRIGHT_BASE_URL` |
| 8000 | uvicorn | 换端口启动 API，并更新 `NEXT_PUBLIC_API_BASE_URL` |
| 3306 / 5672 / 9000 | Docker 依赖 | 修改 `infra/docker-compose.yml` 左侧宿主机映射，并同步 `.env` 中连接串 |

### 首页显示「无法连接服务」或 Web 请求 404

- 确认 API 已启动且 `http://127.0.0.1:8000/health` 返回 `ok`
- 默认无需设置 `NEXT_PUBLIC_API_BASE_URL`；Web 会将 `/api/v1` 代理到本地 API
- 若 API 使用非 8000 端口，设置 `API_PROXY_ORIGIN=http://127.0.0.1:<port>` 并重启 `npm run dev`
- 若改为直连 API（设置 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1`），请用与 API 一致的 host（建议统一 `127.0.0.1`），避免 `localhost` 与 `127.0.0.1` 混用触发跨域
- API 侧确认 `JWT_SECRET` 在同一环境保持一致，避免 token 校验失败

### 数据库未初始化 / 场景列表为空

```powershell
cd apps/api
python -m src.scripts.init_db
python -m src.scripts.seed_scenarios
```

- SQLite 模式：检查 `apps/api/dev.db` 是否生成
- MySQL 模式：确认 Docker MySQL healthy，且已 `pip install pymysql`，`DATABASE_URL` 使用 `mysql+pymysql://...`

### 报告一直 pending

结束练习后报告应先进入 `pending`，随后在 mock 模式下很快变为 `completed`。

| 原因 | 处理 |
|---|---|
| `REPORT_WORKER_MODE=async` 但未启动消费者 | MVP 请保持 `REPORT_WORKER_MODE=sync` |
| API 进程异常退出 | 查看 API 终端报错，重启 API 后重新结束练习 |
| 数据库连接中断 | 检查 `DATABASE_URL` 与 MySQL 容器状态 |

### Playwright 启动失败

- 确认 `apps/api` 已 `pip install -e .`，且本机 `python` 在 PATH 中
- 首次运行需 `npx playwright install chromium`
- Windows 下建议在项目目录使用 PowerShell 或 Git Bash 执行，避免路径问题

### Docker 无法启动

- 确认 Docker Desktop 已运行
- 静态校验 compose 文件：`docker compose -f infra/docker-compose.yml config`

---

## 设计文档

- [AI 英语口语陪练 MVP 方案](design-drafts/AI英语口语陪练MVP方案.md)
- [AI 英语口语陪练 MVP 详细设计说明](docs/详细设计/00-详细设计说明.md)
- [五人并行开发任务拆分](docs/详细设计/08-五人并行开发任务拆分.md)

## 本地依赖环境（E-02）

MySQL、RabbitMQ、MinIO 通过 Docker Compose 启动：

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d
```

完整步骤、默认凭据与验证命令见 [E-02 本地依赖环境启动说明](docs/联调记录/E-02-本地依赖环境启动说明.md)。

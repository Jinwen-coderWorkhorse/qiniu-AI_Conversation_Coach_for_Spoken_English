# AI 英语口语陪练 MVP

> 七牛云黑客松参赛作品 · 场景化 AI 口语训练工具：沉浸式角色扮演 + 按住说话 + 课后结构化反馈

---

## Demo 视频（评委请先看）

**在线观看（推荐）：** [▶ B 站 Demo 视频](https://www.bilibili.com/video/BV1uJE862EuC/) — 完整演示产品功能、系统架构与开发过程

> 本地备份：`docs/demo/project-demo.mp4`（Markdown 预览可播放；GitHub 网页请点上方 B 站链接观看）

**本地预览**（在 Cursor / VS Code 打开本 README 并启用 Markdown 预览可播放；GitHub 网页不支持内嵌大视频，mp4 已加入 `.gitignore`）：

<video src="docs/demo/project-demo.mp4" controls width="960">
  您的浏览器不支持内嵌播放。请<a href="docs/demo/project-demo.mp4">下载 Demo 视频</a>，或观看上方 B 站链接。
</video>

| 时间轴 | 内容 |
|---|---|
| 0:00 | 开场：产品定位 + 工程亮点 |
| 1:15 | 场景选择与开练确认 |
| 2:10 | 实时语音对话（英文面试场景全流程） |
| 4:30 | 结束练习 → 课后结构化报告 |
| 5:30 | 练习历史与进步追踪 |
| 6:00 | 系统架构 & 核心链路讲解 |
| 6:45 | 开发过程：文档驱动 + 五线并行 + E2E 测试 |

---

## 评审要点对照

| 评审维度 | 权重 | 本作品对应亮点 |
|---|---|---|
| **作品完整度与创新性** | 40% | 3 个真实场景（面试 / 点餐 / 会议）完整闭环；对话中沉浸式不打断、课后集中反馈的产品设计；按住说话 + 识别确认 + 角色内 AI 回复的流畅交互 |
| **开发过程与质量** | 40% | 需求 → 总体设计 → 9 份详细设计 → 五线并行编码 → Playwright 全链路 E2E；五层清晰架构；29+ PR 可追溯；Provider Client 层可插拔，AI 服务可平滑扩展 |
| **演示与表达** | 20% | 上方 Demo 视频完整演示功能与架构；README 含架构图、链路图、文档索引，评委可快速对照 |

---

## 项目亮点

### 产品创新（完整度 & 交互）

| 亮点 | 说明 |
|---|---|
| **场景化，不是泛聊天** | 固定 3 场景 + 明确任务步骤（如面试：自我介绍 → 项目经历 → 追问 → 反问），AI 始终维持角色，不跳出教学 |
| **对话沉浸，纠错后置** | 练习页只做对话；ASR 识别后用户先确认 transcript，避免把识别错误当语法错误；评分与改进建议全部放到课后报告 |
| **完整训练闭环** | 选场景 → 开练 → 多轮语音对话 → 结束练习 → 结构化报告（总分 / 发音 / 语法 / 表达 / 流利度）→ 练习历史回看 |
| **按住说话** | RecordRTC 录音 + 波形反馈；ASR 通过 Provider Client 接入，低置信度支持重说流程 |

### 工程与开发方式（过程 & 质量）

| 亮点 | 说明 |
|---|---|
| **文档先行、契约先行** | 11 份设计文档：MVP 方案、技术方案、模块 / 表结构 / 接口 / 流程图 / 前端 / 并行任务拆分，与代码一一对应 |
| **单人 orchestrate 五线并行** | 按 [08-五人并行开发任务拆分](docs/详细设计/08-五人并行开发任务拆分.md) 拆 A–E 五条线；Cursor 开 5 个 Agent 窗口独立分支、独立 PR，通过 API 契约与 Provider 层解耦 |
| **设计 + 编码 + 测试 AI 协同** | 设计阶段 **Codex + GPT 5.5 High** 产出与迭代文档；编码与 E2E 测试阶段 **Cursor Agent** 按文档落地 |
| **可测试、可验收** | Playwright 覆盖选场景 → 开练 → 录音上传 → 确认 → AI 回复 → 结束 → 报告 → 历史全链路；本地一条命令验收 |
| **同步 / 异步分流** | 实时对话走同步 ASR → LLM → TTS；课后报告走 RabbitMQ + Celery 异步生成，体验与架构兼顾 |

---

## 系统架构

整体采用 **五层分层架构**：客户端 → 接口层 → 应用层（含 Conversation Orchestrator）→ 业务服务层 → 基础设施层。该快的链路同步做，该慢的异步做，模块边界清楚，后续替换七牛云 ASR / LLM / TTS 无需大改业务代码。

```mermaid
flowchart TB
  subgraph Client["客户端层"]
    Web["Web App / PWA<br/>页面、录音、播放、状态展示"]
  end

  subgraph Interface["接口层"]
    Router["FastAPI Routers<br/>REST API、鉴权、参数校验、响应模型"]
  end

  subgraph Application["应用层"]
    UseCase["Use Cases<br/>创建练习、上传语音、确认 turn、结束练习"]
    Orchestrator["Conversation Orchestrator<br/>ASR → LLM → TTS 单轮编排"]
    QueuePublisher["Report Task Publisher<br/>投递课后报告任务"]
  end

  subgraph Domain["业务服务层"]
    ScenarioSvc["Scenario Service<br/>固定场景和步骤"]
    SessionSvc["Practice Session Service<br/>会话状态和 turn"]
    MediaSvc["Media Service<br/>音频保存和访问路径"]
    AssessSvc["Assessment Service<br/>评分规则和报告结构"]
    HistorySvc["History Service<br/>历史与长期数据"]
  end

  subgraph Infra["基础设施层"]
    DB[("MySQL")]
    Queue[("RabbitMQ")]
    Worker["Celery Report Worker"]
    ObjectStore[("S3 / MinIO")]
    AI["ASR / LLM / TTS Provider"]
  end

  Web --> Router
  Router --> UseCase
  UseCase --> Orchestrator
  UseCase --> QueuePublisher
  UseCase --> ScenarioSvc
  UseCase --> SessionSvc
  UseCase --> HistorySvc
  Orchestrator --> ScenarioSvc
  Orchestrator --> SessionSvc
  Orchestrator --> MediaSvc
  Orchestrator --> AI
  QueuePublisher --> Queue
  Queue --> Worker
  Worker --> AssessSvc
  AssessSvc --> AI
  ScenarioSvc --> DB
  SessionSvc --> DB
  HistorySvc --> DB
  AssessSvc --> DB
  MediaSvc --> ObjectStore
```

> 详细说明见 [MVP 技术方案 §3.2](design-drafts/AI英语口语陪练MVP技术方案.md)

---

## 核心链路

系统有两条核心链路：**实时对话（同步，求快）** 与 **课后报告（异步，求全）**。

### 链路一：单轮语音对话（同步）

用户按住说话 → ASR 识别返回 transcript → 用户确认 → LLM 生成角色回复 → TTS 合成语音 → 前端播放。

```mermaid
sequenceDiagram
  participant User as 用户
  participant Web as Web App
  participant API as FastAPI Router
  participant UC as Use Case
  participant Conv as Conversation Orchestrator
  participant ASR as ASR Client
  participant LLM as LLM Client
  participant TTS as TTS Client
  participant DB as MySQL

  User->>Web: 按住说话 / 松开发送
  Web->>API: POST /user-turns
  API->>Conv: ASR 识别
  Conv->>DB: 创建 pending user turn
  API-->>Web: 返回 transcript
  User->>Web: 确认 transcript
  Web->>API: POST /turns/{id}/confirm
  API->>Conv: LLM 生成 + TTS 合成
  Conv->>DB: 保存 AI turn
  API-->>Web: 返回 AI 回复
```

关键设计：`/user-turns` 只做 ASR；`/confirm` 才进入 LLM / TTS；`client_turn_id` 保证上传幂等。

### 链路二：课后报告（异步）

用户结束练习 → 创建 pending 报告 → 投递 RabbitMQ → Celery Worker 后台评分 → 写入结构化报告。

```mermaid
sequenceDiagram
  participant Web as Web App
  participant API as Practice Router
  participant EndUC as end_session_use_case
  participant Queue as RabbitMQ
  participant Worker as Celery Worker
  participant Assess as Assessment Service
  participant LLM as LLM Client
  participant DB as MySQL

  Web->>API: POST /practice-sessions/{id}/end
  API->>EndUC: end_session_and_enqueue_report
  EndUC->>DB: session=reporting, 创建 pending report
  EndUC->>Queue: 发布 report job
  API-->>Web: 返回 report_id

  Queue-->>Worker: 消费 report job
  Worker->>DB: 读取 confirmed turns
  Worker->>Assess: 计算 metrics + 低置信降权
  Assess->>LLM: 生成结构化报告 JSON
  Assess->>DB: status=completed
  Worker-->>Web: SSE report.ready
```

> 完整时序与异常分支见 [05-核心逻辑流程图](docs/详细设计/05-核心逻辑流程图.md)

---

## 开发过程（评审参考）

| 阶段 | 文档 | 工具 / 产出 |
|---|---|---|
| 需求分析 | [MVP 产品方案](design-drafts/AI英语口语陪练MVP方案.md) | Codex + GPT 5.5 High；P0 功能表、3 场景任务链、验收标准 |
| 总体设计 | [MVP 技术方案](design-drafts/AI英语口语陪练MVP技术方案.md) | 系统架构、技术选型、模块边界、部署方案 |
| 详细设计 | [详细设计说明](docs/详细设计/00-详细设计说明.md) | 9 份文档：模块、数据表、接口、代码结构、流程图、前端、公共组件、并行任务拆分 |
| 并行编码 | [五人并行开发任务拆分](docs/详细设计/08-五人并行开发任务拆分.md) | Cursor × 5 窗口并发；`feature/a-*` ~ `feature/e-*` 分支 + 29+ PR |
| 测试验收 | 下文 [Playwright 测试](#playwright-测试) | Cursor 按设计文档编写 E2E；覆盖主流程全链路 |

> 说明：详细设计中的「五人并行」是 **模块拆分方案**。实际由一人 orchestrate，在 Cursor 中同时开 5 个 Agent 窗口分别推进 A（后端基础）、B（对话链路）、C（页面报告）、D（语音状态机）、E（集成与 E2E），通过 API 契约减少模块间等待。

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | Next.js · TypeScript · RecordRTC |
| 后端 | FastAPI · Python 3.11 · Pydantic |
| 数据 | MySQL · SQLAlchemy |
| 消息 / 任务 | RabbitMQ · Celery |
| 存储 | MinIO（S3 兼容） |
| AI 能力 | ASR / LLM / TTS（Provider Client 层，可对接七牛云等服务） |
| 测试 | Playwright E2E · pytest |

---

## AI 语音模型接入（ASR / LLM / TTS）

三类 AI 能力通过 **Provider Client 层**统一接入，业务编排（`Conversation Orchestrator`、报告 Worker）只依赖标准接口，不直接耦合具体厂商 SDK。切换或混用七牛云、OpenAI 等服务商时，**只需改环境变量或在 Provider 层新增实现**，上层 Use Case 与前端无需改动。

### 各模型职责与调用时机

| 能力 | 作用 | 何时调用 | 后端入口 |
|---|---|---|---|
| **ASR**（语音识别） | 将用户录音转为 transcript，并返回置信度、语速、停顿等指标 | 用户松手上传语音后（`POST /practice-sessions/{id}/user-turns`） | `infrastructure/providers/asr_client.py` |
| **LLM**（对话） | 根据场景角色、当前步骤和对话上下文，生成 AI 角色内回复 | 用户确认 transcript 后（`POST /practice-sessions/{id}/turns/{turn_id}/confirm`） | `infrastructure/providers/llm_client.py` |
| **TTS**（语音合成） | 将 AI 回复文本合成为音频，供前端播放 | 同上 confirm 链路，LLM 返回文本之后 | `infrastructure/providers/tts_client.py` |
| **LLM**（报告） | 汇总整段对话 transcript 与 ASR 指标，输出结构化课后报告 JSON | 用户结束练习后，Report Worker 异步执行 | `domain/services/assessment_service.py` → `llm_client.py` |

对应链路：

```text
按住说话 → ASR 识别 → 用户确认 → LLM 生成回复 → TTS 合成语音 → 播放
结束练习 → LLM 生成报告 → 写入 assessment_reports
```

### 环境变量

在仓库根目录复制 `.env.example` 为 `.env`，或在启动 API 的终端中设置以下变量（API 进程**不会自动加载** `.env` 文件，需显式 export / `$env:`）：

| 环境变量 | 说明 |
|---|---|
| `AI_PROVIDER` | **LLM** 使用的 Provider 标识；`ASR_PROVIDER` / `TTS_PROVIDER` 留空时，ASR 与 TTS 也沿用此值 |
| `ASR_PROVIDER` | 可选，单独指定 ASR Provider（优先级高于 `AI_PROVIDER`） |
| `TTS_PROVIDER` | 可选，单独指定 TTS Provider（优先级高于 `AI_PROVIDER`） |
| `LLM_API_KEY` | 大模型 API 密钥 |
| `ASR_API_KEY` | 语音识别 API 密钥 |
| `TTS_API_KEY` | 语音合成 API 密钥 |
| `PROVIDER_MAX_RETRIES` | Provider 调用失败时的重试次数，默认 `2` |

**混用示例**（ASR、LLM、TTS 来自不同厂商）：

```powershell
$env:ASR_PROVIDER = "qiniu-asr"
$env:AI_PROVIDER = "qiniu-llm"      # LLM 对话 + 报告
$env:TTS_PROVIDER = "qiniu-tts"
$env:ASR_API_KEY = "your-asr-key"
$env:LLM_API_KEY = "your-llm-key"
$env:TTS_API_KEY = "your-tts-key"
```

### 本地开发（默认，无需 API Key）

不设置上述变量时，API 使用内置本地 Provider，可直接跑通「选场景 → 录音 → 识别 → 确认 → AI 回复 → 报告 → 历史」全链路，适合黑客松演示与 E2E 测试。

```powershell
cd apps/api
python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

### 接入七牛云 / 第三方真实服务

1. 在 [七牛云控制台](https://portal.qiniu.com/) 开通 ASR、大模型、TTS 能力并获取 API Key。
2. 设置环境变量（见上表），将 `AI_PROVIDER` / `ASR_PROVIDER` / `TTS_PROVIDER` 改为你的实现标识。
3. 在 `apps/api/src/infrastructure/providers/` 下实现对应 Client，并在工厂方法中注册：

| 文件 | 需实现的接口 |
|---|---|
| `asr_client.py` | `transcribe(audio_file, mime_type, ...) -> AsrResult` |
| `llm_client.py` | `generate_reply(context) -> LlmReplyResult`；`generate_report(prompt, context) -> dict` |
| `tts_client.py` | `synthesize(text, voice) -> TtsResult` |

统一返回结构（详见 [07-公共基础组件详细设计 §5](docs/详细设计/07-公共基础组件详细设计.md)）：

| Client | 返回字段 |
|---|---|
| ASR | `transcript`、`confidence`、`word_confidences`、`speech_rate_wpm`、`pause_count`、`duration_ms` |
| LLM 对话 | `text`（角色内回复纯文本） |
| LLM 报告 | JSON dict，经 `ReportSchema` 校验后入库 |
| TTS | `audio_bytes`、`mime_type`、`duration_ms` |

**扩展示例**（在 `_build_asr_client()` 中注册七牛云实现）：

```python
def _build_asr_client() -> AsrClient:
    settings = get_settings()
    provider = settings.asr_provider or settings.ai_provider
    if provider == "qiniu-asr":
        return QiniuAsrClient(api_key=os.getenv("ASR_API_KEY"))
    # 按 provider 标识继续扩展 openai-whisper、azure 等
    return LocalAsrClient()  # 本地默认实现
```

LLM、TTS 同理在 `llm_client.py`、`tts_client.py` 的 `_build_*_client()` 中扩展。Orchestrator、Assessment Service、前端页面**均无需修改**。

### 容错与降级

| 场景 | 系统行为 |
|---|---|
| ASR 调用失败 | 返回 `ASR_FAILED`（502），前端提示重试上传 |
| ASR 低置信（< 0.65） | 返回 transcript 但标记 `needs_retry`，建议用户重说 |
| LLM 对话失败 | 优先使用场景兜底追问（如 *Could you tell me more?*）；兜底也失败则返回 `LLM_FAILED` |
| TTS 失败 | 仍返回 AI 文本，`audio_url` 为空，前端文本降级展示，用户可继续下一轮 |
| LLM 报告失败 | 报告状态变为 `failed`，可重新触发或查看错误信息 |

Provider 超时、429、5xx 会自动重试（最多 `PROVIDER_MAX_RETRIES` 次）；4xx 参数错误不重试。

> 更多接口契约与错误码见 [03-接口详细定义](docs/详细设计/03-接口详细定义.md)、Provider 设计见 [07-公共基础组件详细设计 §5](docs/详细设计/07-公共基础组件详细设计.md)。

---

## 本地开发与联调

七牛云 AI 英语口语教练本地开发与联调指南。克隆仓库后按下方步骤启动，即可跑通完整主流程。

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

## 环境变量

除 [AI 语音模型接入](#ai-语音模型接入asr--llm--tts) 中的 Provider 配置外，以下为其他常用变量：

| 环境变量 | 说明 |
|---|---|
| `DATABASE_URL` | 数据库连接串（SQLite / MySQL） |
| `REPORT_WORKER_MODE` | `sync` 时报告在 API 进程内同步生成，无需单独起 Worker |
| `JWT_SECRET` | 鉴权密钥，本地与生产需保持一致 |
| `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET` | 音频对象存储（MinIO / 七牛云 Kodo 等 S3 兼容服务） |

完整清单与默认值见仓库根目录 [`.env.example`](.env.example)。

---

## 手动演示主流程

API 与 Web 均启动后，按以下路径自测：

1. 打开 <http://127.0.0.1:3000>，确认 3 个场景卡片可见
2. 点击「英文面试」→ 开练确认页 →「开始练习」
3. 进入练习页，「按住说话」录音后松开，等待识别文本出现
4. 在「识别结果」面板点击「确认」，等待 AI 回复展示
5. 点击「结束练习」→ 确认结束，跳转报告页
6. 报告页查看总分与细分 →「查看改进建议」
7.「打开练习历史」→ 点击最近练习 → 查看历史详情与报告入口

---

## Playwright 测试

E2E 在 `apps/web` 下运行。`playwright.config.ts` 会自动：

1. 用 SQLite 初始化测试库并 seed 3 个场景
2. 拉起 API（`:8000`）与 Web（`:3000`）
3. 注入测试录音 fixture，避免真实麦克风依赖

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

### 主流程 E2E

```powershell
npm run test:e2e:main-flow
```

覆盖：选场景 → 开练 → 录音上传 → 确认 → AI 回复 → 结束 → 报告 → 改进详情 → 历史。

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

结束练习后报告应先进入 `pending`，随后在默认配置下很快变为 `completed`。

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

# EIVA — Enterprise Intelligent Virtual Assistant

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/status-active-brightgreen?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/AI-Powered-purple?style=for-the-badge" alt="AI Powered" />
  <img src="https://img.shields.io/badge/backend-Rust%20%F0%9F%A6%80-orange?style=for-the-badge" alt="Rust Backend" />
</p>

<p align="center">
  <strong>企業級智慧虛擬助理平台 — 以 AI 驅動，整合 RustyClaw 高效能安全後端引擎，為企業打造高效率、高智能的對話式服務體驗。</strong>
</p>

---

## 📖 目錄

- [專案簡介](#-專案簡介)
- [核心功能](#-核心功能)
- [系統架構](#-系統架構)
- [技術棧](#-技術棧)
- [RustyClaw 後端引擎](#-rustyclaw-後端引擎)
- [快速開始](#-快速開始)
- [環境需求](#-環境需求)
- [安裝與設定](#-安裝與設定)
- [使用說明](#-使用說明)
- [API 文件](#-api-文件)
- [部署指南](#-部署指南)
- [安全性](#-安全性)
- [專案結構](#-專案結構)
- [貢獻指南](#-貢獻指南)
- [授權條款](#-授權條款)

---

## 🌟 專案簡介

**EIVA（Enterprise Intelligent Virtual Assistant）** 是一套專為企業設計的智慧虛擬助理解決方案。結合大型語言模型（LLM）、知識庫管理與多輪對話能力，EIVA 能夠理解企業內部業務語境，提供精準、即時的智慧服務。

EIVA 的後端核心採用 **[RustyClaw 🦀🦞](./backend/)** —— 一套以 Rust 編寫的高效能、安全優先的 AI Agent 作業系統，提供毫秒級啟動、~15MB 極低記憶體佔用，以及業界領先的多層次安全防護機制。

無論是客服自動化、內部知識查詢、流程輔助決策，還是跨系統資料整合，EIVA 都能以自然語言為橋樑，大幅降低企業的人力成本並提升運營效率。

### 🎯 設計目標

| 目標 | 說明 |
|------|------|
| **高準確率** | 基於企業私有知識庫，確保回答的精確性與可信度 |
| **安全優先** | RustyClaw 多層安全架構，防範 Prompt Injection、資料洩漏等 AI 安全威脅 |
| **易整合** | 提供標準 REST API 與 WebSocket 接口，無縫對接現有系統 |
| **高擴展性** | 模組化架構設計，支援功能插件與自定義工作流 |
| **極致效能** | Rust 後端 ~15MB RAM、<50ms 啟動，可運行於樹莓派等低資源設備 |
| **多語言支援** | 支援繁體中文、簡體中文、英文等多語言對話 |

---

## ✨ 核心功能

### 🤖 智慧對話引擎
- **多輪對話管理**：維護上下文記憶，支援跨輪次的複雜對話邏輯
- **意圖識別**：精準分析使用者意圖，觸發對應的業務流程
- **情緒分析**：即時偵測對話情緒，自動調整回應策略
- **多模態輸入**：支援文字、語音、圖片等多種輸入形式

### 📚 知識庫管理
- **RAG（檢索增強生成）**：從企業文件庫動態檢索相關知識，生成準確回答
- **向量搜尋**：高效能語義相似度搜尋，快速定位最相關內容
- **知識更新**：支援即時知識庫更新，確保資訊時效性
- **多格式解析**：支援 PDF、Word、Excel、Markdown、網頁等格式

### 🔌 系統整合
- **API 閘道**：統一管理外部系統對接，支援 REST、GraphQL、WebSocket
- **工作流引擎**：可視化流程設計，串聯多個業務系統
- **多平台訊息**：Signal、Matrix、Telegram、Discord、Slack、WhatsApp 等
- **SSO 整合**：支援 OAuth 2.0、SAML 2.0 單一登入

### 📊 分析與洞察
- **對話分析儀表板**：視覺化呈現使用者行為與對話品質指標
- **效能監控**：即時追蹤回應時間、成功率、滿意度等關鍵指標
- **A/B 測試**：支援多版本回應策略測試，持續優化效果
- **匯出報表**：自動生成週期性分析報告

---

## 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                      使用者介面層                         │
│         Web App │ Mobile App │ 第三方平台整合              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────────┐
│                     API 閘道層                            │
│          負載均衡 │ 身份驗證 │ 速率限制                    │
└──────┬──────────────────┬───────────────────────────────┘
       │                  │
┌──────▼──────┐   ┌───────▼───────┐
│  對話管理   │   │  知識庫服務   │
│  服務       │   │               │
│  - 意圖識別 │   │  - 文件解析   │
│  - 上下文   │   │  - 向量索引   │
│  - 多輪對話 │   │  - RAG 引擎   │
└──────┬──────┘   └───────┬───────┘
       │                  │
┌──────▼──────────────────▼───────┐
│   🦀 RustyClaw 後端引擎          │
│   ─────────────────────────     │
│   AI Agent OS | Rust ~15MB RAM  │
│   ─────────────────────────     │
│   LLM 推理 │ 工具執行 │ 記憶體   │
│   安全層   │ 排程器   │ 多Agent  │
└──────┬──────────────────┬───────┘
       │                  │
┌──────▼──────┐   ┌───────▼───────┐
│  資料儲存   │   │  快取層       │
│  - 關聯式DB │   │  - Redis      │
│  - 向量DB   │   │  - 會話快取   │
│  - 物件儲存 │   │  - 知識快取   │
└─────────────┘   └───────────────┘
```

---

## 🛠️ 技術棧

### 後端（RustyClaw 引擎）
| 技術 | 用途 |
|------|------|
| **Rust 1.86+ (Edition 2024)** | 核心後端語言 |
| **rustyclaw-core** | Agent 核心庫（設定、閘道、工具、安全） |
| **rustyclaw-gateway** | 獨立閘道守護程序（WebSocket 協議） |
| **rustyclaw-cli** | 命令列工具與管理介面 |
| **tokio** | 非同步執行時 |
| **genai** | 多 LLM Provider 整合 |

### 前端
| 技術 | 用途 |
|------|------|
| **React 18** | 使用者介面框架 |
| **TypeScript** | 型別安全的 JavaScript |
| **Vite** | 現代前端建置工具 |
| **Zustand** | 輕量狀態管理 |
| **TailwindCSS** | 原子化 CSS 框架 |

### AI / LLM 支援
| Provider | 模型 |
|----------|------|
| **Anthropic** | Claude Opus, Sonnet, Haiku |
| **OpenAI** | GPT-4o, o1, o3 |
| **Google** | Gemini Pro, Ultra |
| **Ollama** | 本地私有部署模型 |
| **OpenRouter** | 200+ 模型 |
| **任何 OpenAI 相容端點** | 自定義部署 |

### 基礎設施
| 技術 | 用途 |
|------|------|
| **Docker / Podman** | 容器化部署 |
| **Kubernetes** | 容器編排管理 |
| **Nginx** | 反向代理 |
| **Prometheus + Grafana** | 監控與可視化 |

---

## 🦀 RustyClaw 後端引擎

EIVA 的核心動力來自 **[RustyClaw](./backend/)** —— 一套以 Rust 打造的 **AI Agent 作業系統**，如同「Linux for AI Agents」，提供穩定、安全的基礎設施。

> 詳細文件請參閱 [`backend/README.md`](./backend/README.md)

### 為何選擇 RustyClaw？

#### ⚡ 極致效能
| 指標 | RustyClaw | Node.js Agent | Python Agent |
|------|-----------|---------------|--------------|
| **記憶體** | ~15 MB | ~150 MB | ~100+ MB |
| **啟動時間** | <50 ms | ~500 ms | ~1s+ |
| **二進位大小** | ~8 MB | ~200 MB | N/A |
| **依賴套件** | 0（單一執行檔） | node_modules | venv |

#### 🔒 多層安全防護

| 安全層 | 防護內容 |
|--------|---------|
| **PromptGuard** | 偵測 Prompt Injection 攻擊（系統覆蓋、角色混淆、越獄） |
| **LeakDetector** | 阻止 API Key、Token、SSH Key 等憑證洩漏 |
| **Sandbox 隔離** | Bubblewrap (Linux)、Landlock、sandbox-exec (macOS) |
| **SSRF 防護** | 阻擋對私有 IP、元資料端點的請求 |
| **加密保險庫** | AES-256-GCM 加密 + 可選 TOTP 雙重驗證 |
| **HTTP 請求掃描** | 驗證出站請求的 URL、標頭與內容 |

#### 🛠️ 30+ 內建工具

| 類別 | 工具 |
|------|------|
| **檔案** | `read_file`, `write_file`, `edit_file`, `list_directory`, `search_files` |
| **執行** | `execute_command`, `process`, `apply_patch` |
| **網路** | `web_fetch`, `web_search`, `browser` |
| **記憶** | `memory_search`, `memory_get` |
| **排程** | `cron`, heartbeat 系統 |
| **多 Agent** | `sessions_spawn`, `sessions_send`, `sessions_steer` |
| **憑證** | `secrets_list`, `secrets_get`, `secrets_store` |

#### 🤖 多 Agent 協作

```rust
// 生成研究 Agent
let research = spawn_agent("Summarize the latest papers on RLHF", AgentConfig {
    model: "claude-sonnet",
    timeout: Duration::minutes(10),
    ..default()
});

// 平行生成程式碼 Agent
let coder = spawn_agent("Implement the algorithm from the research", AgentConfig {
    model: "gpt-4o",
    ..default()
});

// 執行中動態調整方向
research.steer("Focus specifically on Constitutional AI approaches");
```

### RustyClaw 相關文件

| 文件 | 說明 |
|------|------|
| [`backend/README.md`](./backend/README.md) | RustyClaw 完整使用說明 |
| [`backend/ARCHITECTURE.md`](./backend/ARCHITECTURE.md) | 架構設計說明 |
| [`backend/BUILDING.md`](./backend/BUILDING.md) | 從原始碼建置指南 |
| [`backend/QUICKSTART.md`](./backend/QUICKSTART.md) | 快速上手指南 |
| [`backend/SECURITY.md`](./backend/SECURITY.md) | 安全機制詳述 |
| [`backend/docs/`](./backend/docs/) | 完整技術文件目錄 |
| [`backend/CHANGELOG.md`](./backend/CHANGELOG.md) | 版本更新記錄 |

---

## 🚀 快速開始

### 使用 Docker Compose（推薦）

```bash
# 1. 複製專案
git clone https://github.com/your-org/eiva.git
cd eiva

# 2. 複製環境設定
cp .env.example .env

# 3. 編輯設定（填入 API 金鑰等必要參數）
nano .env

# 4. 啟動所有服務（含 RustyClaw 後端）
docker compose up -d

# 5. 確認服務狀態
docker compose ps

# 6. 開啟瀏覽器
open http://localhost:3000
```

### 僅啟動 RustyClaw 後端

```bash
cd backend

# 安裝 RustyClaw
cargo install rustyclaw

# 互動式設定精靈（設定 API Key、加密保險庫、訊息平台）
rustyclaw onboard

# 啟動終端 UI
rustyclaw tui

# 或啟動閘道守護程序（供 EIVA 前端連接）
rustyclaw gateway start
```

---

## 📋 環境需求

### 最低配置
| 資源 | 需求 |
|------|------|
| CPU | 2 核心 |
| RAM | 4 GB（RustyClaw 後端僅需 ~15 MB） |
| 磁碟空間 | 10 GB |
| 作業系統 | Ubuntu 22.04 / macOS 13+ / Windows 11 (WSL2) |

### 建議配置（生產環境）
| 資源 | 需求 |
|------|------|
| CPU | 8+ 核心 |
| RAM | 16 GB |
| GPU | NVIDIA GPU（本地 Ollama 推理，可選） |
| 磁碟空間 | 100 GB SSD |

### 必要軟體
- **Rust** 1.86+（後端建置）
- **Docker** 24.0+ 與 **Docker Compose** 2.20+（容器化部署）
- **Node.js** 20.0+（前端開發）
- **Git** 2.40+

---

## ⚙️ 安裝與設定

### 1. RustyClaw 後端設定

```bash
cd backend

# 方式一：直接安裝（推薦）
cargo install rustyclaw

# 方式二：從原始碼建置
cargo build --release

# Debug 建置（快速編譯）
cargo build --workspace

# 帶完整功能建置（Matrix、瀏覽器自動化）
cargo build --release --features rustyclaw-core/full
```

#### 設定檔範例（`config.example.toml` → `~/.rustyclaw/config.toml`）

```bash
# 複製設定檔
cp backend/config.example.toml ~/.rustyclaw/config.toml

# 互動式設定
rustyclaw onboard
```

### 2. 前端設定

```bash
cd frontend

# 安裝依賴
npm install

# 設定環境變數
cp .env.example .env.local

# 啟動開發伺服器
npm run dev
```

### 3. 主要環境變數

```env
# LLM Provider 設定（二選一）
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-openai-key

# RustyClaw 閘道連線
RUSTYCLAW_GATEWAY_URL=ssh://127.0.0.1:2222

# 前端服務
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080

# 資料庫（可選，用於對話歷史持久化）
DATABASE_URL=postgresql://user:password@localhost:5432/eiva_db
REDIS_URL=redis://localhost:6379/0
```

---

## 📖 使用說明

### 透過終端 UI 對話

```bash
rustyclaw tui
```

### 透過 Web 介面對話

1. 啟動 RustyClaw 閘道：`rustyclaw gateway start`
2. 啟動 EIVA 前端：`cd frontend && npm run dev`
3. 開啟瀏覽器：`http://localhost:5173`

### Skills 技能系統

```bash
# 從 ClawHub 安裝社群技能
clawhub install claw-me-maybe    # 訊息平台整合（Beeper）
clawhub install github           # GitHub 操作
clawhub install jira             # Jira 工單管理
```

自定義技能範例：

```yaml
---
name: company-faq
description: 企業內部常見問題解答
requires:
  bins: []
  env: [KNOWLEDGE_BASE_PATH]
---

# 企業 FAQ 技能

請查閱 ${KNOWLEDGE_BASE_PATH} 中的知識庫文件，提供準確的企業政策解答。
```

### 排程自動化

```json
{
  "schedule": { "kind": "cron", "expr": "0 9 * * MON" },
  "payload": {
    "kind": "agentTurn",
    "message": "整理本週業務報告並發送至管理群組"
  }
}
```

---

## 📡 API 文件

完整 API 文件請參閱：`http://localhost:8080/docs`（Swagger UI）

RustyClaw WebSocket 協議規格：[`backend/docs/CLIENT_SPEC.md`](./backend/docs/CLIENT_SPEC.md)

### 核心 API 端點

| 方法 | 端點 | 說明 |
|------|------|------|
| `POST` | `/api/v1/chat` | 發送對話訊息 |
| `GET` | `/api/v1/sessions/{id}` | 取得對話歷史 |
| `DELETE` | `/api/v1/sessions/{id}` | 清除對話記憶 |
| `POST` | `/api/v1/knowledge/upload` | 上傳知識庫文件 |
| `GET` | `/api/v1/knowledge/search` | 語義搜尋知識庫 |
| `WS` | `/api/v1/gateway` | RustyClaw 閘道 WebSocket |
| `GET` | `/api/v1/analytics/dashboard` | 取得分析資料 |

### 回應格式

```json
{
  "success": true,
  "data": {
    "response": "根據公司政策，員工每年享有14天特休假...",
    "session_id": "sess_abc123",
    "sources": [
      {
        "document": "人事規章.pdf",
        "page": 12,
        "similarity": 0.92
      }
    ],
    "metadata": {
      "model": "claude-sonnet",
      "tokens_used": 350,
      "response_time_ms": 48,
      "backend": "rustyclaw/0.4.0"
    }
  },
  "timestamp": "2026-07-11T09:30:00Z"
}
```

---

## 🚢 部署指南

### Docker Compose 生產部署

```bash
# 使用生產設定
docker compose -f docker-compose.yml up -d

# 確認所有服務正常
docker compose ps
docker compose logs -f rustyclaw-gateway
```

### 直接部署 RustyClaw 二進位

```bash
# 編譯 Release 版本
cd backend
cargo build --release

# 部署二進位檔案
cp target/release/rustyclaw /usr/local/bin/
cp target/release/rustyclaw-gateway /usr/local/bin/

# 設定為系統服務（systemd）
sudo systemctl enable rustyclaw-gateway
sudo systemctl start rustyclaw-gateway
```

### 樹莓派 / ARM 部署

```bash
# 安裝 cross 編譯工具
cargo install cross --git https://github.com/cross-rs/cross

# 64位元（Pi 3/4/5）
cross build --release --target aarch64-unknown-linux-gnu \
  -p rustyclaw-cli --no-default-features

# 複製到設備
scp target/aarch64-unknown-linux-gnu/release/rustyclaw pi@raspberrypi:/usr/local/bin/
```

### 健康檢查

```bash
# 檢查服務狀態
curl http://localhost:8080/health

# 預期回應
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "backend": "rustyclaw/0.4.0",
#   "services": { "gateway": "ok", "llm": "ok" }
# }
```

---

## 🔒 安全性

EIVA 基於 RustyClaw 的多層安全架構，提供企業級防護：

```
使用者輸入
    │
    ▼
┌───────────────┐
│ InputValidator│ ─── 長度、編碼、填充攻擊
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  PromptGuard  │ ─── 6種注入類別，可調敏感度
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Agent      │ ─── Sandbox 沙盒隔離執行
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ LeakDetector  │ ─── 阻擋輸出/請求中的憑證資訊
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ SSRF Validator│ ─── 阻擋私有 IP、元資料端點
└───────────────┘
```

- **加密保險庫**：AES-256-GCM 加密 + 可選 TOTP 雙重驗證
- **存取控制**：基於角色的細粒度存取控制（RBAC）
- **稽核日誌**：完整記錄所有操作與對話歷史
- **私有部署**：支援完全離線本地部署，資料不離開企業環境

詳見 [`backend/SECURITY.md`](./backend/SECURITY.md) 與 [`backend/docs/SECURITY.md`](./backend/docs/SECURITY.md)。

---

## 📁 專案結構

```
eiva/
├── README.md                   # 本文件
├── Dockerfile                  # 容器建置設定
├── docker-compose.yml          # 服務編排設定
├── LICENSE                     # 授權條款
│
├── backend/                    # 🦀 RustyClaw 後端引擎
│   ├── README.md               # RustyClaw 完整說明
│   ├── Cargo.toml              # Rust Workspace 設定
│   ├── ARCHITECTURE.md         # 架構說明
│   ├── BUILDING.md             # 建置指南
│   ├── QUICKSTART.md           # 快速上手
│   ├── SECURITY.md             # 安全說明
│   ├── CHANGELOG.md            # 版本記錄
│   ├── config.example.toml     # 設定檔範例
│   ├── crates/                 # Rust Crate 模組
│   │   ├── rustyclaw-core/     # 核心庫（閘道、工具、安全）
│   │   ├── rustyclaw-cli/      # CLI 工具
│   │   ├── rustyclaw-tui/      # 終端 UI
│   │   ├── rustyclaw-gateway/  # 閘道服務
│   │   ├── rustyclaw-desktop/  # 桌面 UI
│   │   ├── rustyclaw-onboard/  # 設定精靈
│   │   ├── rustyclaw-view/     # 視圖元件
│   │   ├── rustyclaw-web/      # WASM Web 模組
│   │   ├── tokenjuice/         # Token 管理
│   │   └── memory-tree/        # 記憶樹結構
│   ├── docs/                   # 技術文件
│   ├── tests/                  # 整合測試
│   ├── scripts/                # 建置腳本
│   ├── vendor/                 # 供應商套件
│   └── legacy/                 # 歷史版本（Node.js）
│
├── frontend/                   # React 前端應用
│   ├── src/
│   ├── public/
│   └── package.json
│
└── agent/                      # AI Agent 設定與技能
```

---

## 🤝 貢獻指南

歡迎貢獻！請遵循以下流程：

1. **Fork** 此專案
2. 建立功能分支：`git checkout -b feature/amazing-feature`
3. 提交變更：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 **Pull Request**

### 後端貢獻（RustyClaw）

請先閱讀 [`backend/CONTRIBUTING.md`](./backend/CONTRIBUTING.md) 與 [`backend/STYLE_GUIDE.md`](./backend/STYLE_GUIDE.md)。

```bash
# 執行所有測試
cd backend
cargo test --workspace

# 程式碼品質檢查
cargo clippy --workspace -- -D warnings
cargo fmt --check
```

### Commit 訊息規範

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

```
feat: 新增功能
fix: 修復問題
docs: 更新文件
style: 程式碼格式調整
refactor: 重構（不影響功能）
test: 新增或修改測試
chore: 建置工具或輔助工具的變動
```

---

## 📄 授權條款

本專案採用 [MIT License](LICENSE) 授權。
RustyClaw 後端引擎同樣採用 [MIT License](./backend/LICENSE) 授權。

---

## 📞 聯絡我們

- **官方網站**：https://eiva.example.com
- **技術支援**：support@eiva.example.com
- **問題回報**：[GitHub Issues](https://github.com/your-org/eiva/issues)
- **RustyClaw 社群**：[Discord](https://discord.com/invite/clawd)

---

<p align="center">
  Made with ❤️ and 🦀 by the EIVA Team<br/>
  Powered by <a href="./backend/">RustyClaw</a> — The secure, open-source operating system for AI agents<br/>
  © 2026 EIVA — Enterprise Intelligent Virtual Assistant. All rights reserved.
</p>

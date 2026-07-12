# EIVA 系統通訊埠與 API 規格 (SPEC)

本文件定義了 EIVA (Enterprise Intelligent Virtual Assistant) 系統整合 Eiva 作為底層引擎後，對外開放的通訊埠配置、靜態檔案目錄映射與 REST API 規範。

## 1. 系統通訊埠配置 (Ports Configuration)

為了相容原先 `Eiva` (Legacy Node.js) 的架構與全端分離的除錯體驗，系統在後端啟動時將同時開啟兩個通訊埠：

| 通訊埠 | 協定 / 用途 | 說明 |
| --- | --- | --- |
| **`3000`** | SSH / WebSocket Gateway | 這是原 Eiva 的原生 Gateway 通訊埠 (原預設為 2222 / 9001)。供底層 Agent 協定通訊、終端機連線或安全隧道使用。 |
| **`39999`** | HTTP / WS (Salvo Framework) | 取代舊有 Node.js Server，以 Rust 實作的 Web API Server。負責提供前端靜態資源與前端所需的業務邏輯 REST API，並提供基於 Protobuf 的即時雙向 WebSocket 連線。 |
| **`38999`** | React 開發伺服器 | 本機開發 (Local Dev) 時使用的前端 Vite 開發伺服器 (Frontend Dev Port)。 |

## 2. Web 靜態資源目錄映射

前端 Vite SPA (`frontend/`) 打包後的檔案，將存放於後端專案結構中，並透過 Salvo 靜態路由對外提供。

| HTTP 路由路徑 (URL Prefix) | 實體目錄 (Physical Directory) | 用途說明 |
| --- | --- | --- |
| `/eiva/frontend/view/*` | `backend/assets/web/` | 前端 SPA 打包後的網頁資源 (`npm run build` 的預設輸出目錄)。預設會回傳 `index.html`。 |
| `/eiva/frontend/static/*` | `backend/assets/static/` | 為前端與外部服務提供的純靜態資源（共用庫、靜態圖片、Web Include 檔案等）。 |

## 3. REST API 路由規格 (版本：ver-0.95)

所有的後端業務邏輯 API 都採用以下前綴：
**`[GET/POST] http://localhost:39999/eiva/backend/api/ver-0.95/`**

此 API 層會橋接 Eiva 內建的 `TaskManager` 與 `ThreadManager` 來統一管理任務，捨棄舊有的 JSON 檔案資料庫。

### 3.1. 系統健康檢查
- **端點**: `GET /health`
- **功能**: 確認 Salvo API 伺服器是否正常運作。
- **回應**: 
  ```json
  { "ok": true }
  ```

### 3.2. 任務 (Tasks) 與 WebSocket 即時通訊
目前系統已將任務建立與中斷的操作，升級為基於 **WebSocket + Protobuf (類似 gRPC-Web 雙向傳輸)** 的架構，以達成最高效的即時推播。

- **WebSocket 端點**: `ws://localhost:39999/eiva/backend/api/ver-0.95/ws`
- **協定**: Protobuf (定義於 `backend/proto/eiva_api.proto`)
- **操作 (前端發送 `ClientMessage`)**:
  - `CreateTaskRequest`: 建立新任務 (含需求與設定檔)。
  - `StopTaskRequest`: 停止/中斷執行中的任務。
  - `Ping`: 心跳偵測。
- **即時推播 (後端發送 `ServerMessage`)**:
  - `TaskCreatedEvent` / `TaskStatusEvent`
  - `TaskLogEvent`: 任務執行過程的即時步驟紀錄。
  - `TaskCompletedEvent` / `TaskFailedEvent` / `TaskInterruptedEvent`
- *保留的 REST API*: `GET /tasks` 與 `GET /tasks/:taskId` 用以非同步取得任務列表。

### 3.3. 排程 (Schedules)
- **取得排程列表**
  - **端點**: `GET /schedules`
  - **回應**: 
    ```json
    { "schedules": [ ... ] }
    ```

---

## 4. 工作流程與節點定義 (Workflow & Nodes)

前端提供基於 React Flow 的視覺化工作流程編輯器 (`WorkflowEditor`)，允許使用者自由編排不同種類的節點。

### 4.1. 支援的節點種類
| 節點類型 (Type) | 顯示名稱 | 顏色 / 形狀 | 功能與屬性設定 |
| --- | --- | --- | --- |
| **`startNode`** | 🟢 Start (啟動) | 綠色 | 設定觸發方式 (手動、排程、Webhook)。 |
| **`agentNode`** | 🤖 Agent (代理) | 藍色 | 指派分析或處理任務，可設定使用的 AI 模型 (ModelName) 與創造力 (Temperature)。 |
| **`toolNode`** | 🔧 Tool (工具) | 橘色 | 執行特定系統工具，例如 Web Search、Fetch URL 等。 |
| **`skillNode`** | 🪄 Skill (技能) | 橘色 | 執行預先設定好的 AI Skill。屬性提供下拉選單選擇 (如 `research`, `summarize`)。 |
| **`mcpNode`** | 🔌 MCP | 橘色 | 呼叫 Model Context Protocol (MCP) 伺服器進行操作。屬性提供下拉選單選擇 (如 `fileSystem`, `database`)。 |
| **`variableNode`**| 🔤 Var (變數) | 紫色 | 宣告或設定變數。可設定「變數名稱」與「變數值」。 |
| **`calculateNode`**| ➕ Calc (計算) | 藍綠色 | 進行變數之間的數學或邏輯運算。可設定「運算式」。 |
| **`conditionNode`**| ❓ Cond (條件) | 銘黃色 (**菱形**) | 作為流程的分支點 (Decision)。可設定「判斷條件」。UI 上呈現標準流程圖的寬體菱形圖案。 |
| **`endNode`** | 🛑 End (結束) | 紅色 | 流程的終點，負責輸出最後的結果，可設定「輸出格式」(Text, JSON, Markdown)。 |
| **`basicNode`** | 📄 Basic (一般) | 灰色 | 通用型節點，預留擴充。 |

### 4.2. 變數語法 (Variable Syntax)
在工作流程中，所有動態變數的參照皆統一使用 **`${變數名稱}`** 作為標記。這套語法適用於以下欄位：
- **Prompt 指令**: `請將 ${user_input} 翻譯為英文`
- **變數值 (Value)**: `1` 或 `${other_var}`
- **運算式 (Expression)**: `${counter} + 1`
- **判斷條件 (Condition)**: `${counter} > 10`

後端引擎在執行工作流程時，會自動解析字串中的 `${...}` 並替換為對應的變數內容或進行運算。

---

*備註：舊版架構中使用的 `socket.io` 任務即時推播，已正式被原生的 WebSocket + Protobuf 二進位流傳輸取代。*

---

## 5. 系統部署與開發設定

### 5.1. Docker 容器建置

提供兩種 Docker 映像檔建置方式：

| Dockerfile | 用途 | 內容 |
| --- | --- | --- |
| `Dockerfile` | 最小化正式部署 | `eiva-gateway` binary (musl 靜態連結) + `ca-certificates` + `curl` |
| `Dockerfile-SelfService` | 含 Node.js/Python 環境 | 同上 + `nodejs`、`npm`、`python3`、`py3-pip`、`poppler-utils` |

建置腳本 `build-docker.sh`：

```bash
# 建置最小版 (預設 tag latest)
./build-docker.sh

# 建置 SelfService 版
./build-docker.sh Dockerfile-SelfService

# 自訂 Image Name 與 Tag
IMAGE_NAME=eiva ./build-docker.sh Dockerfile v1.0
```

### 5.2. Volume 掛載結構 (`./vol/`)

容器啟動時，主機端的 `./vol/` 目錄會掛載至容器內對應路徑，確保資料持久化：

| 主機路徑 | 容器路徑 | 用途 |
| --- | --- | --- |
| `eiva-data` (named volume) | `/home/eiva/.config/eiva` | 設定檔、credentials、workspace 根目錄 |
| `./vol/skills/` | `<workspace_dir>/skills` | 自訂 AI Skills（`.md` 檔案） |
| `./vol/prompts/` | `<workspace_dir>/prompts` | 提示詞範本、系統提示 |
| `./vol/files/` | `<workspace_dir>/files` | 工作區檔案 (Agent 讀寫) |
| `./vol/assets/` | `/home/eiva/assets` | 靜態資源，由 Salvo API 提供 (`/eiva/frontend/view/*`, `/eiva/frontend/static/*`) |

### 5.3. Docker Compose 啟動

```bash
# 啟動背景服務
docker compose up -d

# 查看即時日誌
docker compose logs -f

# 停止並清除
docker compose down
```

### 5.4. 環境變數與 `.env` 載入

#### `.env` 自動載入

後端啟動時透過 `dotenvy` 自動搜尋並載入 `.env` 檔案。搜尋規則為從 `cwd` 往上逐層尋找第一個 `.env` 檔案，找到後將所有 `KEY=VALUE` 變數注入 process 環境（**不覆蓋**已存在的環境變數）。

載入流程：
1. `dotenvy::dotenv()` 在 `logging::init_from_env()` 之前執行（確保 `RUST_LOG` 可被讀入）
2. 以 `tracing::debug!` 記錄完整路徑與每筆 `key=value`（含行號）
3. 同時以 `println!` 輸出至 terminal 供確認

**Terminal 輸出範例**：
```
  ✅ .env loaded: /path/to/backend/.env
     RUSTYCLAW_MODEL_API_KEY=sk-xxx
     RUSTYCLAW_VAULT_PASSWORD=secret
     RUST_LOG=eiva=debug
```

**注意**：`.env` 包含敏感憑證，已加入 `.gitignore`，不可提交至版本控制。範本檔案為 `backend/.env.example`。

#### 環境變數一覽

| 變數 | 預設值 | 說明 |
| --- | --- | --- |
| `RUSTYCLAW_LOG` | `eiva=info` | Rust 後端的日誌層級過濾 (格式同 `RUST_LOG`) |
| `RUST_LOG` | — | 標準 tracing 日誌過濾器 |
| `RUSTYCLAW_VAULT_PASSWORD` | — | 加密 vault 密碼（由 launcher 注入，讀入後自動清除） |
| `RUSTYCLAW_MODEL_API_KEY` | — | LLM 提供者 API 金鑰（由 launcher 注入，讀入後自動清除） |
| `RUSTYCLAW_RATE_LIMIT` | `0` | 每次請求的最大工具呼叫次數（0 = 無限制） |
| `SSH_USER` | — | SSH 認證時回報的使用者名稱 |
| `OPENAI_API_KEY` | — | OpenAI API 金鑰 |
| `ANTHROPIC_API_KEY` | — | Anthropic API 金鑰 |
| `GOOGLE_API_KEY` | — | Google AI API 金鑰 |
| `OPENROUTER_API_KEY` | — | OpenRouter API 金鑰 |
| `DISCORD_BOT_TOKEN` | — | Discord 機器人 Token |
| `TELEGRAM_BOT_TOKEN` | — | Telegram 機器人 Token |
| `SLACK_BOT_TOKEN` | — | Slack 機器人 Token |

### 5.5. VS Code 開發除錯設定

開發環境透過 VS Code Launch Configurations 進行全端除錯，設定檔位於 `.vscode/launch.json`。

| 設定名稱 | 說明 |
| --- | --- |
| `Launch EIVA (Full Stack)` | 複合啟動：前端(Vite) + 後端(LLDB) |
| `Launch Frontend (Chrome)` | 僅啟動 Chrome 連接到 Vite Dev Server (`localhost:38999`) |
| `Debug Backend Gateway (CodeLLDB)` | 僅啟動後端 Gateway 除錯 (LLDB attach) |

啟動流程：
1. **preLaunchTask** `Kill Port 39999`：自動清理殘留的 API Server process
2. **preLaunchTask** `Start Frontend (Vite)`：啟動 Vite 開發伺服器
3. **CodeLLDB**：編譯 `eiva-gateway` 並以 LLDB 附加，SSH listen 於 `0.0.0.0:3000`

### 5.6. CLI 子命令

`eiva-gateway` 提供以下 CLI 子命令：

| 子命令 | 說明 |
| --- | --- |
| `run` | 啟動 Gateway（預設，無子命令時） |
| `init` | 初始化 SQLite 資料庫表格（`workflows`, `mcp_servers`, `ai_skills`） |
| `status` | 顯示 Gateway 狀態（`--json` 輸出 JSON 格式） |
| `pair list` | 列出已授權的 SSH 客戶端 |
| `pair add <KEY>` | 新增授權的 SSH 公鑰 |
| `pair remove <FINGERPRINT>` | 移除指定指紋的 SSH 客戶端 |

#### `init` 子命令

初始化 SQLite 資料庫，建立所有必要的表格。適用於首次部署或資料庫損壞時的手動修復。

```bash
# 初始化資料庫
eiva-gateway init

# 輸出範例：
# ✓ Database initialized: /home/eiva/.config/eiva/workflows.sqlite3
#   Tables: workflows, mcp_servers, ai_skills
```

建立的表格：
- `workflows` — 工作流程資料（`id`, `data`）
- `mcp_servers` — MCP 伺服器設定（`id`, `name`, `command`, `args`, `env`, `cwd`, `enabled`, `timeout_secs`）
- `ai_skills` — AI 技能設定（`id`, `name`, `description`, `instructions`, `enabled`, `linked_secrets`）

若資料庫已存在舊版表格（JSON blob 格式），會自動遷移至新版結構化欄位。

### 5.7. 通訊埠一覽

| Port | 服務 | 開發環境 | Docker 容器 |
| --- | --- | --- | --- |
| `3000` | SSH Transport (Gateway) | LLDB 除錯用 | `0.0.0.0:3000` |
| `39999` | HTTP API + WebSocket (Salvo) | 直接使用 | 對外映射 `39999:39999` |
| `38999` | Vite 前端開發伺服器 | 本機 Chrome 連線 | 僅本機開發使用 |

### 5.7. 系統目錄結構

```
eiva/
├── Dockerfile                  # 最小 Alpine 部署
├── Dockerfile-SelfService      # 含 Node.js/Python 環境
├── build-docker.sh             # Docker 建置腳本
├── docker-compose.yml          # 容器編排設定
├── vol/                        # 持久化資料
│   ├── skills/
│   ├── prompts/
│   ├── files/
│   └── assets/
├── backend/
│   ├── crates/eiva-gateway/src/    # Gateway 後端原始碼
│   └── ...
├── frontend/
│   └── app/                              # React SPA 原始碼
└── .vscode/
    ├── launch.json                       # 全端除錯設定
    └── tasks.json                        # 背景工作 (Vite, port cleanup)

---

## 6. MCP 伺服器維護 — DataGrid CRUD 規格

### 6.1. 概述

MCP 伺服器維護頁面提供前端使用者透過 DataGrid 表格介面，對 MCP 伺服器設定進行完整的 CRUD 操作。資料儲存於 SQLite 資料庫 `mcp_servers` 表，採用結構化欄位儲存。

### 6.2. 資料庫表結構

資料庫：`{settings_dir}/workflows.sqlite3`
表格：`mcp_servers`

| 欄位 | SQL 型別 | 說明 |
|------|----------|------|
| `id` | `TEXT PRIMARY KEY` | 識別碼，格式 `mcp_{timestamp}` |
| `name` | `TEXT NOT NULL DEFAULT ''` | 伺服器顯示名稱 |
| `command` | `TEXT NOT NULL DEFAULT ''` | 執行命令（如 `npx`, `uvx`） |
| `args` | `TEXT NOT NULL DEFAULT '[]'` | 命令參數，JSON 陣列格式 |
| `env` | `TEXT NOT NULL DEFAULT '{}'` | 環境變數，JSON 物件格式 |
| `cwd` | `TEXT` | 工作目錄（可為空） |
| `enabled` | `INTEGER NOT NULL DEFAULT 1` | 是否啟用（0/1） |
| `timeout_secs` | `INTEGER NOT NULL DEFAULT 30` | 工具呼叫逾時（秒） |

#### Migration 策略

系統啟動時 `WorkflowDb::init()` 偵測舊版表結構（僅有 `id` + `data` JSON blob），自動執行：
1. 讀取舊資料並解析 JSON
2. 將各欄位寫入新結構化表
3. 重建表結構（SQLite 不支援 `ALTER TABLE DROP COLUMN`）

### 6.3. REST API 端點

| 方法 | 路徑 | 功能 | 請求 Body |
|------|------|------|-----------|
| `GET` | `/mcp-servers` | 列出所有 MCP 伺服器 | — |
| `GET` | `/mcp-server/<id>` | 取得單一伺服器 | — |
| `POST` | `/mcp-server/<id>` | 新增或更新伺服器 | 見下方 |
| `DELETE` | `/mcp-server/<id>` | 刪除伺服器 | — |
| `POST` | `/mcp-server/<id>/test` | 測試連線並回傳工具列表 | — |
| `OPTIONS` | `/mcp-server/<id>` | CORS preflight | — |

#### POST `/mcp-server/<id>` — 請求 Body

```json
{
  "name": "Filesystem Server",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
  "env": { "NODE_ENV": "production" },
  "cwd": "/home/user",
  "enabled": true,
  "timeout_secs": 30
}
```

#### GET 回應格式

```json
[
  {
    "id": "mcp_1720000000000",
    "name": "Filesystem Server",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
    "env": { "NODE_ENV": "production" },
    "cwd": "/home/user",
    "enabled": true,
    "timeout_secs": 30
  }
]
```

#### POST `/mcp-server/<id>/test` — 測試連線

嘗試連線至指定 MCP 伺服器，回傳連線結果與工具列表。

**成功回應**：
```json
{
  "status": "success",
  "server": "filesystem",
  "tools": ["mcp_filesystem_read_file", "mcp_filesystem_write_file"],
  "tool_count": 2
}
```

**失敗回應**：
```json
{
  "status": "error",
  "server": "filesystem",
  "error": "Failed to spawn MCP server process: No such file or directory"
}
```

### 6.4. 前端 DataGrid 介面

#### 檔案位置
- 元件：`frontend/app/McpConfigPage.jsx`
- 樣式：`frontend/app/style.css`（`.datagrid-*` 系列選擇器）

#### 表格欄位

| 欄位 | 標題 | 編輯方式 |
|------|------|----------|
| `name` | 名稱 | 行內 text input |
| `command` | 命令 | 行內 text input |
| `args` | 參數 | 按鈕顯示 `[N args]`，點擊展開 Popup 編輯器 |
| `env` | 環境變數 | 按鈕顯示 `[N vars]`，點擊展開 Popup 編輯器（key-value 表格） |
| `cwd` | 工作目錄 | 行內 text input |
| `enabled` | 啟用 | Toggle switch |
| `timeout_secs` | 逾時(秒) | 行內 number input |
| actions | 操作 | [儲存] [編輯] [測試] [刪除] 按鈕 |

#### 列狀態

| 狀態 | CSS class | 說明 |
|------|-----------|------|
| 普通 | `.datagrid-row` | 顯示模式 |
| 編輯中 | `.datagrid-row.editing` | 編輯模式，行內 input 顯示 |
| 新增中 | `.datagrid-row.new` | 新插入的列，背景高亮 |

#### 功能
- **新增**：點擊 [+ 新增伺服器] 在表格頂部插入空白列
- **編輯**：點擊 [編輯] 切換列至編輯模式
- **儲存**：點擊 [儲存] POST 資料至 API，成功後退出編輯模式
- **刪除**：點擊 [刪除] 顯示 confirm 對話框，確認後 DELETE
- **測試**：點擊 [測試] 呼叫 `POST /mcp-server/<id>/test`，嘗試連線並回傳工具列表；結果顯示於表格下方
- **排序**：點擊欄位標題切換升序/降序
- **args Popup**：列表式編輯，支援新增/刪除項目
- **env Popup**：key-value 表格編輯，支援新增/刪除變數

### 6.5. i18n 翻譯鍵值

所有翻譯鍵值位於 `mcp` 命名空間下：

| 鍵值 | en | zh-TW | ja |
|------|----|----|-----|
| `mcp.title` | MCP Servers | MCP 伺服器 | MCPサーバー |
| `mcp.addRow` | Add Server | 新增伺服器 | サーバー追加 |
| `mcp.colName` | Name | 名稱 | 名前 |
| `mcp.colCommand` | Command | 命令 | コマンド |
| `mcp.colArgs` | Args | 參數 | 引数 |
| `mcp.colEnv` | Env | 環境變數 | 環境変数 |
| `mcp.colCwd` | CWD | 工作目錄 | 作業ディレクトリ |
| `mcp.colEnabled` | Enabled | 啟用 | 有効 |
| `mcp.colTimeout` | Timeout | 逾時 | タイムアウト |
| `mcp.colActions` | Actions | 操作 | 操作 |
| `mcp.argsEditor` | Edit Arguments | 編輯參數 | 引数を編集 |
| `mcp.envEditor` | Edit Environment Variables | 編輯環境變數 | 環境変数を編集 |
| `mcp.addArg` | Add argument... | 新增參數... | 引数を追加... |
| `mcp.addEnv` | Add variable | 新增變数 | 変数を追加 |
| `mcp.key` | Key | 鍵 | キー |
| `mcp.value` | Value | 値 | 値 |
| `mcp.argsCount` | args | 個參數 | 個の引数 |
| `mcp.envCount` | vars | 個變數 | 個の変数 |
| `mcp.test` | Test | 測試 | テスト |
| `mcp.testing` | Testing... | 測試中... | テスト中... |
| `mcp.testResults` | Test Results | 測試結果 | テスト結果 |
| `mcp.testConnected` | Connected | 已連線 | 接続成功 |
| `mcp.testToolsFound` | tools found | 個工具 | 個のツール |

---

## 7. AI Skill 維護 — DataGrid CRUD 規格

### 7.1. 概述

AI Skill 維護頁面提供前端使用者透過 DataGrid 表格介面，對 AI Skill 設定進行完整的 CRUD 操作。資料儲存於 SQLite 資料庫 `ai_skills` 表，採用結構化欄位儲存。

### 7.2. 資料庫表結構

資料庫：`{settings_dir}/workflows.sqlite3`
表格：`ai_skills`

| 欄位 | SQL 型別 | 說明 |
|------|----------|------|
| `id` | `TEXT PRIMARY KEY` | 識別碼，格式 `skill_{timestamp}` |
| `name` | `TEXT NOT NULL DEFAULT ''` | 技能名稱（kebab-case） |
| `description` | `TEXT NOT NULL DEFAULT ''` | 簡短描述 |
| `instructions` | `TEXT NOT NULL DEFAULT ''` | 指令內容（markdown 格式） |
| `enabled` | `INTEGER NOT NULL DEFAULT 1` | 是否啟用（0/1） |
| `linked_secrets` | `TEXT NOT NULL DEFAULT '[]'` | 關聯的 vault 密鑰名稱，JSON 陣列格式 |

#### Migration 策略

系統啟動時 `WorkflowDb::init()` 偵測舊版表結構（僅有 `id` + `data` JSON blob），自動執行：
1. 讀取舊資料並解析 JSON（相容 `instructions` 或 `prompt` 欄位）
2. 將各欄位寫入新結構化表
3. 重建表結構

### 7.3. REST API 端點

| 方法 | 路徑 | 功能 | 請求 Body |
|------|------|------|-----------|
| `GET` | `/skills` | 列出所有 AI Skill | — |
| `GET` | `/skill/<id>` | 取得單一技能 | — |
| `POST` | `/skill/<id>` | 新增或更新技能 | 見下方 |
| `DELETE` | `/skill/<id>` | 刪除技能 | — |
| `POST` | `/skill/<id>/test` | 驗證技能設定 | — |
| `OPTIONS` | `/skill/<id>` | CORS preflight | — |

#### POST `/skill/<id>` — 請求 Body

```json
{
  "name": "my-skill",
  "description": "A short description",
  "instructions": "# Skill Title\n\nInstructions here...",
  "enabled": true,
  "linked_secrets": ["AWS_KEY", "AWS_SECRET"]
}
```

#### POST `/skill/<id>/test` — 驗證結果

**成功回應**：
```json
{
  "status": "success",
  "skill": "my-skill",
  "warnings": ["Instructions are very short (2 lines)"],
  "manager_validated": false
}
```

**失敗回應**：
```json
{
  "status": "error",
  "skill": "",
  "errors": ["Skill name is empty", "Instructions (prompt) are empty"],
  "warnings": []
}
```

### 7.4. 前端 DataGrid 介面

#### 檔案位置
- 元件：`frontend/app/SkillConfigPage.jsx`
- 樣式：`frontend/app/style.css`（`.datagrid-*` 系列選擇器）

#### 表格欄位

| 欄位 | 標題 | 編輯方式 |
|------|------|----------|
| `name` | 名稱 | 行內 text input |
| `description` | 描述 | 行內 text input |
| `instructions` | 指令 | 按鈕顯示 `[N chars]`，點擊展開 Popup textarea 編輯器 |
| `enabled` | 啟用 | Toggle switch |
| `linked_secrets` | 密鑰 | 按鈕顯示 `[N secrets]`，點擊展開 Popup 列表編輯器 |
| actions | 操作 | [儲存] [編輯] [測試] [刪除] 按鈕 |

#### 功能
- **新增**：點擊 [+ 新增技能] 在表格頂部插入空白列
- **編輯**：點擊 [編輯] 切換列至編輯模式
- **儲存**：點擊 [儲存] POST 資料至 API，成功後退出編輯模式
- **刪除**：點擊 [刪除] 顯示 confirm 對話框，確認後 DELETE
- **測試**：點擊 [測試] 呼叫 `POST /skill/<id>/test`，驗證技能設定；結果顯示於表格下方
- **排序**：點擊欄位標題切換升序/降序
- **instructions Popup**：textarea 編輯器，支援 markdown 格式
- **secrets Popup**：列表式編輯，支援新增/刪除密鑰名稱

### 7.5. i18n 翻譯鍵值

所有翻譯鍵值位於 `skill` 命名空間下：

| 鍵值 | en | zh-TW | ja |
|------|----|----|-----|
| `skill.title` | AI Skill Management | AI Skill 維護 | AIスキル管理 |
| `skill.addRow` | Add Skill | 新增技能 | スキル追加 |
| `skill.colName` | Name | 名稱 | 名前 |
| `skill.colDescription` | Description | 描述 | 説明 |
| `skill.colInstructions` | Instructions | 指令 | 指示 |
| `skill.colEnabled` | Enabled | 啟用 | 有効 |
| `skill.colSecrets` | Secrets | 密鑰 | シークレット |
| `skill.colActions` | Actions | 操作 | 操作 |
| `skill.instructionsEditor` | Edit Instructions | 編輯指令 | 指示を編集 |
| `skill.secretsEditor` | Edit Linked Secrets | 編輯關聯密鑰 | リンクされたシークレットを編集 |
| `skill.addSecret` | Add secret name... | 新增密鑰名稱... | シークレット名を追加... |
| `skill.chars` | chars | 字元 | 文字 |
| `skill.secretsCount` | secrets | 個密鑰 | 個のシークレット |
| `skill.test` | Test | 測試 | テスト |
| `skill.testing` | Testing... | 測試中... | テスト中... |
| `skill.testResults` | Test Results | 測試結果 | テスト結果 |
| `skill.testPassed` | Validation passed | 驗證通過 | 検証通過 |

---

## 8. Workspace 檔案管理 — CRUD 規格

### 8.1. 概述

Workspace 檔案管理頁面提供前端使用者對工作區內的檔案與目錄進行完整 CRUD 操作。實體目錄位於 `{cwd}/backend/assets/workspace/`，所有路徑操作均通過 `resolve_workspace_path()` 進行安全驗證（防止路徑遍歷攻擊）。

### 8.2. REST API 端點

所有端點前綴：`/workspace`

| 方法 | 路徑 | 功能 | 請求 / 回應 |
|------|------|------|-------------|
| `GET` | `/workspace/tree` | 取得目錄樹（遞迴 JSON） | 回應：`{ "name": "root", "path": "", "children": [...] }` |
| `GET` | `/workspace/list?path=<rel>` | 列出指定目錄下的項目 | 回應：`{ "entries": [{ "name", "isDir", "size", "modified" }] }` |
| `GET` | `/workspace/file?path=<rel>` | 下載 / 預覽檔案 | 回傳原始檔案內容 |
| `POST` | `/workspace/file` | 上傳檔案 | multipart form：`path` + `file` |
| `POST` | `/workspace/dir` | 建立目錄 | JSON：`{ "path": "<relative_path>" }` |
| `POST` | `/workspace/delete` | 刪除檔案或目錄 | JSON：`{ "path": "<relative_path>" }` |
| `POST` | `/workspace/rename` | 重新命名 | JSON：`{ "path": "<relative_path>", "newName": "<new_name>" }` |
| `OPTIONS` | `/workspace/*` | CORS preflight | — |

#### `GET /workspace/list` — 回應格式

```json
{
  "entries": [
    { "name": "docs", "isDir": true, "size": 0, "modified": 1720000000 },
    { "name": "data.csv", "isDir": false, "size": 4096, "modified": 1720000000 }
  ]
}
```

排序規則：目錄優先，再按名稱字母排序。

#### `POST /workspace/delete` — 刪除

刪除檔案或目錄（目錄遞迴刪除）。刪除前需前端 confirm 確認。

**成功回應**：`{ "status": "ok" }`

#### `POST /workspace/rename` — 重新命名

重新命名檔案或目錄。`newName` 不可包含 `/` 或 `\`，且重新命名後的路徑仍須在 workspace 根目錄內。

**成功回應**：`{ "status": "ok" }`

### 8.3. 前端介面

#### 檔案位置
- 元件：`frontend/app/WorkspacePage.jsx`
- 樣式：`frontend/app/style.css`（`.workspace-*`, `.datagrid-icon-btn-*` 系列）

#### 介面結構

| 區域 | 說明 |
|------|------|
| 左側樹狀導覽 | `TreeFolder` 元件，遞迴展開目錄結構，點擊切換目前路徑 |
| 麵包屑導覽 | 顯示目前路徑，點擊各段可跳轉 |
| 檔案列表表格 | DataGrid 顯示目前目錄下的檔案/目錄 |
| 拖曳上傳 | 拖曳檔案至列表區域觸發上傳 |
| 檔案預覽 | 點擊文字檔案顯示內容，圖片顯示縮圖，其他格式直接下載 |

#### 表格欄位

| 欄位 | 說明 |
|------|------|
| 圖示 | 📁 目錄 / 📄 檔案 |
| 名稱 | 檔案/目錄名稱（目錄可點擊進入，檔案可點擊預覽） |
| 大小 | 檔案大小（目錄顯示空白） |
| 操作 | [重新命名] [刪除] 按鈕 |

#### 操作功能
- **上傳**：支援按鈕選擇與拖曳上傳，可多檔同時上傳
- **建立目錄**：prompt 輸入名稱後 POST `/workspace/dir`
- **重新命名**：點擊 [重新命名] 切換為行內 input，Enter 確認、Escape 取消
- **刪除**：點擊 [刪除] 顯示 confirm 對話框，確認後 POST `/workspace/delete`
- **檔案預覽**：文字檔案顯示內容，圖片顯示縮圖，其他格式下載
- **目錄導覽**：點擊目錄名稱或 `..` 切換路徑

### 8.4. i18n 翻譯鍵值

所有翻譯鍵值位於 `workspace` 命名空間下：

| 鍵值 | en | zh-TW | ja |
|------|----|----|-----|
| `workspace.title` | Workspace | 內容管理 | ワークスペース |
| `workspace.createFolder` | New Folder | 建立目錄 | 新規フォルダ |
| `workspace.upload` | Upload | 上傳檔案 | アップロード |
| `workspace.uploading` | Uploading... | 上傳中... | アップロード中... |
| `workspace.enterFolderName` | Enter folder name: | 請輸入目錄名稱： | フォルダ名を入力してください： |
| `workspace.createFailed` | Failed to create folder | 建立目錄失敗 | フォルダの作成に失敗しました |
| `workspace.empty` | No files found | 目前沒有檔案 | ファイルが見つかりません |
| `workspace.loading` | Loading... | 載入中... | 読み込み中... |
| `workspace.download` | Download | 下載 | ダウンロード |
| `workspace.close` | Close | 關閉 | 閉じる |
| `workspace.name` | Name | 名稱 | 名前 |
| `workspace.size` | Size | 大小 | サイズ |
| `workspace.delete` | Delete | 刪除 | 削除 |
| `workspace.rename` | Rename | 重新命名 | 名前を変更 |
| `workspace.confirmDelete` | Delete cannot be undone. Are you sure? | 刪除後無法復原，確定要刪除嗎？ | 削除は取り消せません。よろしいですか？ |

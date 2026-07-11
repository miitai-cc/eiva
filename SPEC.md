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

### 5.4. 環境變數

| 變數 | 預設值 | 說明 |
| --- | --- | --- |
| `RUSTYCLAW_LOG` | `eiva=info` | Rust 後端的日誌層級過濾 (格式同 `RUST_LOG`) |
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

### 5.6. 通訊埠一覽

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

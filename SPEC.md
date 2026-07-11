# EIVA 系統通訊埠與 API 規格 (SPEC)

本文件定義了 EIVA (Enterprise Intelligent Virtual Assistant) 系統整合 RustyClaw 作為底層引擎後，對外開放的通訊埠配置、靜態檔案目錄映射與 REST API 規範。

## 1. 系統通訊埠配置 (Ports Configuration)

為了相容原先 `web-Codex` (Legacy Node.js) 的架構與全端分離的除錯體驗，系統在後端啟動時將同時開啟兩個通訊埠：

| 通訊埠 | 協定 / 用途 | 說明 |
| --- | --- | --- |
| **`3000`** | SSH / WebSocket Gateway | 這是原 RustyClaw 的原生 Gateway 通訊埠 (原預設為 2222 / 9001)。供底層 Agent 協定通訊、終端機連線或安全隧道使用。 |
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

此 API 層會橋接 RustyClaw 內建的 `TaskManager` 與 `ThreadManager` 來統一管理任務，捨棄舊有的 JSON 檔案資料庫。

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

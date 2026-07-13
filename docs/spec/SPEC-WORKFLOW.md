# EIVA Workflow Execution Specification

## 1. 系統架構與設計理念 (Architecture Analysis)

### 1.1 前端資料結構
前端透過 React Flow 編輯的工作流程，主要以 JSON 格式表示，包含 `nodes` 與 `edges`。
- **Nodes**: `startNode`, `agentNode`, `toolNode`, `conditionNode`, `endNode`, `variableNode`, `calculateNode`, `mcpNode`, `skillNode`, `noteNode`, `swimlaneNode`
- **Edges**: 定義從 `source` node 到 `target` node 的連線。

### 1.2 後端執行引擎架構
工作流程本質上是一個 **DAG (Directed Acyclic Graph)**（有向無環圖）。後端引擎需要：
1. 將前端儲存的 JSON 反序列化成 Rust Struct。
2. 以 `tokio::spawn` 的方式將工作流程丟入背景非同步執行，避免阻塞 API。
3. 引擎存放目錄位於 `backend/crates/eiva-core/src/workflow/`。

## 2. 後端執行引擎規格 (Engine Spec)

### 2.1 Graph Runner
- **Topological Traversal**: 從 `startNode` 開始，沿著 Edge 找出下一個應執行的節點。
- **異步執行**: 每個節點的實作 (Trait) 應回傳 `Future`，支援非同步操作（如呼叫 LLM 或是存取 DB）。

### 2.2 Context & State Management
- **Edge Payload**: 採用「資料沿著 Edge 傳遞」的架構，上一個節點的輸出會成為下一個節點輸入 Payload 的一部分。
- **Global Variables**: 輔助存放跨節點需要共用的全域狀態。`VariableNode` 可以寫入全域變數，供後續任意節點透過特定語法（如 `${varName}`）存取。

### 2.3 Node Executors
每個節點的執行邏輯需實作 `WorkflowNode` Trait，例如：
- `StartNode`: 啟動流程，初始化 Payload。
- `AgentNode`: 將目前的 Payload 與 prompt 結合，呼叫 LLM 進行推論，將結果放入輸出 Payload。
- `ToolNode` / `McpNode` / `SkillNode`: 呼叫對應的工具、MCP 伺服器或技能，並將回傳值附加至 Payload。
- `ConditionNode`: 評估條件式，決定往哪一條 Edge 繼續傳遞（控制流 branching）。
## 2.4 各節點詳細實作規格 (Node Implementation Details)

前端 UI 提供了多種節點，後端必須能正確解析 `node.data` 內的各項參數，並執行對應邏輯。以下為各節點的演算法 (Algorithm) 與執行步驟：

1. **`startNode` (起始節點)**
   - **參數**: `triggerType` (manual, schedule, webhook)
   - **Algorithm**:
     1. 建立並初始化 `WorkflowContext` 結構體：`{ payload: HashMap<String, Value>::new(), global_variables: HashMap<String, Value>::new() }`。
     2. 依據觸發來源，若由 API (Webhook/Manual) 觸發，將 HTTP Request Body 或 Query 參數轉換為 JSON 寫入 `ctx.payload["trigger_data"]`。
     3. 寫入執行環境 Metadata：將 `ctx.payload["start_time"]` 設為目前 UTC Unix timestamp，並記錄 `workflow_id`。
     4. 回傳 `Result::Ok(())`，Graph Runner 尋找下一條 Edge。

2. **`agentNode` (AI Agent)**
   - **參數**: `prompt` (提示詞), `modelName` (模型名稱，例如 gpt-4o), `temperature` (溫度)
   - **Algorithm**:
     1. 建立 `minijinja::Environment`，將 `ctx.global_variables` 與 `ctx.payload` 註冊為模板變數。
     2. 呼叫 `minijinja::render(node.data.prompt, &context)` 將 `prompt` 內的 `{{ var }}` 渲染為實際字串。
     3. **建構訊息陣列 (Chat Messages)**:
        - `System Message`: 預設為 "You are a helpful AI assistant in an automated workflow." (未來可擴充 `systemPrompt` 欄位)。
        - `User Message`: 以步驟 2 渲染出的字串為主。若使用者未在 prompt 中透過模板語法提取 `payload` 資料，則引擎可選擇將 `ctx.payload` 序列化為 JSON 附加於 User Message 末尾，確保 AI 能看見上下文資料。
     4. 將訊息封裝為 `eiva_core::gateway::protocol::types::ChatMessage` 陣列。
     5. 呼叫對應的 LLM Provider (如 `eiva_core::providers` 或 Chat System) 傳入 `modelName` 與 `temperature` 發送非同步 One-shot 推論請求。
     6. 等待 LLM 回應完成，將純文字回應字串存入 `ctx.payload[format!("{}_result", node.id)]` (使用節點 ID 作為 key 避免資料覆蓋)。
     7. 回傳 `Result::Ok(())`。

3. **`toolNode` (工具節點)**
   - **參數**: `toolType` (例如 webSearch, fetchUrl, calculator), `parameters` (工具參數 JSON/Text)
   - **Algorithm**:
     1. 讀取 `node.data.parameters` 字串，透過 `minijinja` 進行變數渲染插值。
     2. 將渲染後的參數字串反序列化為 JSON Object `tool_args`。
     3. 進行 `match node.data.toolType` 分支執行：
        - `"webSearch"`: 從 `tool_args["query"]` 取得關鍵字，呼叫 `eiva_core::tools::web_search(query).await`。
        - `"fetchUrl"`: 從 `tool_args["url"]` 取得網址，呼叫 `eiva_core::tools::fetch_url(url).await`。
        - `"calculator"`: 從 `tool_args["expression"]` 取得算式，呼叫 `evalexpr::eval(expression)`。
     4. 將工具回傳的結果封裝為 `serde_json::Value`，寫入 `ctx.payload[format!("{}_result", node.id)]`。
     5. 回傳 `Result::Ok(())`。

4. **`mcpNode` (MCP 節點)**
   - **參數**: `mcpName` (MCP 伺服器名稱), `prompt`
   - **Algorithm**:
     1. 從 `eiva_core::mcp::McpClientManager` 中，根據 `node.data.mcpName` 尋找並取得已連線的 Session。若找不到則回傳 Error，中斷 Workflow 執行。
     2. 透過 `minijinja` 渲染 `node.data.prompt` 以替換變數。
     3. 建立標準的 MCP JSON-RPC 請求 (例如 `CallToolRequest`)，將渲染後的 `prompt` 與 `ctx.payload` 放入請求參數中。
     4. 非同步發送請求並等待外部 MCP Server 回應。
     5. 解析 MCP 回應，將提取出的資料寫入 `ctx.payload[format!("{}_mcp_response", node.id)]`。
     6. 回傳 `Result::Ok(())`。

5. **`skillNode` (技能節點)**
   - **參數**: `skillName` (技能名稱), `prompt`
   - **Algorithm**:
     1. 從 `eiva_core::skills::SkillRegistry` 依據 `node.data.skillName` 取得對應的 `SkillHandler`。
     2. 透過 `minijinja` 解析並渲染 `node.data.prompt` 內的變數。
     3. 建立執行上下文：`SkillExecutionContext { payload: &ctx.payload, prompt: &resolved_prompt }`。
     4. 呼叫 `SkillHandler::execute(skill_ctx).await` 執行技能邏輯。
     5. 將執行後回傳的結果 (通常為 JSON Object) 合併 (Merge) 至目前的 `ctx.payload` 之中。
     6. 回傳 `Result::Ok(())`。

6. **`conditionNode` (條件判斷節點)**
   - **參數**: `condition` (條件表達式)
   - **Algorithm**:
     1. 建立 `evalexpr::ContextWithMutableVariables`，將 `ctx.payload` 與 `ctx.global_variables` 中的純量值 (Scalars) 映射到評估環境中。
     2. 載入 `node.data.condition` 字串 (例如 `score > 80`)。
     3. 呼叫 `evalexpr::eval_boolean_with_context(condition_str, &eval_ctx)`。
     4. 若評估結果為 `true`，此函數回傳特製狀態 `Branch::True`；若為 `false`，回傳 `Branch::False`。
     5. **(Graph Runner 控制流邏輯)**:
        - 當 Graph Runner 接收到 `Branch::True` 時，過濾該節點的所有 Outgoing Edges，僅選擇 `sourceHandle == "source-right"` (或設定中代表 True 的 handle) 的目標節點繼續排程。
        - 當接收到 `Branch::False` 時，選擇 `sourceHandle == "source-bottom"` 的邊繼續排程。
        - 另一側未被選擇的 Edge 分支將被捨棄 (Discarded)。

7. **`variableNode` (變數節點)**
   - **參數**: `varName` (變數名稱), `varValue` (變數值)
   - **Algorithm**:
     1. 取出 `node.data.varName` (作為 Key) 與 `node.data.varValue` (作為 Value 字串)。
     2. 使用 `minijinja` 渲染 `varValue` 字串 (若字串中包含對 Payload 屬性的參照，例如 `${payload.agent_1_result}`，將被動態展開)。
     3. 判斷展開後字串的型別，轉換為 `serde_json::Value`。
     4. 將鍵值對寫入全域變數集合：`ctx.global_variables.insert(varName, resolved_value)`。
     5. 此節點不修改 `ctx.payload`，回傳 `Result::Ok(())`。

8. **`calculateNode` (計算節點)**
   - **參數**: `expression` (運算式)
   - **Algorithm**:
     1. 將 `ctx.global_variables` 與 `ctx.payload` 內部的值映射至 `evalexpr::Context`。
     2. 載入 `node.data.expression` 字串。
     3. 呼叫 `evalexpr::eval_with_context(expression, &eval_ctx)` 進行安全的數學或邏輯計算。
     4. 將計算結果轉換為 `serde_json::Value::Number` 或 `Value::String`。
     5. 將結果寫入 `ctx.payload[format!("{}_calc_result", node.id)]`。
     6. 回傳 `Result::Ok(())`。

9. **`endNode` (結束節點)**
   - **參數**: `outputFormat` (text, json, markdown)
   - **Algorithm**:
     1. 檢查 `node.data.outputFormat` 的設定值。
     2. 若為 `json`，直接將 `ctx.payload` 序列化為 JSON 格式字串；若為 `text`/`markdown`，則提取 `ctx.payload` 內部所有 `*_result` 欄位並組合成易讀的純文字格式。
     3. (選用): 透過 WebSocket, SSE 或儲存於 DB 的 Execution Table 廣播「工作流程執行完成」事件，並夾帶最終整理好的 Payload 字串。
     4. 將整個 Workflow 的執行歷程 (Execution Logs) 歸檔。
     5. 回傳終結信號 `WorkflowStatus::Completed`，Graph Runner 停止並釋放記憶體。

10. **`noteNode` / `swimlaneNode` (裝飾節點)**
    - **Algorithm**:
      1. 這些節點沒有實作 `WorkflowNode` Trait。
      2. 當 Graph Runner 在進行 DAG 的拓撲排序 (Topological Sort) 或 Edge 遍歷時，若解析到 `node.type == "noteNode" || "swimlaneNode"`，直接從執行圖表中剔除該節點 (Skip)。不產生任何執行 Task。

## 2.5 核心實作技術選型 (Technical Stack Choices for Algorithms)

為了確保演算法能穩定且高效地執行，針對幾個關鍵的技術節點，我們建議以下 Rust 生態系中的開源套件 (Crates) 作為底層實作技術：

1. **變數替換與模板引擎 (Variable Interpolation & Templating)**
   - **應用場景**: `agentNode`, `toolNode`, `mcpNode`, `variableNode` 等需要將 `${varName}` 或 `${payload.key}` 替換為實際數值的邏輯。
   - **技術選型**: **`minijinja`** 或 **正規表達式 (`regex`)**。
   - **選型考量**: 若只要簡單的字串替換，使用 `regex` 尋找 `\$\{([^}]+)\}` 並對應 `ctx.global_variables` 即可。若未來需要支援條件式輸出、迴圈或複雜的 JSON 物件取值，則強烈建議導入 `minijinja`，這是一個輕量、安全且語法類似 Jinja2 的 Rust 模板引擎。

2. **數學與邏輯表達式評估 (Math & Boolean Expression Evaluation)**
   - **應用場景**: `conditionNode` (判斷 `true`/`false`) 以及 `calculateNode` (執行數學運算)。
   - **技術選型**: **`evalexpr`**。
   - **選型考量**: `evalexpr` 非常輕量且安全，專門用來計算數學字串和布林表達式（例如 `"score > 80"` 或 `"10 + 20 * 3"`），並可將 `WorkflowContext` 中的變數傳入做為上下文 (Context)，完美契合我們對圖形節點輕量運算的需求。若未來需要更強大的自訂腳本語法，可考慮升級為 `rhai`。

3. **非同步流程控制與 DAG 排程 (Async Flow Control & DAG Execution)**
   - **應用場景**: `Graph Runner` 的執行調度。
   - **技術選型**: **`tokio`** 搭配 **`futures::future::BoxFuture`**。
   - **選型考量**: 因為 Node 執行會牽涉網路請求 (如 LLM 呼叫)，必須全非同步。透過 `tokio::spawn` 將整個 Workflow 包裝為獨立背景 Task，並使用 `BoxFuture` 讓不同型別的 Node 實作能一致地被調度執行。

## 3. API 介面定義 (API Definitions)

對 `backend/crates/eiva-gateway/src/api.rs` 的 API 進行改動：

### 3.1 執行 API
- **Endpoint**: `GET /eiva/backend/api/ver-0.95/workflow/:id/run` (前端目前以 GET 呼叫，但從語意上建議未來改成 POST，現階段相容舊版前端)。
- **行為**: 從 DB 取得 Workflow 後，將其轉交給 `eiva-core::workflow::runner::run_workflow` 在 `tokio::spawn` 中執行，並立刻回傳 HTTP 200 `{"ok": true, "message": "Workflow started"}`。

### 3.2 狀態與進度追蹤 (SSE / WebSocket) (Optional / Future enhancement)
- 新增一個 `/eiva/backend/api/ver-0.95/workflow/:id/status` 端點，讓前端輪詢或訂閱執行進度。

## 4. 實作上下文提示詞 (Copy & Paste Implementation Prompts)


> **建議總體提示詞 (Global Prompt)**:
> 請詳細閱讀 `docs/spec/SPEC-WORKFLOW.md`，並將 Phase 1 到 Phase 6 的所有任務一步一步實作完成。


以下提示詞切分為不同的開發階段。這份規格已經考量了「新建模組」與「後續增量修正」的過程，您可以直接複製這些 Prompt 貼給 AI 助手，請它逐步實作：

### Phase 1: 建立核心結構與 Graph 解析 (Models & Context)
現在我們要在 `eiva-core` 內實作工作流程執行引擎。
請在 `backend/crates/eiva-core/src/workflow/` 建立 `mod.rs`, `models.rs` 與 `context.rs`。
要求：
1. `models.rs`: 定義 `WorkflowData`, `Node`, `Edge` 的 serde struct，能解析前端傳來的 JSON 結構。請注意 `node.data` 結構是動態的，可使用 `serde_json::Value` 或 `HashMap`。
2. `context.rs`: 定義 `WorkflowContext` struct，內部包含 `payload: HashMap<String, serde_json::Value>` 以及 `global_variables: HashMap<String, serde_json::Value>`。
3. 在 `mod.rs` 匯出這些型別，並將 `workflow` 模組宣告加入 `backend/crates/eiva-core/src/lib.rs` 中。

### Phase 2: 建立 Graph Runner 與基礎節點 (Runner & Basic Nodes)
接續前一階段，請在 `workflow` 模組下建立 `nodes.rs` 與 `runner.rs`：
1. `nodes.rs`: 定義非同步 trait `WorkflowNode`: `async fn execute(&self, ctx: &mut WorkflowContext) -> anyhow::Result<NodeResult>`。其中 `NodeResult` 是 Enum，包含 `Next`, `Branch(bool)`, `End` 等以控制流程。
2. 實作最基礎的節點邏輯：
   - `startNode`: 寫入 `ctx.payload["start_time"]` 並回傳 `Next`。
   - `endNode`: 回傳 `End` 終止流程。
   - `noteNode`/`swimlaneNode`: 空實作 (No-op)。
3. `runner.rs`: 實作 `WorkflowRunner`，接收 `WorkflowData`。提供 `run` 方法，使用 Topological Sort 或依循 Edge 遍歷，透過 `tokio::spawn` 背景非同步執行節點，並在遇到 `ConditionNode` 等控制流時能正確根據 `Branch(true/false)` 切換相連的 Edge。

### Phase 3: 與 Gateway API 介接 (API Integration)
現在要在 API 層次整合剛做好的 workflow runner，將工作流程放進背景執行。
請修改 `backend/crates/eiva-gateway/src/api.rs` 的 `run_workflow` API：
1. 取得 workflow JSON 資料後，反序列化成 `eiva_core::workflow::models::WorkflowData`。
2. 建立 `WorkflowContext` 並呼叫 `WorkflowRunner::run`。
3. 請使用 `tokio::spawn` 將 `run` 包裝為背景任務，使其不阻塞 API。
4. 如果解析或啟動失敗，回傳 500/400 錯誤；若成功啟動，立即回傳 HTTP 200 JSON `{"ok": true, "message": "Workflow is running in background"}`。

### Phase 4: 實作 AgentNode 與變數模板引擎 (Minijinja & Agent)
接續工作流程引擎的開發，請在 `nodes.rs` 實作 `AgentNode` 與 `VariableNode`，並引入 `minijinja`：
1. `VariableNode`: 將 `node.data.varValue` 透過 `minijinja` (註冊 payload 作為 context) 渲染後，寫入 `ctx.global_variables`。
2. `AgentNode`: 
   - 透過 `minijinja` 渲染 `node.data.prompt`。
   - 將渲染結果作為 User Message，並預設一段 System Message (You are a helpful AI assistant in an automated workflow)。若 User Message 內未參照 payload，可將 payload JSON 附加於後。
   - 使用 `eiva_core::gateway::protocol::types::ChatMessage` 建立訊息，並呼叫 `eiva_core` 中既有的 LLM Provider / Chat 介面發送推論請求。
   - 將取得的純文字結果寫入 `ctx.payload[format!("{}_result", node.id)]`。

### Phase 5: 實作 ConditionNode 與 CalculateNode (Evalexpr)
我們需要讓工作流程具備條件分歧與計算能力，請引入 `evalexpr` 進行實作：
1. `CalculateNode`: 讀取 `node.data.expression`，透過 `evalexpr` (建立包含 `ctx.global_variables` 與 `ctx.payload` 的 `ContextWithMutableVariables`) 計算結果，並將數字或布林值寫入 `ctx.payload[format!("{}_calc_result", node.id)]`。
2. `ConditionNode`: 讀取 `node.data.condition`，同樣透過 `evalexpr` 進行布林運算。若為 true 則回傳 `NodeResult::Branch(true)`，false 則回傳 `NodeResult::Branch(false)`，讓 Runner 可以決定要走哪一條 Source Handle (例如 source-right 或 source-bottom)。

### Phase 6: 擴充 ToolNode, McpNode 與 SkillNode
最後，實作與外部系統互動的進階節點：
1. `ToolNode`: 解析 `node.data.toolType` 與 `parameters`。依據類型呼叫 `eiva_core::tools` 內的對應功能 (如 webSearch, fetchUrl)，並將結果存入 payload。
2. `McpNode`: 透過 `eiva_core::mcp::McpClientManager` 根據 `mcpName` 取得連線，並將渲染後的 `prompt` 與 `payload` 發送為 MCP CallToolRequest，接收並寫入結果。
3. `SkillNode`: 透過 `eiva_core::skills::SkillRegistry` 取得對應的技能，傳遞 Context 並執行，結果合併回 `ctx.payload`。

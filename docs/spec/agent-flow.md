# Agent Prompt Flow (後端)

本文說明 Eiva 後端 agent 收到使用者 prompt 後，如何組裝上下文、呼叫哪些模組/程式，以及請求與回應的流轉過程。重點聚焦於 **prompt 的傳入（傳遞）方式**。

> 適用範圍：Rust 後端 `eiva-gateway` + `eiva-core`（`backend/crates/...`）。
> Node.js 後端（`backend/node.js`）僅負責 task 排程與 Vite 前端 host，不直接處理聊天 prompt。

---

## 1. 整體流程圖

```
前端 (TUI / Desktop / Web)
   │  WebSocket 二進位 frame (type=chat)
   ▼
eiva-gateway/src/server.rs  handle_connection()
   │  decode frame → ChatRequest
   ▼
eiva-gateway/src/chat.rs    handle_chat_frame()           ← prompt 進入點
   │
   ├─ 1. 自動把使用者訊息寫入 Steel Memory (add_memory)
   │
   ├─ 2. 解析 ModelContext（模型佇列 model_queue）
   │
   ├─ 3. 組裝 messages[]
   │      ├─ system prompt：system_prompt::build_system_prompt()
   │      ├─ 對話歷史：thread 歷史重建（含 tool_call/tool_result）
   │      ├─ 背景任務 global_ctx
   │      └─ Steel Memory 檢索結果 (mem.search) 注入 system
   │
   ├─ 4. 遍歷 model_queue → dispatch_text_message()
   │
   ▼
eiva-gateway/src/dispatch.rs  dispatch_text_message()
   │  providers::resolve_request()  → ProviderRequest
   │  agentic tool loop (最多 500 輪)
   ▼
eiva-core/src/providers/mod.rs  call_with_tools()          ← provider 分派
   │  match provider:
   │    "anthropic" → genai_backend::call_anthropic_with_tools
   │    "google"    → genai_backend::call_google_with_tools
   │    "native_llama" → providers::native_llama::call_native_llama_with_tools
   │    _           → genai_backend::call_openai_with_tools
   ▼
外部 LLM API (OpenAI-compatible / Anthropic / Google) 或本地 GGUF server
   │  stream / 回應
   ▼
回寫 Chunk  frame → 前端
```

---

## 2. Prompt 進入點

| 階段 | 檔案 | 說明 |
|------|------|------|
| 連線接收 | `eiva-gateway/src/server.rs:33` `handle_connection()` | WebSocket 連線、解碼 frame |
| frame 分派 | `eiva-gateway/src/server.rs:537` `crate::chat::handle_chat_frame()` | 依 frame type 轉發聊天請求 |
| 聊天處理 | `eiva-gateway/src/chat.rs` `handle_chat_frame()` | **prompt 主要處理邏輯所在** |

前端送來的是 `ChatRequest`（`eiva-core/src/gateway/types.rs:55`）：

```rust
pub struct ChatRequest {
    pub msg_type: String,          // 必須是 "chat"
    pub messages: Vec<ChatMessage>,// system/user/assistant/tool
    pub model:    Option<String>,  // 可省略，缺省用 gateway 的 ModelContext
    pub provider: Option<String>,   // 可省略
    pub base_url: Option<String>,   // 可省略
    pub api_key:  Option<String>,   // 可省略（gateway 自己從 vault 取）
}
```

> 關鍵設計：**前端可以不帶任何憑證**，gateway 在 startup 時已從 config + secrets vault 解析出 `ModelContext`，再與進來的 `ChatRequest` 合併。缺省欄位優先使用 `req` 的值，再 fallback 到 gateway 預設（`resolve_request`）。

---

## 3. 上下文組裝（prompt 如何被「加料」）

在 `chat.rs` 的 `handle_chat_frame()` 中，原始 prompt 會被多層上下文包裹，最終形成送給模型的 `messages[]`：

### 3.1 使用者訊息自動入庫（Steel Memory）
```rust
// chat.rs:127-135  (feature = "semantic-memory")
tokio::spawn(async move {
    if let Ok(mem) = SteelMemory::new(&ws) {
        let _ = mem.add_memory(&text, "conversations", "user", None).await;
    }
});
```
每則使用者訊息會透過 `eiva_core::steel_memory::SteelMemory` 做 **本地 fastembed 向量化**（`AllMiniLML6V2`），寫入 `.steel-memory/palace.sqlite3`。

### 3.2 System prompt 建構
```rust
// chat.rs:251
let sys = system_prompt::build_system_prompt(&config, task_mgr, skill_mgr).await;
messages.insert(0, ChatMessage::text("system", &sys));
```
`build_system_prompt`（`system_prompt.rs:49`）依序串接：
1. config 中的 `system_prompt`（或預設）
2. Safety guardrails
3. **Workspace 上下文**：`WorkspaceContext::build_context()` 注入 `SOUL.md`、`IDENTITY.md`、`AGENTS.md`、`TOOLS.md` 等
4. Skills 上下文（`skill_mgr.generate_prompt_context()`）
5. 活躍 tasks 區段
6. 工具使用指引（`build_tool_usage_section`）
7. Silent Replies / Heartbeats 指引
8. Runtime 資訊

### 3.3 對話歷史重建
若 client 只送當前 user message（桌面端常見），gateway 會從 thread 歷史補回前面輪次，並且**保留 `tool_call` / `tool_result` 結構化格式**（避免被壓平為純文字導致 provider 拒收）。見 `chat.rs:259-302` 與 `providers::thread_history_to_chat_messages()`。

### 3.4 背景任務與記憶注入
- `thread_mgr.build_global_context()` 注入背景任務（`chat.rs:346-351`）。
- Steel Memory 語意檢索：取最後一則 user message 作為 query，`mem.search()` 回傳相似記憶並附加到 system prompt（`chat.rs:371-401`）。
- 新 thread 會注入 `set_thread_caption` 工具呼叫指示（`chat.rs:357-369`）。

### 3.5 其他動態注入
- compaction summary（壓縮後的對話摘要）
- 記憶 flush 指示（接近 context 上限時）
- auto-compaction（超過 `context_limit * COMPACTION_THRESHOLD` 時）

---

## 4. ModelContext 解析與模型佇列

`chat.rs` 會組出一個 **fallback 佇列 `model_queue`**（`chat.rs:144-212`），依優先序加入：
1. DB 中啟用的 AI models（`api::WORKFLOW_DB.list_ai_models()`）
2. `OPENCODE_*` 環境變數
3. 共享狀態 `shared_model_ctx`
4. DB 中停用模型（最後手段）

**`agent_mode = "inner"` 的特殊處理**：若 config 設定了 `native_llama_api_url`（或被 `NATIVE_LLAMA_API_URL` 環境變數覆寫，`main.rs:201`），`model_queue` 會被清空，只保留一個 `native_llama` 的 `ModelContext`：
```rust
// chat.rs:202-210
ModelContext {
    provider: "native_llama".to_string(),
    model:    api_url.clone(),   // 注意：model 欄位在此裝的是「base API URL」
    api_key:  None,
    base_url: "local".to_string(),
}
```

> ⚠️ 這是一個容易混淆的點：對 `native_llama` 而言，`ProviderRequest.model` 裝的**不是模型名稱，而是 API 的 base URL**（例如 `http://localhost:8080/v1`）。後端 provider 實作必須認得這一點。

---

## 5. Provider 分派與 LLM 呼叫

### 5.1 resolve_request
`eiva-gateway/src/providers/mod.rs:128` `resolve_request()` 把 `ChatRequest` + `ModelContext` 合併成 `ProviderRequest`：
```rust
pub struct ProviderRequest {
    pub messages: Vec<ChatMessage>,
    pub model:    String,   // native_llama 時 = API base URL
    pub provider: String,
    pub base_url: String,
    pub api_key:  Option<String>,
}
```

### 5.2 call_with_tools（單一分派點）
`eiva-core/src/providers/mod.rs:482`：
```rust
match req.provider.as_str() {
    "anthropic"     => call_anthropic_with_tools(http, req, writer),
    "google"        => call_google_with_tools(http, req),
    "native_llama"  => native_llama::call_native_llama_with_tools(req, writer),
    _               => call_openai_with_tools(http, req, writer),
}
```

### 5.3 各 provider 模組
| Provider | 模組 | 備註 |
|----------|------|------|
| anthropic | `eiva-core/src/providers/genai_backend.rs` | 經由 genai crate |
| google | `eiva-core/src/providers/genai_backend.rs` | 強制非串流 |
| openai / 其他 | `eiva-core/src/providers/genai_backend.rs` | OpenAI-compatible |
| native_llama | `eiva-core/src/providers/native_llama.rs` | 本地 GGUF server（inner mode） |

### 5.4 native_llama 的呼叫邏輯（`native_llama.rs`）
- 由 `req.model` 取出 **base URL**，轉換成 chat/completions 端點：
  - 若已以 `/chat/completions` 結尾 → 直接使用
  - 若以 `/v1` 結尾 → 附加 `/chat/completions`
  - 其他 → 附加 `/v1/chat/completions`
- POST 到該端點，payload 含 `messages / max_tokens / temperature / stream:false`。
- 若有 `api_key` 則帶 `Authorization: Bearer`。
- 解析 OpenAI-compatible 回應：`choices[0].message.content` 與 `tool_calls`，並擷取 `finish_reason` 與 `usage`。

> **歷史 bug（已修正）**：舊程式直接把 `req.model`（base URL，如 `http://localhost:8080/v1`）當成請求位址 POST，server 回傳 model list / error object，導致所有解析分支落空，出現 `Invalid response format from API`；該錯誤文字之後又被當成一般文字餵回 Steel Memory（見 3.1），於是 log 中出現 `INFO eiva_core::steel_memory: Embedding text: Error: Invalid response format from API`。修正方式是改 POST 到正確的 `/chat/completions` 端點並加強錯誤處理。

### 5.5 Agentic tool loop
`dispatch.rs` 的 `dispatch_text_message()` 跑一個最多 500 輪的迴圈：
1. 解析 bearer token / copilot session（如適用）
2. 必要時做 pre-compaction memory flush
3. 超過 context 閾值則 `compact_conversation()`
4. `providers::call_with_tools()` 取得模型回應
5. 若回應含 `tool_calls` → 本地執行工具 → 把結果加回 `messages` → 再呼叫模型
6. 回應以 `Chunk` frame 串流回前端，結束送 `response_done`

---

## 6. Steel Memory（語意記憶）呼叫鏈

| 動作 | `steel_memory.rs` 方法 | 呼叫的模組/程式 |
|------|------------------------|----------------|
| 向量化文字 | `embed()` → `do_embed()` | `fastembed::TextEmbedding`（本地 `AllMiniLML6V2`） |
| 寫入記憶 | `add_memory()` → `do_add_drawer()` | `steel_memory_lib::VectorStorage`（sqlite） |
| 語意檢索 | `search()` → `do_search()` | `steel_memory_lib::VectorStorage` |
| 知識圖譜 | `kg_add / kg_query / ...` | `steel_memory_lib::KnowledgeGraph` |
| 宮殿圖遍歷 | `palace_graph / palace_traverse` | `steel_memory_lib::PalaceGraph` |
| AAAK 壓縮 | `compress_aaak / wake_up` | `steel_memory_lib::compress_to_aaak` |
| 日記 | `diary_write / diary_read` | 內部轉呼叫 `add_memory` |

> 嵌入模型**本地載入**（lazy load，快取於 `~/.eiva/cache/fastembed`），不經過任何 API；因此 `steel_memory` 的 embedding 錯誤不會源自網路，只可能源自模型載入或 sqlite。前面的 `Invalid response format` 之所以出現在 steel_memory log，純粹是因為那段錯誤字串被當作普通文字餵給 `add_memory` 做向量化。

---

## 7. 回應回傳

`protocol::server::send_chunk(writer, &delta)` 以二進位 `Chunk` frame 串流；結束時 `send_response_done(writer, ok)`。前端依 frame 重建訊息。

---

## 8. 關鍵檔案索引

| 關注點 | 路徑 |
|--------|------|
| 連線 / frame 接收 | `eiva-gateway/src/server.rs` |
| prompt 進入與上下文組裝 | `eiva-gateway/src/chat.rs` |
| ModelContext / 模型佇列 | `eiva-gateway/src/chat.rs:144-212` |
| system prompt 建構 | `eiva-gateway/src/system_prompt.rs` |
| 分派與 tool loop | `eiva-gateway/src/dispatch.rs` |
| request 解析 / provider 分派 | `eiva-gateway/src/providers/mod.rs`, `eiva-core/src/providers/mod.rs` |
| native_llama 呼叫 | `eiva-core/src/providers/native_llama.rs` |
| OpenAI/Anthropic/Google 呼叫 | `eiva-core/src/providers/genai_backend.rs` |
| 請求/回應型別 | `eiva-core/src/gateway/types.rs`, `eiva-core/src/gateway/protocol/types.rs` |
| Steel Memory | `eiva-core/src/steel_memory.rs` |
| 配置（native_llama_api_url） | `eiva-core/src/config.rs`, `eiva-gateway/src/main.rs` |
| 串流回傳 | `eiva-core/src/gateway/protocol/server.rs` |

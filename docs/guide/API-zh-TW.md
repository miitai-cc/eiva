# EIVA API 參考指南（繁體中文）

> 基礎 URL：`http://localhost:39999/eiva/backend/api/ver-0.95`

本文件提供 EIVA 後端所有 REST 與 WebSocket 端點的完整參考，包含各語言程式碼範例。

---

## 目錄

1. [系統健康檢查](#1-系統健康檢查)
2. [WebSocket 即時通訊](#2-websocket-即時通訊)
3. [工作流程管理](#3-工作流程管理)
4. [MCP 伺服器管理](#4-mcp-伺服器管理)
5. [AI Skill 管理](#5-ai-skill-管理)
6. [Workspace 檔案管理](#6-workspace-檔案管理)
7. [排程管理](#7-排程管理)
8. [環境變數](#8-環境變數)

---

## 1. 系統健康檢查

用於確認後端服務是否正常運行。

### `GET /health`

回傳服務運行狀態。

**回應：**

```json
{ "ok": true }
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s "$BASE_URL/health"
```

**Rust（reqwest）**

```rust
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let resp: Value = reqwest::get(format!("{}/health", BASE))
        .await?
        .json()
        .await?;
    println!("{:#?}", resp);
    Ok(())
}
```

**C#（HttpClient）**

```csharp
using System.Net.Http;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

using var client = new HttpClient();
var response = await client.GetAsync($"{baseUrl}/health");
var json = await response.Content.ReadAsStringAsync();
Console.WriteLine(json);
```

**Java（java.net.http）**

```java
import java.net.http.*;
import java.net.URI;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/health"))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

## 2. WebSocket 即時通訊

透過 WebSocket 即時接收任務狀態、日誌等推播訊息。訊息格式使用 Protocol Buffers。

### `GET /ws`（Protobuf over WebSocket）

**前端可發送的訊息類型：**

| 訊息類型 | 說明 |
|---|---|
| `CreateTaskRequest` | 建立新任務 |
| `StopTaskRequest` | 停止執行中的任務 |
| `Ping` | 心跳保活 |

**後端推播的事件類型：**

| 事件類型 | 說明 |
|---|---|
| `TaskCreatedEvent` | 任務已建立 |
| `TaskStatusEvent` | 任務狀態變更 |
| `TaskLogEvent` | 任務輸出日誌 |
| `TaskCompletedEvent` | 任務已完成 |
| `TaskFailedEvent` | 任務執行失敗 |
| `TaskInterruptedEvent` | 任務被中斷 |

#### 程式碼範例

**curl**（curl 不原生支援 WebSocket，以下為連線測試）

```bash
# 使用 websocat 工具測試 WebSocket 連線
# 安裝: cargo install websocat
websocat "ws://localhost:39999/eiva/backend/api/ver-0.95/ws"
```

**Rust（tokio-tungstenite）**

```rust
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::connect_async;
use tungstenite::Message;

const WS_URL: &str = "ws://localhost:39999/eiva/backend/api/ver-0.95/ws";

#[tokio::main]
async fn main() {
    // 建立 WebSocket 連線
    let (mut ws_stream, _) = connect_async(WS_URL)
        .await
        .expect("無法建立 WebSocket 連線");

    // 發送 Ping 訊息
    ws_stream.send(Message::Ping(b"ping".to_vec())).await.unwrap();

    // 接收伺服器推播
    while let Some(msg) = ws_stream.next().await {
        match msg {
            Ok(Message::Binary(data)) => {
                println!("收到二進位資料: {} bytes", data.len());
                // 解碼 Protobuf 訊息...
            }
            Ok(Message::Text(text)) => {
                println!("收到文字: {}", text);
            }
            Ok(Message::Close(_)) => {
                println!("連線已關閉");
                break;
            }
            Err(e) => {
                eprintln!("錯誤: {}", e);
                break;
            }
            _ => {}
        }
    }
}
```

**C#（System.Net.WebSockets）**

```csharp
using System.Net.WebSockets;
using System.Text;

string wsUrl = "ws://localhost:39999/eiva/backend/api/ver-0.95/ws";

using var ws = new ClientWebSocket();
await ws.ConnectAsync(new Uri(wsUrl), CancellationToken.None);

// 接收推播的背景任務
var recvTask = Task.Run(async () =>
{
    var buffer = new byte[4096];
    while (ws.State == WebSocketState.Open)
    {
        var result = await ws.ReceiveAsync(buffer, CancellationToken.None);
        if (result.MessageType == WebSocketMessageType.Close)
        {
            await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
        }
        else
        {
            var data = Encoding.UTF8.GetString(buffer, 0, result.Count);
            Console.WriteLine($"收到: {data}");
        }
    }
});

// 發送 Ping（二進位 Protobuf 訊息）
var pingBytes = Encoding.UTF8.GetBytes("ping");
await ws.SendAsync(pingBytes, WebSocketMessageType.Binary, true, CancellationToken.None);

await recvTask;
```

**Java（java.net.http.WebSocket）**

```java
import java.net.URI;
import java.net.http.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

String wsUrl = "ws://localhost:39999/eiva/backend/api/ver-0.95/ws";

var client = HttpClient.newHttpClient();
client.newWebSocketBuilder()
        .buildAsync(URI.create(wsUrl), new WebSocket.Listener() {
            @Override
            public void onOpen(WebSocket webSocket) {
                System.out.println("已連線");
                webSocket.request(1);
            }

            @Override
            public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                System.out.println("收到文字: " + data);
                webSocket.request(1);
                return CompletableFuture.completedFuture(null);
            }

            @Override
            public CompletionStage<?> onBinary(WebSocket webSocket, java.nio.ByteBuffer data, boolean last) {
                System.out.println("收到二進位資料");
                webSocket.request(1);
                return CompletableFuture.completedFuture(null);
            }

            @Override
            public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                System.out.println("連線關閉: " + statusCode);
                return CompletableFuture.completedFuture(null);
            }

            @Override
            public void onError(WebSocket webSocket, Throwable error) {
                System.err.println("錯誤: " + error.getMessage());
            }
        })
        .join();
```

---

## 3. 工作流程管理

管理 EIVA 的工作流程定義。

### `GET /workflows`

取得所有可用的工作流程列表。

**回應：**

```json
{
  "workflows": [
    {
      "id": "wf-001",
      "name": "自動化部署流程",
      "data": {}
    }
  ]
}
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s "$BASE_URL/workflows" | jq
```

**Rust**

```rust
use serde::{Deserialize, Serialize};

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[derive(Serialize, Deserialize, Debug)]
struct Workflow {
    id: String,
    name: String,
    data: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug)]
struct WorkflowList {
    workflows: Vec<Workflow>,
}

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let resp: WorkflowList = reqwest::get(format!("{}/workflows", BASE))
        .await?
        .json()
        .await?;
    println!("{:#?}", resp);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

using var client = new HttpClient();
var json = await client.GetStringAsync($"{baseUrl}/workflows");
var doc = JsonDocument.Parse(json);
Console.WriteLine(JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true }));
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/workflows"))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `GET /workflow/<id>`

取得指定工作流程的詳細資訊，包含節點與連線定義。

**回應：**

```json
{
  "id": "wf-001",
  "data": {
    "nodes": [],
    "edges": []
  }
}
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
WORKFLOW_ID="wf-001"

curl -s "$BASE_URL/workflow/$WORKFLOW_ID" | jq
```

**Rust**

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let workflow_id = "wf-001";
    let resp: serde_json::Value = reqwest::get(format!("{}/workflow/{}", BASE, workflow_id))
        .await?
        .json()
        .await?;
    println!("{:#?}", resp);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string workflowId = "wf-001";

using var client = new HttpClient();
var json = await client.GetStringAsync($"{baseUrl}/workflow/{workflowId}");
Console.WriteLine(json);
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String workflowId = "wf-001";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/workflow/" + workflowId))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `POST /workflow/<id>`

更新指定工作流程的定義。

**請求主體：**

```json
{
  "name": "自動化部署流程",
  "nodes": [],
  "edges": []
}
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
WORKFLOW_ID="wf-001"

curl -s -X POST "$BASE_URL/workflow/$WORKFLOW_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "自動化部署流程",
    "nodes": [],
    "edges": []
  }'
```

**Rust**

```rust
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let workflow_id = "wf-001";
    let body = json!({
        "name": "自動化部署流程",
        "nodes": [],
        "edges": []
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/workflow/{}", BASE, workflow_id))
        .json(&body)
        .send()
        .await?;
    println!("狀態: {}", resp.status());
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string workflowId = "wf-001";

var body = new
{
    name = "自動化部署流程",
    nodes = Array.Empty<object>(),
    edges = Array.Empty<object>()
};

using var client = new HttpClient();
var content = new StringContent(
    JsonSerializer.Serialize(body),
    Encoding.UTF8,
    "application/json"
);
var response = await client.PostAsync($"{baseUrl}/workflow/{workflowId}", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

**Java**

```java
import java.net.URI;
import java.net.http.*;
import java.net.http.HttpRequest.BodyPublishers;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String workflowId = "wf-001";

var body = """
        {
            "name": "自動化部署流程",
            "nodes": [],
            "edges": []
        }
        """;

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/workflow/" + workflowId))
        .POST(BodyPublishers.ofString(body))
        .header("Content-Type", "application/json")
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

## 4. MCP 伺服器管理

管理 Model Context Protocol（MCP）伺服器實例。

### `GET /mcp-servers`

取得所有 MCP 伺服器列表。

**回應：**

```json
[
  {
    "id": "mcp-001",
    "name": "檔案系統伺服器",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem"],
    "env": {},
    "cwd": "/tmp",
    "enabled": true,
    "timeout_secs": 30
  }
]
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s "$BASE_URL/mcp-servers" | jq
```

**Rust**

```rust
use serde::{Deserialize, Serialize};

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[derive(Serialize, Deserialize, Debug)]
struct McpServer {
    id: String,
    name: String,
    command: String,
    args: Vec<String>,
    env: serde_json::Value,
    cwd: String,
    enabled: bool,
    timeout_secs: u64,
}

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let servers: Vec<McpServer> = reqwest::get(format!("{}/mcp-servers", BASE))
        .await?
        .json()
        .await?;
    for s in &servers {
        println!("{}: {}", s.id, s.name);
    }
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

using var client = new HttpClient();
var json = await client.GetStringAsync($"{baseUrl}/mcp-servers");
var doc = JsonDocument.Parse(json);
Console.WriteLine(JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true }));
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/mcp-servers"))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `GET /mcp-server/<id>`

取得指定 MCP 伺服器的詳細資訊。

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
SERVER_ID="mcp-001"

curl -s "$BASE_URL/mcp-server/$SERVER_ID" | jq
```

**Rust**

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let server_id = "mcp-001";
    let resp: serde_json::Value = reqwest::get(format!("{}/mcp-server/{}", BASE, server_id))
        .await?
        .json()
        .await?;
    println!("{:#?}", resp);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string serverId = "mcp-001";

using var client = new HttpClient();
var json = await client.GetStringAsync($"{baseUrl}/mcp-server/{serverId}");
Console.WriteLine(json);
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String serverId = "mcp-001";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/mcp-server/" + serverId))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `POST /mcp-server/<id>`

建立或更新指定 MCP 伺服器。

**請求主體：**

```json
{
  "name": "檔案系統伺服器",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem"],
  "env": {},
  "cwd": "/tmp",
  "enabled": true,
  "timeout_secs": 30
}
```

**回應：**

```json
{ "status": "ok", "id": "mcp-001" }
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
SERVER_ID="mcp-001"

curl -s -X POST "$BASE_URL/mcp-server/$SERVER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "檔案系統伺服器",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem"],
    "env": {},
    "cwd": "/tmp",
    "enabled": true,
    "timeout_secs": 30
  }'
```

**Rust**

```rust
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let server_id = "mcp-001";
    let body = json!({
        "name": "檔案系統伺服器",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem"],
        "env": {},
        "cwd": "/tmp",
        "enabled": true,
        "timeout_secs": 30
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/mcp-server/{}", BASE, server_id))
        .json(&body)
        .send()
        .await?;
    println!("{}: {}", resp.status(), resp.text().await?);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string serverId = "mcp-001";

var body = new
{
    name = "檔案系統伺服器",
    command = "npx",
    args = new[] { "-y", "@modelcontextprotocol/server-filesystem" },
    env = new { },
    cwd = "/tmp",
    enabled = true,
    timeout_secs = 30
};

using var client = new HttpClient();
var content = new StringContent(
    JsonSerializer.Serialize(body),
    Encoding.UTF8,
    "application/json"
);
var response = await client.PostAsync($"{baseUrl}/mcp-server/{serverId}", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

**Java**

```java
import java.net.URI;
import java.net.http.*;
import java.net.http.HttpRequest.BodyPublishers;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String serverId = "mcp-001";

var body = """
        {
            "name": "檔案系統伺服器",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem"],
            "env": {},
            "cwd": "/tmp",
            "enabled": true,
            "timeout_secs": 30
        }
        """;

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/mcp-server/" + serverId))
        .POST(BodyPublishers.ofString(body))
        .header("Content-Type", "application/json")
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `DELETE /mcp-server/<id>`

刪除指定 MCP 伺服器。

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
SERVER_ID="mcp-001"

curl -s -X DELETE "$BASE_URL/mcp-server/$SERVER_ID"
```

**Rust**

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let server_id = "mcp-001";
    let client = reqwest::Client::new();
    let resp = client
        .delete(format!("{}/mcp-server/{}", BASE, server_id))
        .send()
        .await?;
    println!("刪除狀態: {}", resp.status());
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string serverId = "mcp-001";

using var client = new HttpClient();
var response = await client.DeleteAsync($"{baseUrl}/mcp-server/{serverId}");
Console.WriteLine($"刪除狀態: {response.StatusCode}");
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String serverId = "mcp-001";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/mcp-server/" + serverId))
        .DELETE()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println("刪除狀態: " + response.statusCode());
```

---

### `POST /mcp-server/<id>/test`

測試指定 MCP 伺服器的連線。

**回應：** 成功或錯誤訊息。

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
SERVER_ID="mcp-001"

curl -s -X POST "$BASE_URL/mcp-server/$SERVER_ID/test"
```

**Rust**

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let server_id = "mcp-001";
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/mcp-server/{}/test", BASE, server_id))
        .send()
        .await?;
    println!("測試結果: {}", resp.text().await?);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string serverId = "mcp-001";

using var client = new HttpClient();
var response = await client.PostAsync($"{baseUrl}/mcp-server/{serverId}/test", null);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

**Java**

```java
import java.net.URI;
import java.net.http.*;
import java.net.http.HttpRequest.BodyPublishers;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String serverId = "mcp-001";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/mcp-server/" + serverId + "/test"))
        .POST(BodyPublishers.noBody())
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

## 5. AI Skill 管理

管理 EIVA 的 AI 技能定義。

### `GET /skills`

取得所有可用的 AI 技能列表。

**回應：**

```json
[
  {
    "id": "skill-001",
    "name": "程式碼審查",
    "description": "自動審查程式碼品質與安全性",
    "instructions": "檢查程式碼中的潛在問題...",
    "enabled": true,
    "linked_secrets": ["api-key-1"]
  }
]
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s "$BASE_URL/skills" | jq
```

**Rust**

```rust
use serde::{Deserialize, Serialize};

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[derive(Serialize, Deserialize, Debug)]
struct Skill {
    id: String,
    name: String,
    description: String,
    instructions: String,
    enabled: bool,
    linked_secrets: Vec<String>,
}

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let skills: Vec<Skill> = reqwest::get(format!("{}/skills", BASE))
        .await?
        .json()
        .await?;
    for s in &skills {
        println!("{}: {}", s.id, s.name);
    }
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

using var client = new HttpClient();
var json = await client.GetStringAsync($"{baseUrl}/skills");
var doc = JsonDocument.Parse(json);
Console.WriteLine(JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true }));
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/skills"))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `GET /skill/<id>`

取得指定 AI 技能的詳細資訊。

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
SKILL_ID="skill-001"

curl -s "$BASE_URL/skill/$SKILL_ID" | jq
```

**Rust**

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let skill_id = "skill-001";
    let resp: serde_json::Value = reqwest::get(format!("{}/skill/{}", BASE, skill_id))
        .await?
        .json()
        .await?;
    println!("{:#?}", resp);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string skillId = "skill-001";

using var client = new HttpClient();
var json = await client.GetStringAsync($"{baseUrl}/skill/{skillId}");
Console.WriteLine(json);
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String skillId = "skill-001";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/skill/" + skillId))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `POST /skill/<id>`

建立或更新指定 AI 技能。

**請求主體：**

```json
{
  "name": "程式碼審查",
  "description": "自動審查程式碼品質與安全性",
  "instructions": "檢查程式碼中的潛在問題...",
  "enabled": true,
  "linked_secrets": ["api-key-1"]
}
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
SKILL_ID="skill-001"

curl -s -X POST "$BASE_URL/skill/$SKILL_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "程式碼審查",
    "description": "自動審查程式碼品質與安全性",
    "instructions": "檢查程式碼中的潛在問題...",
    "enabled": true,
    "linked_secrets": ["api-key-1"]
  }'
```

**Rust**

```rust
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let skill_id = "skill-001";
    let body = json!({
        "name": "程式碼審查",
        "description": "自動審查程式碼品質與安全性",
        "instructions": "檢查程式碼中的潛在問題...",
        "enabled": true,
        "linked_secrets": ["api-key-1"]
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/skill/{}", BASE, skill_id))
        .json(&body)
        .send()
        .await?;
    println!("{}: {}", resp.status(), resp.text().await?);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string skillId = "skill-001";

var body = new
{
    name = "程式碼審查",
    description = "自動審查程式碼品質與安全性",
    instructions = "檢查程式碼中的潛在問題...",
    enabled = true,
    linked_secrets = new[] { "api-key-1" }
};

using var client = new HttpClient();
var content = new StringContent(
    JsonSerializer.Serialize(body),
    Encoding.UTF8,
    "application/json"
);
var response = await client.PostAsync($"{baseUrl}/skill/{skillId}", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

**Java**

```java
import java.net.URI;
import java.net.http.*;
import java.net.http.HttpRequest.BodyPublishers;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String skillId = "skill-001";

var body = """
        {
            "name": "程式碼審查",
            "description": "自動審查程式碼品質與安全性",
            "instructions": "檢查程式碼中的潛在問題...",
            "enabled": true,
            "linked_secrets": ["api-key-1"]
        }
        """;

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/skill/" + skillId))
        .POST(BodyPublishers.ofString(body))
        .header("Content-Type", "application/json")
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `DELETE /skill/<id>`

刪除指定 AI 技能。

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
SKILL_ID="skill-001"

curl -s -X DELETE "$BASE_URL/skill/$SKILL_ID"
```

**Rust**

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let skill_id = "skill-001";
    let client = reqwest::Client::new();
    let resp = client
        .delete(format!("{}/skill/{}", BASE, skill_id))
        .send()
        .await?;
    println!("刪除狀態: {}", resp.status());
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string skillId = "skill-001";

using var client = new HttpClient();
var response = await client.DeleteAsync($"{baseUrl}/skill/{skillId}");
Console.WriteLine($"刪除狀態: {response.StatusCode}");
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String skillId = "skill-001";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/skill/" + skillId))
        .DELETE()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println("刪除狀態: " + response.statusCode());
```

---

### `POST /skill/<id>/test`

測試指定 AI 技能的執行效果。

**回應：** 成功或錯誤訊息。

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
SKILL_ID="skill-001"

curl -s -X POST "$BASE_URL/skill/$SKILL_ID/test"
```

**Rust**

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let skill_id = "skill-001";
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/skill/{}/test", BASE, skill_id))
        .send()
        .await?;
    println!("測試結果: {}", resp.text().await?);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string skillId = "skill-001";

using var client = new HttpClient();
var response = await client.PostAsync($"{baseUrl}/skill/{skillId}/test", null);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

**Java**

```java
import java.net.URI;
import java.net.http.*;
import java.net.http.HttpRequest.BodyPublishers;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String skillId = "skill-001";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/skill/" + skillId + "/test"))
        .POST(BodyPublishers.noBody())
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

## 6. Workspace 檔案管理

管理工作空間中的檔案與目錄。所有端點的 URL 前綴為 `/workspace`（即完整路徑為 `BASE_URL/workspace/...`）。

### `GET /workspace/tree`

取得工作空間的完整目錄樹狀結構（遞迴）。

**回應：** 遞迴 JSON 樹狀結構。

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s "$BASE_URL/workspace/tree" | jq
```

**Rust**

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let resp: serde_json::Value = reqwest::get(format!("{}/workspace/tree", BASE))
        .await?
        .json()
        .await?;
    println!("{:#?}", resp);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

using var client = new HttpClient();
var json = await client.GetStringAsync($"{baseUrl}/workspace/tree");
var doc = JsonDocument.Parse(json);
Console.WriteLine(JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true }));
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/workspace/tree"))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `GET /workspace/list?path=<rel>`

列出指定目錄下的內容。回傳結果以目錄優先排序，再按名稱排序。

**查詢參數：**

| 參數 | 類型 | 必填 | 說明 |
|---|---|---|---|
| `path` | string | 否 | 相對於工作空間根目錄的路徑，預設為根目錄 |

**回應：**

```json
{
  "entries": [
    { "name": "src", "isDir": true, "size": 0, "modified": "2026-07-12T10:00:00Z" },
    { "name": "README.md", "isDir": false, "size": 1024, "modified": "2026-07-12T09:00:00Z" }
  ]
}
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

# 列出根目錄
curl -s "$BASE_URL/workspace/list" | jq

# 列出指定路徑
curl -s "$BASE_URL/workspace/list?path=src" | jq
```

**Rust**

```rust
use serde::{Deserialize, Serialize};

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[derive(Serialize, Deserialize, Debug)]
struct Entry {
    name: String,
    is_dir: bool,
    size: u64,
    modified: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct ListResponse {
    entries: Vec<Entry>,
}

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let path = "src";
    let resp: ListResponse = reqwest::get(format!("{}/workspace/list?path={}", BASE, path))
        .await?
        .json()
        .await?;
    for e in &resp.entries {
        let kind = if e.is_dir { "目錄" } else { "檔案" };
        println!("[{}] {} ({} bytes)", kind, e.name, e.size);
    }
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string path = "src";

using var client = new HttpClient();
var json = await client.GetStringAsync($"{baseUrl}/workspace/list?path={path}");
Console.WriteLine(json);
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String path = "src";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/workspace/list?path=" + path))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `GET /workspace/file?path=<rel>`

讀取指定檔案的原始內容。

**查詢參數：**

| 參數 | 類型 | 必填 | 說明 |
|---|---|---|---|
| `path` | string | 是 | 相對於工作空間根目錄的檔案路徑 |

**回應：** 檔案原始內容（純文字或二進位）。

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s "$BASE_URL/workspace/file?path=README.md"
```

**Rust**

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let path = "README.md";
    let content = reqwest::get(format!("{}/workspace/file?path={}", BASE, path))
        .await?
        .text()
        .await?;
    println!("{}", content);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string path = "README.md";

using var client = new HttpClient();
var content = await client.GetStringAsync($"{baseUrl}/workspace/file?path={path}");
Console.WriteLine(content);
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String path = "README.md";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/workspace/file?path=" + path))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `POST /workspace/file`

上傳檔案到指定路徑。使用 multipart form-data 格式。

**請求格式：** `multipart/form-data`

| 欄位 | 類型 | 說明 |
|---|---|---|
| `path` | string | 目標檔案路徑 |
| `file` | binary | 檔案內容 |

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s -X POST "$BASE_URL/workspace/file" \
  -F "path=src/main.rs" \
  -F "file=@./main.rs"
```

**Rust**

```rust
use reqwest::multipart;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let path = "src/main.rs";
    let file_content = std::fs::read("main.rs").expect("無法讀取檔案");

    let form = multipart::Form::new()
        .text("path", path.to_string())
        .part(
            "file",
            multipart::Part::bytes(file_content)
                .file_name("main.rs")
                .mime_str("application/octet-stream")?,
        );

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/workspace/file", BASE))
        .multipart(form)
        .send()
        .await?;
    println!("上傳結果: {}", resp.text().await?);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
string targetPath = "src/main.rs";
string filePath = "./main.rs";

using var client = new HttpClient();
using var form = new MultipartFormDataContent();
form.Add(new StringContent(targetPath), "path");
form.Add(new ByteArrayContent(File.ReadAllBytes(filePath)), "file", Path.GetFileName(filePath));

var response = await client.PostAsync($"{baseUrl}/workspace/file", form);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

**Java**

```java
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";
String targetPath = "src/main.rs";
String filePath = "./main.rs";

// Java 使用邊界分隔符建立 multipart 請求
var boundary = "----EivaBoundary" + System.currentTimeMillis();
var body = """
        ------EivaBoundary%s
        Content-Disposition: form-data; name="path"

        %s
        ------EivaBoundary%s
        Content-Disposition: form-data; name="file"; filename="main.rs"
        Content-Type: application/octet-stream

        %s
        ------EivaBoundary%s--
        """.formatted(boundary, targetPath, boundary,
        Files.readString(Path.of(filePath)), boundary);

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/workspace/file"))
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .header("Content-Type", "multipart/form-data; boundary=" + boundary)
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `POST /workspace/dir`

建立新目錄。

**請求主體：**

```json
{ "path": "src/new-dir" }
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s -X POST "$BASE_URL/workspace/dir" \
  -H "Content-Type: application/json" \
  -d '{ "path": "src/new-dir" }'
```

**Rust**

```rust
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let body = json!({ "path": "src/new-dir" });
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/workspace/dir", BASE))
        .json(&body)
        .send()
        .await?;
    println!("建立目錄結果: {}", resp.text().await?);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var body = new { path = "src/new-dir" };

using var client = new HttpClient();
var content = new StringContent(
    JsonSerializer.Serialize(body),
    Encoding.UTF8,
    "application/json"
);
var response = await client.PostAsync($"{baseUrl}/workspace/dir", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

**Java**

```java
import java.net.URI;
import java.net.http.*;
import java.net.http.HttpRequest.BodyPublishers;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var body = """
        { "path": "src/new-dir" }
        """;

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/workspace/dir"))
        .POST(BodyPublishers.ofString(body))
        .header("Content-Type", "application/json")
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `POST /workspace/delete`

刪除指定檔案或目錄。

**請求主體：**

```json
{ "path": "src/old-file.rs" }
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s -X POST "$BASE_URL/workspace/delete" \
  -H "Content-Type: application/json" \
  -d '{ "path": "src/old-file.rs" }'
```

**Rust**

```rust
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let body = json!({ "path": "src/old-file.rs" });
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/workspace/delete", BASE))
        .json(&body)
        .send()
        .await?;
    println!("刪除結果: {}", resp.text().await?);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var body = new { path = "src/old-file.rs" };

using var client = new HttpClient();
var content = new StringContent(
    JsonSerializer.Serialize(body),
    Encoding.UTF8,
    "application/json"
);
var response = await client.PostAsync($"{baseUrl}/workspace/delete", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

**Java**

```java
import java.net.URI;
import java.net.http.*;
import java.net.http.HttpRequest.BodyPublishers;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var body = """
        { "path": "src/old-file.rs" }
        """;

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/workspace/delete"))
        .POST(BodyPublishers.ofString(body))
        .header("Content-Type", "application/json")
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

### `POST /workspace/rename`

重新命名檔案或目錄。`newName` 不可包含 `/` 或 `\`。

**請求主體：**

```json
{ "path": "src/old-name.rs", "newName": "new-name.rs" }
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s -X POST "$BASE_URL/workspace/rename" \
  -H "Content-Type: application/json" \
  -d '{ "path": "src/old-name.rs", "newName": "new-name.rs" }'
```

**Rust**

```rust
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let body = json!({
        "path": "src/old-name.rs",
        "newName": "new-name.rs"
    });
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/workspace/rename", BASE))
        .json(&body)
        .send()
        .await?;
    println!("重新命名結果: {}", resp.text().await?);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var body = new { path = "src/old-name.rs", newName = "new-name.rs" };

using var client = new HttpClient();
var content = new StringContent(
    JsonSerializer.Serialize(body),
    Encoding.UTF8,
    "application/json"
);
var response = await client.PostAsync($"{baseUrl}/workspace/rename", content);
Console.WriteLine(await response.Content.ReadAsStringAsync());
```

**Java**

```java
import java.net.URI;
import java.net.http.*;
import java.net.http.HttpRequest.BodyPublishers;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var body = """
        { "path": "src/old-name.rs", "newName": "new-name.rs" }
        """;

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/workspace/rename"))
        .POST(BodyPublishers.ofString(body))
        .header("Content-Type", "application/json")
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

## 7. 排程管理

管理 EIVA 的定時排程任務。

### `GET /schedules`

取得所有排程列表。

**回應：**

```json
{
  "schedules": [
    {
      "id": "sch-001",
      "name": "每日備份",
      "cron": "0 2 * * *",
      "enabled": true
    }
  ]
}
```

#### 程式碼範例

**curl**

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"

curl -s "$BASE_URL/schedules" | jq
```

**Rust**

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let resp: serde_json::Value = reqwest::get(format!("{}/schedules", BASE))
        .await?
        .json()
        .await?;
    println!("{:#?}", resp);
    Ok(())
}
```

**C#**

```csharp
using System.Net.Http;
using System.Text.Json;

string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

using var client = new HttpClient();
var json = await client.GetStringAsync($"{baseUrl}/schedules");
var doc = JsonDocument.Parse(json);
Console.WriteLine(JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true }));
```

**Java**

```java
import java.net.URI;
import java.net.http.*;

String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
        .uri(URI.create(baseUrl + "/schedules"))
        .GET()
        .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

---

## 8. 環境變數

以下環境變數可用於設定 EIVA 後端服務。

| 環境變數 | 說明 | 預設值 |
|---|---|---|
| `RUST_LOG` | Rust 日誌等級設定（如 `debug`、`info`、`warn`、`error`） | `info` |
| `RUSTYCLAW_VAULT_PASSWORD` | 密碼保管庫的主密碼，用於加密儲存敏感資訊 | — |
| `RUSTYCLAW_MODEL_API_KEY` | AI 模型服務的 API 金鑰（通用） | — |
| `RUSTYCLAW_RATE_LIMIT` | API 請求速率限制（每秒最大請求数） | `10` |
| `OPENAI_API_KEY` | OpenAI API 金鑰，用於 GPT 系列模型 | — |
| `ANTHROPIC_API_KEY` | Anthropic API 金鑰，用於 Claude 系列模型 | — |
| `GOOGLE_API_KEY` | Google AI API 金鑰，用於 Gemini 系列模型 | — |

---

## 附錄：通用錯誤回應

所有端點在發生錯誤時可能回傳以下格式：

```json
{
  "error": "錯誤訊息描述"
}
```

常見 HTTP 狀態碼：

| 狀態碼 | 說明 |
|---|---|
| `200 OK` | 請求成功 |
| `201 Created` | 資源已建立 |
| `400 Bad Request` | 請求格式錯誤 |
| `404 Not Found` | 資源不存在 |
| `500 Internal Server Error` | 伺服器內部錯誤 |

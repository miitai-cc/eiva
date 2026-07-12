# EIVA API リファレンスガイド

ベース URL: `http://localhost:39999/eiva/backend/api/ver-0.95`

---

## 目次

1. [ヘルスチェック](#1-ヘルスチェック)
2. [WebSocket](#2-websocket)
3. [ワークフロー管理](#3-ワークフロー管理)
4. [MCP サーバー管理](#4-mcp-サーバー管理)
5. [AI スキル管理](#5-ai-スキル管理)
6. [ワークスペースファイル管理](#6-ワークスペースファイル管理)
7. [スケジュール管理](#7-スケジュール管理)
8. [環境変数](#8-環境変数)

---

## 1. ヘルスチェック

サーバーの生存確認に使用します。

### `GET /health`

正常時に `200 OK` を返し、ボディにステータスを含みます。

**レスポンス例:**

```json
{
  "ok": true
}
```

### コード例

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/health"
```

#### Rust

```rust
use reqwest;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    // ヘルスチェックエンドポイントにリクエストを送信
    let resp = reqwest::get(format!("{}/health", BASE)).await?;
    let body: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&body)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        // ヘルスチェックリクエストを送信
        var response = await client.GetStringAsync($"{baseUrl}/health");
        var doc = JsonDocument.Parse(response);
        Console.WriteLine(JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true }));
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class HealthCheck {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        // HTTP クライアントを生成
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/health"))
            .GET()
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## 2. WebSocket

Protocol Buffers (Protobuf) を使用したリアルタイム通信チャネルです。
クライアントからのタスク作成・停止要求やサーバーからのステータス通知に使用します。

### `GET /ws` (Protobuf over WebSocket)

#### クライアント→サーバー メッセージ

| メッセージ | 説明 |
|---|---|
| `CreateTaskRequest` | 新しいタスクを作成する要求 |
| `StopTaskRequest` | 実行中のタスクを停止する要求 |
| `Ping` | 接続維持用の心拍 |

#### サーバー→クライアント イベント

| イベント | 説明 |
|---|---|
| `TaskCreatedEvent` | タスクが作成されたことを通知 |
| `TaskStatusEvent` | タスクのステータスが変化したことを通知 |
| `TaskLogEvent` | タスクからのログ出力を通知 |
| `TaskCompletedEvent` | タスクが正常に完了したことを通知 |
| `TaskFailedEvent` | タスクが失敗したことを通知 |
| `TaskInterruptedEvent` | タスクが中断されたことを通知 |

### コード例

#### curl

```bash
# WebSocket 接続には websocat 等のクライアントが必要です
# websocat を使用した例
websocat "ws://localhost:39999/eiva/backend/api/ver-0.95/ws"
```

#### Rust

```rust
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures::{SinkExt, StreamExt};
use serde_json;

const BASE_WS: &str = "ws://localhost:39999/eiva/backend/api/ver-0.95/ws";

#[tokio::main]
async fn main() {
    // WebSocket サーバーに接続
    let (ws_stream, _) = connect_async(BASE_WS)
        .await
        .expect("WebSocket 接続に失敗しました");

    let (mut write, mut read) = ws_stream.split();

    // Ping メッセージを送信して接続を維持
    let ping_msg = serde_json::json!({ "type": "Ping" });
    write.send(Message::Text(ping_msg.to_string())).await.unwrap();

    // サーバーからのメッセージを受信
    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                println!("受信: {}", text);
            }
            Ok(Message::Close(_)) => {
                println!("接続が閉じられました");
                break;
            }
            Err(e) => {
                eprintln!("エラー: {}", e);
                break;
            }
            _ => {}
        }
    }
}
```

#### C#

```csharp
using System;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

class Program
{
    static string wsUrl = "ws://localhost:39999/eiva/backend/api/ver-0.95/ws";

    static async Task Main()
    {
        // WebSocket クライアントを生成
        using var client = new ClientWebSocket();
        await client.ConnectAsync(new Uri(wsUrl), CancellationToken.None);
        Console.WriteLine("WebSocket 接続成功");

        // Ping メッセージを送信
        var ping = JsonSerializer.Serialize(new { type = "Ping" });
        var pingBytes = Encoding.UTF8.GetBytes(ping);
        await client.SendAsync(
            new ArraySegment<byte>(pingBytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None);

        // サーバーからのメッセージを受信
        var buffer = new byte[4096];
        while (client.State == WebSocketState.Open)
        {
            var result = await client.ReceiveAsync(
                new ArraySegment<byte>(buffer), CancellationToken.None);
            if (result.MessageType == WebSocketMessageType.Text)
            {
                var msg = Encoding.UTF8.GetString(buffer, 0, result.Count);
                Console.WriteLine($"受信: {msg}");
            }
            else if (result.MessageType == WebSocketMessageType.Close)
            {
                Console.WriteLine("接続が閉じられました");
            }
        }
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.WebSocket;
import java.util.concurrent.CompletionStage;

public class WebSocketExample {
    static String wsUrl = "ws://localhost:39999/eiva/backend/api/ver-0.95/ws";

    public static void main(String[] args) throws Exception {
        // WebSocket リスナーを定義
        WebSocket.Listener listener = new WebSocket.Listener() {
            @Override
            public void onOpen(WebSocket webSocket) {
                System.out.println("WebSocket 接続成功");
                webSocket.request(1);
                // Ping メッセージを送信
                webSocket.sendText("{\"type\":\"Ping\"}", true);
            }

            @Override
            public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                System.out.println("受信: " + data);
                webSocket.request(1);
                return null;
            }

            @Override
            public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                System.out.println("接続が閉じられました: " + reason);
                return null;
            }

            @Override
            public void onError(WebSocket webSocket, Throwable error) {
                System.err.println("エラー: " + error.getMessage());
            }
        };

        // WebSocket に接続
        WebSocket ws = java.net.http.HttpClient.newHttpClient()
            .newWebSocketBuilder()
            .buildAsync(URI.create(wsUrl), listener)
            .join();
    }
}
```

---

## 3. ワークフロー管理

ワークフローの一覧取得・詳細取得・更新を行います。

### `GET /workflows`

登録されているワークフローの一覧を返します。

**レスポンス例:**

```json
{
  "workflows": [
    {
      "id": "wf-001",
      "name": "サンプルワークフロー",
      "data": { "nodes": [], "edges": [] }
    }
  ]
}
```

### コード例 (GET /workflows)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/workflows"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    // ワークフロー一覧を取得
    let resp = reqwest::get(format!("{}/workflows", BASE)).await?;
    let body: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&body)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        // ワークフロー一覧を取得
        var response = await client.GetStringAsync($"{baseUrl}/workflows");
        var doc = JsonDocument.Parse(response);
        Console.WriteLine(JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true }));
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WorkflowList {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/workflows"))
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `GET /workflow/<id>`

指定した ID のワークフロー詳細を返します。

**レスポンス例:**

```json
{
  "id": "wf-001",
  "data": {
    "nodes": [
      { "id": "node-1", "type": "input", "data": {} }
    ],
    "edges": [
      { "source": "node-1", "target": "node-2" }
    ]
  }
}
```

### コード例 (GET /workflow/<id>)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/workflow/wf-001"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    // 特定のワークフロー詳細を取得
    let workflow_id = "wf-001";
    let resp = reqwest::get(format!("{}/workflow/{}", BASE, workflow_id)).await?;
    let body: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&body)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        // 特定のワークフロー詳細を取得
        string workflowId = "wf-001";
        var response = await client.GetStringAsync($"{baseUrl}/workflow/{workflowId}");
        var doc = JsonDocument.Parse(response);
        Console.WriteLine(JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true }));
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WorkflowDetail {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String workflowId = "wf-001";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/workflow/" + workflowId))
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /workflow/<id>`

ワークフローを更新します。リクエストボディに新しいノードとエッジを含めます。

**リクエストボディ例:**

```json
{
  "name": "更新されたワークフロー",
  "nodes": [
    { "id": "node-1", "type": "input", "data": {} }
  ],
  "edges": [
    { "source": "node-1", "target": "node-2" }
  ]
}
```

### コード例 (POST /workflow/<id>)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s -X POST "$BASE_URL/workflow/wf-001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新されたワークフロー",
    "nodes": [{ "id": "node-1", "type": "input", "data": {} }],
    "edges": [{ "source": "node-1", "target": "node-2" }]
  }'
```

#### Rust

```rust
use reqwest;
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let workflow_id = "wf-001";

    // ワークフローを更新
    let body = json!({
        "name": "更新されたワークフロー",
        "nodes": [{ "id": "node-1", "type": "input", "data": {} }],
        "edges": [{ "source": "node-1", "target": "node-2" }]
    });

    let resp = client
        .post(format!("{}/workflow/{}", BASE, workflow_id))
        .json(&body)
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    let result: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        // ワークフローを更新
        string workflowId = "wf-001";
        var payload = new
        {
            name = "更新されたワークフロー",
            nodes = new[] { new { id = "node-1", type = "input", data = new { } } },
            edges = new[] { new { source = "node-1", target = "node-2" } }
        };
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync($"{baseUrl}/workflow/{workflowId}", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WorkflowUpdate {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String workflowId = "wf-001";
        String json = """
            {
              "name": "更新されたワークフロー",
              "nodes": [{"id": "node-1", "type": "input", "data": {}}],
              "edges": [{"source": "node-1", "target": "node-2"}]
            }
            """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workflow/" + workflowId))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## 4. MCP サーバー管理

Model Context Protocol (MCP) サーバーの CRUD 操作を行います。

### `GET /mcp-servers`

登録されている MCP サーバーの一覧を返します。

**レスポンス例:**

```json
[
  {
    "id": "mcp-001",
    "name": "ファイルシステムサーバー",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem"],
    "env": {},
    "cwd": "/tmp",
    "enabled": true,
    "timeout_secs": 30
  }
]
```

### コード例 (GET /mcp-servers)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/mcp-servers"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    // MCP サーバー一覧を取得
    let resp = reqwest::get(format!("{}/mcp-servers", BASE)).await?;
    let body: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&body)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        // MCP サーバー一覧を取得
        var response = await client.GetStringAsync($"{baseUrl}/mcp-servers");
        var doc = JsonDocument.Parse(response);
        Console.WriteLine(JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true }));
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class McpServerList {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/mcp-servers"))
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `GET /mcp-server/<id>`

指定した ID の MCP サーバー詳細を返します。

### コード例 (GET /mcp-server/<id>)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/mcp-server/mcp-001"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let mcp_id = "mcp-001";
    let resp = reqwest::get(format!("{}/mcp-server/{}", BASE, mcp_id)).await?;
    let body: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&body)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string mcpId = "mcp-001";
        var response = await client.GetStringAsync($"{baseUrl}/mcp-server/{mcpId}");
        var doc = JsonDocument.Parse(response);
        Console.WriteLine(JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true }));
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class McpServerDetail {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String mcpId = "mcp-001";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/mcp-server/" + mcpId))
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /mcp-server/<id>`

MCP サーバーを作成または更新します。

**リクエストボディ:**

```json
{
  "name": "ファイルシステムサーバー",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem"],
  "env": {},
  "cwd": "/tmp",
  "enabled": true,
  "timeout_secs": 30
}
```

**レスポンス例:**

```json
{
  "status": "ok",
  "id": "mcp-001"
}
```

### コード例 (POST /mcp-server/<id>)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s -X POST "$BASE_URL/mcp-server/mcp-001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ファイルシステムサーバー",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem"],
    "env": {},
    "cwd": "/tmp",
    "enabled": true,
    "timeout_secs": 30
  }'
```

#### Rust

```rust
use reqwest;
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let mcp_id = "mcp-001";

    let body = json!({
        "name": "ファイルシステムサーバー",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem"],
        "env": {},
        "cwd": "/tmp",
        "enabled": true,
        "timeout_secs": 30
    });

    let resp = client
        .post(format!("{}/mcp-server/{}", BASE, mcp_id))
        .json(&body)
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    let result: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string mcpId = "mcp-001";
        var payload = new
        {
            name = "ファイルシステムサーバー",
            command = "npx",
            args = new[] { "-y", "@modelcontextprotocol/server-filesystem" },
            env = new { },
            cwd = "/tmp",
            enabled = true,
            timeout_secs = 30
        };
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync($"{baseUrl}/mcp-server/{mcpId}", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class McpServerCreate {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String mcpId = "mcp-001";
        String json = """
            {
              "name": "ファイルシステムサーバー",
              "command": "npx",
              "args": ["-y", "@modelcontextprotocol/server-filesystem"],
              "env": {},
              "cwd": "/tmp",
              "enabled": true,
              "timeout_secs": 30
            }
            """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/mcp-server/" + mcpId))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `DELETE /mcp-server/<id>`

指定した MCP サーバーを削除します。

### コード例 (DELETE /mcp-server/<id>)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s -X DELETE "$BASE_URL/mcp-server/mcp-001"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let mcp_id = "mcp-001";

    // MCP サーバーを削除
    let resp = client
        .delete(format!("{}/mcp-server/{}", BASE, mcp_id))
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string mcpId = "mcp-001";
        var response = await client.DeleteAsync($"{baseUrl}/mcp-server/{mcpId}");
        Console.WriteLine($"ステータス: {response.StatusCode}");
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class McpServerDelete {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String mcpId = "mcp-001";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/mcp-server/" + mcpId))
            .DELETE()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("ステータス: " + response.statusCode());
    }
}
```

---

### `POST /mcp-server/<id>/test`

MCP サーバーの接続テストを実行します。成功時は成功レスポンス、失敗時はエラーレスポンスを返します。

### コード例 (POST /mcp-server/<id>/test)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s -X POST "$BASE_URL/mcp-server/mcp-001/test"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let mcp_id = "mcp-001";

    // MCP サーバーの接続テストを実行
    let resp = client
        .post(format!("{}/mcp-server/{}/test", BASE, mcp_id))
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    let result: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string mcpId = "mcp-001";
        var response = await client.PostAsync($"{baseUrl}/mcp-server/{mcpId}/test", null);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class McpServerTest {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String mcpId = "mcp-001";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/mcp-server/" + mcpId + "/test"))
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## 5. AI スキル管理

AI スキルの CRUD 操作を行います。

### `GET /skills`

登録されている AI スキルの一覧を返します。

**レスポンス例:**

```json
[
  {
    "id": "skill-001",
    "name": "コードレビュー",
    "description": "コードの品質をチェックするスキル",
    "instructions": "コードを分析し、改善点を提案してください。",
    "enabled": true,
    "linked_secrets": ["API_KEY"]
  }
]
```

### コード例 (GET /skills)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/skills"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    // AI スキル一覧を取得
    let resp = reqwest::get(format!("{}/skills", BASE)).await?;
    let body: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&body)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        // AI スキル一覧を取得
        var response = await client.GetStringAsync($"{baseUrl}/skills");
        var doc = JsonDocument.Parse(response);
        Console.WriteLine(JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true }));
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class SkillList {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/skills"))
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `GET /skill/<id>`

指定した ID の AI スキル詳細を返します。

### コード例 (GET /skill/<id>)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/skill/skill-001"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let skill_id = "skill-001";
    let resp = reqwest::get(format!("{}/skill/{}", BASE, skill_id)).await?;
    let body: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&body)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string skillId = "skill-001";
        var response = await client.GetStringAsync($"{baseUrl}/skill/{skillId}");
        var doc = JsonDocument.Parse(response);
        Console.WriteLine(JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true }));
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class SkillDetail {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String skillId = "skill-001";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/skill/" + skillId))
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /skill/<id>`

AI スキルを作成または更新します。

**リクエストボディ:**

```json
{
  "name": "コードレビュー",
  "description": "コードの品質をチェックするスキル",
  "instructions": "コードを分析し、改善点を提案してください。",
  "enabled": true,
  "linked_secrets": ["API_KEY"]
}
```

### コード例 (POST /skill/<id>)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s -X POST "$BASE_URL/skill/skill-001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "コードレビュー",
    "description": "コードの品質をチェックするスキル",
    "instructions": "コードを分析し、改善点を提案してください。",
    "enabled": true,
    "linked_secrets": ["API_KEY"]
  }'
```

#### Rust

```rust
use reqwest;
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let skill_id = "skill-001";

    let body = json!({
        "name": "コードレビュー",
        "description": "コードの品質をチェックするスキル",
        "instructions": "コードを分析し、改善点を提案してください。",
        "enabled": true,
        "linked_secrets": ["API_KEY"]
    });

    let resp = client
        .post(format!("{}/skill/{}", BASE, skill_id))
        .json(&body)
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    let result: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string skillId = "skill-001";
        var payload = new
        {
            name = "コードレビュー",
            description = "コードの品質をチェックするスキル",
            instructions = "コードを分析し、改善点を提案してください。",
            enabled = true,
            linked_secrets = new[] { "API_KEY" }
        };
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync($"{baseUrl}/skill/{skillId}", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class SkillCreate {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String skillId = "skill-001";
        String json = """
            {
              "name": "コードレビュー",
              "description": "コードの品質をチェックするスキル",
              "instructions": "コードを分析し、改善点を提案してください。",
              "enabled": true,
              "linked_secrets": ["API_KEY"]
            }
            """;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/skill/" + skillId))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `DELETE /skill/<id>`

指定した AI スキルを削除します。

### コード例 (DELETE /skill/<id>)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s -X DELETE "$BASE_URL/skill/skill-001"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let skill_id = "skill-001";

    let resp = client
        .delete(format!("{}/skill/{}", BASE, skill_id))
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string skillId = "skill-001";
        var response = await client.DeleteAsync($"{baseUrl}/skill/{skillId}");
        Console.WriteLine($"ステータス: {response.StatusCode}");
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class SkillDelete {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String skillId = "skill-001";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/skill/" + skillId))
            .DELETE()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("ステータス: " + response.statusCode());
    }
}
```

---

### `POST /skill/<id>/test`

AI スキルのテストを実行します。成功時は成功レスポンス、失敗時はエラーレスポンスを返します。

### コード例 (POST /skill/<id>/test)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s -X POST "$BASE_URL/skill/skill-001/test"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let skill_id = "skill-001";

    let resp = client
        .post(format!("{}/skill/{}/test", BASE, skill_id))
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    let result: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string skillId = "skill-001";
        var response = await client.PostAsync($"{baseUrl}/skill/{skillId}/test", null);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class SkillTest {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String skillId = "skill-001";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/skill/" + skillId + "/test"))
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## 6. ワークスペースファイル管理

ワークスペース内のファイルとディレクトリの操作を行います。
全エンドポイントのプレフィックスは `/workspace` です。

### `GET /workspace/tree`

ワークスペース全体のファイルツリーを再帰的に JSON で返します。

**レスポンス例:**

```json
{
  "name": "workspace",
  "isDir": true,
  "children": [
    {
      "name": "src",
      "isDir": true,
      "children": [
        { "name": "main.rs", "isDir": false, "size": 1024 }
      ]
    },
    { "name": "README.md", "isDir": false, "size": 256 }
  ]
}
```

### コード例 (GET /workspace/tree)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/workspace/tree"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    // ワークスペースのファイルツリーを取得
    let resp = reqwest::get(format!("{}/workspace/tree", BASE)).await?;
    let body: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&body)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var response = await client.GetStringAsync($"{baseUrl}/workspace/tree");
        var doc = JsonDocument.Parse(response);
        Console.WriteLine(JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true }));
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WorkspaceTree {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/workspace/tree"))
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `GET /workspace/list?path=<rel>`

指定したディレクトリの内容を一覧表示します。ディレクトリが優先され、アルファベット順にソートされます。

**パラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `path` | string | いいえ | 相対パス。省略時はルートを返します。 |

**レスポンス例:**

```json
{
  "entries": [
    { "name": "src", "isDir": true, "size": 0, "modified": "2025-01-15T10:30:00Z" },
    { "name": "README.md", "isDir": false, "size": 256, "modified": "2025-01-14T08:00:00Z" }
  ]
}
```

### コード例 (GET /workspace/list)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/workspace/list?path=src"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    // 特定ディレクトリの一覧を取得
    let dir_path = "src";
    let resp = reqwest::get(format!("{}/workspace/list?path={}", BASE, dir_path)).await?;
    let body: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&body)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        // 特定ディレクトリの一覧を取得
        string dirPath = "src";
        var response = await client.GetStringAsync($"{baseUrl}/workspace/list?path={dirPath}");
        var doc = JsonDocument.Parse(response);
        Console.WriteLine(JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true }));
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WorkspaceList {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String dirPath = "src";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/workspace/list?path=" + dirPath))
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `GET /workspace/file?path=<rel>`

指定したファイルの内容を生テキストで返します。

**パラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `path` | string | はい | ファイルの相対パス |

**レスポンス:** ファイルの内容が生テキストとして返されます。

### コード例 (GET /workspace/file)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/workspace/file?path=README.md"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    // ファイル内容を取得
    let file_path = "README.md";
    let resp = reqwest::get(format!("{}/workspace/file?path={}", BASE, file_path)).await?;
    let content = resp.text().await?;
    println!("{}", content);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        // ファイル内容を取得
        string filePath = "README.md";
        var response = await client.GetStringAsync($"{baseUrl}/workspace/file?path={filePath}");
        Console.WriteLine(response);
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WorkspaceFile {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String filePath = "README.md";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/workspace/file?path=" + filePath))
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /workspace/file`

ファイルをアップロードします。multipart/form-data 形式で `path`（保存先パス）と `file`（ファイル本体）を送信します。

**リクエスト形式:**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `path` | string | はい | 保存先の相対パス |
| `file` | binary | はい | アップロードするファイル |

### コード例 (POST /workspace/file)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
# ファイルをアップロード
curl -s -X POST "$BASE_URL/workspace/file" \
  -F "path=uploads/test.txt" \
  -F "file=@./test.txt"
```

#### Rust

```rust
use reqwest;
use std::fs;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();

    // ファイルを読み込み
    let file_bytes = fs::read("./test.txt").expect("ファイルの読み込みに失敗しました");

    // multipart フォームでアップロード
    let form = reqwest::multipart::Form::new()
        .text("path", "uploads/test.txt")
        .part(
            "file",
            reqwest::multipart::Part::bytes(file_bytes).file_name("test.txt"),
        );

    let resp = client
        .post(format!("{}/workspace/file", BASE))
        .multipart(form)
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    let result: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        // ファイルをアップロード
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent("uploads/test.txt"), "path");
        content.Add(new ByteArrayContent(File.ReadAllBytes("./test.txt")), "file", "test.txt");

        var response = await client.PostAsync($"{baseUrl}/workspace/file", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.nio.file.Paths;

public class WorkspaceFileUpload {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        Path filePath = Paths.get("./test.txt");
        String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";

        // multipart ボディを構築
        String body = "--" + boundary + "\r\n"
            + "Content-Disposition: form-data; name=\"path\"\r\n\r\n"
            + "uploads/test.txt\r\n"
            + "--" + boundary + "\r\n"
            + "Content-Disposition: form-data; name=\"file\"; filename=\"test.txt\"\r\n"
            + "Content-Type: application/octet-stream\r\n\r\n"
            + new String(java.nio.file.Files.readAllBytes(filePath)) + "\r\n"
            + "--" + boundary + "--\r\n";

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/file"))
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /workspace/dir`

新しいディレクトリを作成します。

**リクエストボディ:**

```json
{
  "path": "new-directory"
}
```

### コード例 (POST /workspace/dir)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s -X POST "$BASE_URL/workspace/dir" \
  -H "Content-Type: application/json" \
  -d '{"path": "new-directory"}'
```

#### Rust

```rust
use reqwest;
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();

    let body = json!({ "path": "new-directory" });

    let resp = client
        .post(format!("{}/workspace/dir", BASE))
        .json(&body)
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    let result: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var payload = new { path = "new-directory" };
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync($"{baseUrl}/workspace/dir", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WorkspaceDirCreate {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String json = "{\"path\": \"new-directory\"}";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/dir"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /workspace/delete`

ファイルまたはディレクトリを削除します。

**リクエストボディ:**

```json
{
  "path": "target-file.txt"
}
```

### コード例 (POST /workspace/delete)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s -X POST "$BASE_URL/workspace/delete" \
  -H "Content-Type: application/json" \
  -d '{"path": "target-file.txt"}'
```

#### Rust

```rust
use reqwest;
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();

    let body = json!({ "path": "target-file.txt" });

    let resp = client
        .post(format!("{}/workspace/delete", BASE))
        .json(&body)
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var payload = new { path = "target-file.txt" };
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync($"{baseUrl}/workspace/delete", content);
        Console.WriteLine($"ステータス: {response.StatusCode}");
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WorkspaceDelete {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String json = "{\"path\": \"target-file.txt\"}";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/delete"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("ステータス: " + response.statusCode());
    }
}
```

---

### `POST /workspace/rename`

ファイルまたはディレクトリの名前を変更します。`newName` に `/` や `\` を含めることはできません。

**リクエストボディ:**

```json
{
  "path": "old-name.txt",
  "newName": "new-name.txt"
}
```

### コード例 (POST /workspace/rename)

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s -X POST "$BASE_URL/workspace/rename" \
  -H "Content-Type: application/json" \
  -d '{"path": "old-name.txt", "newName": "new-name.txt"}'
```

#### Rust

```rust
use reqwest;
use serde_json::json;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();

    let body = json!({
        "path": "old-name.txt",
        "newName": "new-name.txt"
    });

    let resp = client
        .post(format!("{}/workspace/rename", BASE))
        .json(&body)
        .send()
        .await?;

    println!("ステータス: {}", resp.status());
    let result: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&result)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var payload = new { path = "old-name.txt", newName = "new-name.txt" };
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.PostAsync($"{baseUrl}/workspace/rename", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

#### Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class WorkspaceRename {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String json = "{\"path\": \"old-name.txt\", \"newName\": \"new-name.txt\"}";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/rename"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## 7. スケジュール管理

スケジュールされたタスクの一覧を返します。

### `GET /schedules`

登録されているスケジュールの一覧を返します。

**レスポンス例:**

```json
{
  "schedules": [
    {
      "id": "sched-001",
      "name": "毎日のバックアップ",
      "cron": "0 2 * * *",
      "workflow_id": "wf-001",
      "enabled": true
    }
  ]
}
```

### コード例

#### curl

```bash
BASE_URL="http://localhost:39999/eiva/backend/api/ver-0.95"
curl -s "$BASE_URL/schedules"
```

#### Rust

```rust
const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    // スケジュール一覧を取得
    let resp = reqwest::get(format!("{}/schedules", BASE)).await?;
    let body: serde_json::Value = resp.json().await?;
    println!("{}", serde_json::to_string_pretty(&body)?);
    Ok(())
}
```

#### C#

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    static string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        // スケジュール一覧を取得
        var response = await client.GetStringAsync($"{baseUrl}/schedules");
        var doc = JsonDocument.Parse(response);
        Console.WriteLine(JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true }));
    }
}
```

#### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ScheduleList {
    static String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(java.net.URI.create(baseUrl + "/schedules"))
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## 8. 環境変数

サーバーの動作を制御する環境変数一覧です。

| 環境変数 | 説明 | 例 |
|---|---|---|
| `RUST_LOG` | Rust ログレベルを設定します。`debug`, `info`, `warn`, `error` 等が使用できます。 | `RUST_LOG=info` |
| `RUSTYCLAW_VAULT_PASSWORD` | Vault（機密情報ストア）のパスワードを設定します。 | `RUSTYCLAW_VAULT_PASSWORD=secret` |
| `RUSTYCLAW_MODEL_API_KEY` | AI モデル API の共通キーを設定します。 | `RUSTYCLAW_MODEL_API_KEY=sk-...` |
| `RUSTYCLAW_RATE_LIMIT` | API リクエストのレート制限（リクエスト/秒）を設定します。 | `RUSTYCLAW_RATE_LIMIT=10` |
| `OPENAI_API_KEY` | OpenAI API キーを設定します。 | `OPENAI_API_KEY=sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API キーを設定します。 | `ANTHROPIC_API_KEY=sk-ant-...` |
| `GOOGLE_API_KEY` | Google AI API キーを設定します。 | `GOOGLE_API_KEY=AIza...` |

### コード例

#### curl (環境変数の設定例)

```bash
# 環境変数を設定してサーバーを起動
export RUST_LOG=info
export RUSTYCLAW_VAULT_PASSWORD=secret
export RUSTYCLAW_MODEL_API_KEY=sk-example-key
export RUSTYCLAW_RATE_LIMIT=10
export OPENAI_API_KEY=sk-openai-key
export ANTHROPIC_API_KEY=sk-ant-key
export GOOGLE_API_KEY=AIza-key

# サーバーを起動
cargo run --release
```

#### Rust (環境変数の読み込み例)

```rust
use std::env;

fn main() {
    // 環境変数を読み込み
    let rust_log = env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string());
    let vault_password = env::var("RUSTYCLAW_VAULT_PASSWORD").unwrap_or_default();
    let api_key = env::var("RUSTYCLAW_MODEL_API_KEY").unwrap_or_default();
    let rate_limit = env::var("RUSTYCLAW_RATE_LIMIT").unwrap_or_else(|_| "10".to_string());

    println!("RUST_LOG: {}", rust_log);
    println!("VAULT_PASSWORD: {}...", &vault_password[..4.min(vault_password.len())]);
    println!("MODEL_API_KEY: {}...", &api_key[..4.min(api_key.len())]);
    println!("RATE_LIMIT: {}", rate_limit);
}
```

#### C# (環境変数の読み込み例)

```csharp
using System;

class Program
{
    static void Main()
    {
        // 環境変数を読み込み
        string rustLog = Environment.GetEnvironmentVariable("RUST_LOG") ?? "info";
        string vaultPassword = Environment.GetEnvironmentVariable("RUSTYCLAW_VAULT_PASSWORD") ?? "";
        string apiKey = Environment.GetEnvironmentVariable("RUSTYCLAW_MODEL_API_KEY") ?? "";
        string rateLimit = Environment.GetEnvironmentVariable("RUSTYCLAW_RATE_LIMIT") ?? "10";

        Console.WriteLine($"RUST_LOG: {rustLog}");
        Console.WriteLine($"VAULT_PASSWORD: {vaultPassword[..Math.Min(4, vaultPassword.Length)]}...");
        Console.WriteLine($"MODEL_API_KEY: {apiKey[..Math.Min(4, apiKey.Length)]}...");
        Console.WriteLine($"RATE_LIMIT: {rateLimit}");
    }
}
```

#### Java (環境変数の読み込み例)

```java
public class EnvVars {
    public static void main(String[] args) {
        // 環境変数を読み込み
        String rustLog = System.getenv().getOrDefault("RUST_LOG", "info");
        String vaultPassword = System.getenv().getOrDefault("RUSTYCLAW_VAULT_PASSWORD", "");
        String apiKey = System.getenv().getOrDefault("RUSTYCLAW_MODEL_API_KEY", "");
        String rateLimit = System.getenv().getOrDefault("RUSTYCLAW_RATE_LIMIT", "10");

        System.out.println("RUST_LOG: " + rustLog);
        System.out.println("VAULT_PASSWORD: " + vaultPassword.substring(0, Math.min(4, vaultPassword.length())) + "...");
        System.out.println("MODEL_API_KEY: " + apiKey.substring(0, Math.min(4, apiKey.length())) + "...");
        System.out.println("RATE_LIMIT: " + rateLimit);
    }
}
```

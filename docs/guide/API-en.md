# EIVA API Reference Guide (English)

**Base URL:** `http://localhost:39999/eiva/backend/api/ver-0.95`

---

## 1. Health Check

### `GET /health`

Returns the health status of the server.

**Response:**

```json
{ "ok": true }
```

#### Code Examples

**curl:**

```bash
curl http://localhost:39999/eiva/backend/api/ver-0.95/health
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let resp: Value = reqwest::get(format!("{}/health", BASE))
        .await?
        .json()
        .await?;
    println!("{}", resp);
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var response = await client.GetStringAsync($"{baseUrl}/health");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/health"))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## 2. WebSocket

### `GET /ws`

Establish a WebSocket connection using Protobuf encoding.

**Protocol:**

- Client sends: `CreateTaskRequest`, `StopTaskRequest`, `Ping`
- Server sends: `TaskCreatedEvent`, `TaskStatusEvent`, `TaskLogEvent`, `TaskCompletedEvent`, `TaskFailedEvent`, `TaskInterruptedEvent`

**Message Types (Protobuf):**

| Direction | Message | Description |
|-----------|---------|-------------|
| Client → Server | `CreateTaskRequest` | Start a new task |
| Client → Server | `StopTaskRequest` | Stop a running task |
| Client → Server | `Ping` | Keep-alive ping |
| Server → Client | `TaskCreatedEvent` | Task successfully created |
| Server → Client | `TaskStatusEvent` | Task status update |
| Server → Client | `TaskLogEvent` | Log output from task |
| Server → Client | `TaskCompletedEvent` | Task finished successfully |
| Server → Client | `TaskFailedEvent` | Task failed |
| Server → Client | `TaskInterruptedEvent` | Task was interrupted |

#### Code Examples

**curl:**

```bash
# Note: curl does not natively support Protobuf over WebSocket.
# Use websocat or a custom client for Protobuf messages.
# Basic WebSocket connection test (without Protobuf):
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://localhost:39999/eiva/backend/api/ver-0.95/ws
```

**Rust:**

```rust
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};

const BASE_WS: &str = "ws://localhost:39999/eiva/backend/api/ver-0.95/ws";

#[tokio::main]
async fn main() {
    let (ws_stream, _) = connect_async(BASE_WS).await.expect("Failed to connect");
    let (mut write, mut read) = ws_stream.split();

    // Send a Protobuf-encoded CreateTaskRequest
    let create_task_request = vec![0x0a, 0x04, 0x74, 0x65, 0x73, 0x74]; // example bytes
    write.send(Message::Binary(create_task_request)).await.unwrap();

    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Binary(data)) => {
                println!("Received binary: {:02x?}", data);
            }
            Ok(Message::Text(text)) => {
                println!("Received text: {}", text);
            }
            Ok(Message::Close(_)) => break,
            Err(e) => {
                eprintln!("Error: {}", e);
                break;
            }
            _ => {}
        }
    }
}
```

**C#:**

```csharp
using System;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;

class Program
{
    const string baseUrl = "ws://localhost:39999/eiva/backend/api/ver-0.95/ws";

    static async Task Main()
    {
        using var client = new ClientWebSocket();
        await client.ConnectAsync(new Uri(baseUrl), CancellationToken.None);
        Console.WriteLine("Connected to WebSocket");

        // Send a Protobuf-encoded CreateTaskRequest
        byte[] createTaskRequest = new byte[] { 0x0a, 0x04, 0x74, 0x65, 0x73, 0x74 };
        await client.SendAsync(
            new ArraySegment<byte>(createTaskRequest),
            WebSocketMessageType.Binary,
            true,
            CancellationToken.None);

        var buffer = new byte[4096];
        while (client.State == WebSocketState.Open)
        {
            var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                await client.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
            }
            else
            {
                Console.WriteLine($"Received: {BitConverter.ToString(buffer, 0, result.Count)}");
            }
        }
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.WebSocket;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public class Main {
    static final String baseUrl = "ws://localhost:39999/eiva/backend/api/ver-0.95/ws";

    public static void main(String[] args) throws Exception {
        CompletableFuture<WebSocket> wsFuture = new CompletableFuture<>();
        WebSocket.Builder builder = new java.net.http.HttpClient().newWebSocketBuilder();

        builder.buildAsync(URI.create(baseUrl), new WebSocket.Listener() {
            @Override
            public void onOpen(WebSocket webSocket) {
                System.out.println("Connected");
                WebSocket.Listener.super.onOpen(webSocket);
                // Send a Protobuf-encoded CreateTaskRequest
                byte[] createTaskRequest = new byte[]{0x0a, 0x04, 0x74, 0x65, 0x73, 0x74};
                webSocket.sendBinary(java.nio.ByteBuffer.wrap(createTaskRequest), true);
            }

            @Override
            public CompletionStage<?> onBinary(WebSocket webSocket, java.nio.ByteBuffer data, boolean last) {
                System.out.println("Received binary data");
                return WebSocket.Listener.super.onBinary(webSocket, data, last);
            }

            @Override
            public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                System.out.println("Closed: " + statusCode + " " + reason);
                return WebSocket.Listener.super.onClose(webSocket, statusCode, reason);
            }

            @Override
            public void onError(WebSocket webSocket, Throwable error) {
                System.err.println("Error: " + error.getMessage());
            }
        }).thenAccept(ws -> wsFuture.complete(ws));

        wsFuture.get(); // Block until done
    }
}
```

---

## 3. Workflow Management

### `GET /workflows`

List all available workflows.

**Response:**

```json
{
  "workflows": [
    {
      "id": "workflow-001",
      "name": "My Workflow",
      "data": { "nodes": [], "edges": [] }
    }
  ]
}
```

#### Code Examples

**curl:**

```bash
curl http://localhost:39999/eiva/backend/api/ver-0.95/workflows
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let resp: Value = reqwest::get(format!("{}/workflows", BASE))
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var response = await client.GetStringAsync($"{baseUrl}/workflows");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workflows"))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `GET /workflow/<id>`

Get a specific workflow by ID.

**Response:**

```json
{
  "id": "workflow-001",
  "data": {
    "nodes": [
      { "id": "node-1", "type": "start", "position": { "x": 0, "y": 0 } }
    ],
    "edges": [
      { "source": "node-1", "target": "node-2" }
    ]
  }
}
```

#### Code Examples

**curl:**

```bash
curl http://localhost:39999/eiva/backend/api/ver-0.95/workflow/workflow-001
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let workflow_id = "workflow-001";
    let resp: Value = reqwest::get(format!("{}/workflow/{}", BASE, workflow_id))
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string workflowId = "workflow-001";
        var response = await client.GetStringAsync($"{baseUrl}/workflow/{workflowId}");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String workflowId = "workflow-001";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workflow/" + workflowId))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /workflow/<id>`

Update a workflow by ID.

**Request Body:**

```json
{
  "name": "My Workflow",
  "nodes": [
    { "id": "node-1", "type": "start", "position": { "x": 0, "y": 0 } }
  ],
  "edges": [
    { "source": "node-1", "target": "node-2" }
  ]
}
```

#### Code Examples

**curl:**

```bash
curl -X POST http://localhost:39999/eiva/backend/api/ver-0.95/workflow/workflow-001 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Workflow",
    "nodes": [
      { "id": "node-1", "type": "start", "position": { "x": 0, "y": 0 } }
    ],
    "edges": [
      { "source": "node-1", "target": "node-2" }
    ]
  }'
```

**Rust:**

```rust
use reqwest;
use serde_json::{json, Value};

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let workflow_id = "workflow-001";
    let client = reqwest::Client::new();
    let resp = client.post(format!("{}/workflow/{}", BASE, workflow_id))
        .json(&json!({
            "name": "My Workflow",
            "nodes": [
                { "id": "node-1", "type": "start", "position": { "x": 0, "y": 0 } }
            ],
            "edges": [
                { "source": "node-1", "target": "node-2" }
            ]
        }))
        .send()
        .await?;
    println!("Status: {}", resp.status());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string workflowId = "workflow-001";
        var body = new
        {
            name = "My Workflow",
            nodes = new[] { new { id = "node-1", type = "start", position = new { x = 0, y = 0 } } },
            edges = new[] { new { source = "node-1", target = "node-2" } }
        };
        var json = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"{baseUrl}/workflow/{workflowId}", content);
        Console.WriteLine(response.StatusCode);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String workflowId = "workflow-001";
        String body = """
            {
              "name": "My Workflow",
              "nodes": [{ "id": "node-1", "type": "start", "position": { "x": 0, "y": 0 } }],
              "edges": [{ "source": "node-1", "target": "node-2" }]
            }
            """;
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workflow/" + workflowId))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.statusCode());
    }
}
```

---

## 4. MCP Server Management

### `GET /mcp-servers`

List all MCP servers.

**Response:**

```json
[
  {
    "id": "mcp-001",
    "name": "My MCP Server",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-everything"],
    "env": {},
    "cwd": "/tmp",
    "enabled": true,
    "timeout_secs": 30
  }
]
```

#### Code Examples

**curl:**

```bash
curl http://localhost:39999/eiva/backend/api/ver-0.95/mcp-servers
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let resp: Vec<Value> = reqwest::get(format!("{}/mcp-servers", BASE))
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var response = await client.GetStringAsync($"{baseUrl}/mcp-servers");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/mcp-servers"))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `GET /mcp-server/<id>`

Get a specific MCP server by ID.

**Response:**

```json
{
  "id": "mcp-001",
  "name": "My MCP Server",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-everything"],
  "env": {},
  "cwd": "/tmp",
  "enabled": true,
  "timeout_secs": 30
}
```

#### Code Examples

**curl:**

```bash
curl http://localhost:39999/eiva/backend/api/ver-0.95/mcp-server/mcp-001
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let mcp_id = "mcp-001";
    let resp: Value = reqwest::get(format!("{}/mcp-server/{}", BASE, mcp_id))
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string mcpId = "mcp-001";
        var response = await client.GetStringAsync($"{baseUrl}/mcp-server/{mcpId}");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String mcpId = "mcp-001";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/mcp-server/" + mcpId))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /mcp-server/<id>`

Create or update an MCP server.

**Request Body:**

```json
{
  "name": "My MCP Server",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-everything"],
  "env": {},
  "cwd": "/tmp",
  "enabled": true,
  "timeout_secs": 30
}
```

**Response:**

```json
{ "status": "ok", "id": "mcp-001" }
```

#### Code Examples

**curl:**

```bash
curl -X POST http://localhost:39999/eiva/backend/api/ver-0.95/mcp-server/mcp-001 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My MCP Server",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-everything"],
    "env": {},
    "cwd": "/tmp",
    "enabled": true,
    "timeout_secs": 30
  }'
```

**Rust:**

```rust
use reqwest;
use serde_json::{json, Value};

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let mcp_id = "mcp-001";
    let client = reqwest::Client::new();
    let resp: Value = client.post(format!("{}/mcp-server/{}", BASE, mcp_id))
        .json(&json!({
            "name": "My MCP Server",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-everything"],
            "env": {},
            "cwd": "/tmp",
            "enabled": true,
            "timeout_secs": 30
        }))
        .send()
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string mcpId = "mcp-001";
        var body = new
        {
            name = "My MCP Server",
            command = "npx",
            args = new[] { "-y", "@modelcontextprotocol/server-everything" },
            env = new { },
            cwd = "/tmp",
            enabled = true,
            timeout_secs = 30
        };
        var json = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"{baseUrl}/mcp-server/{mcpId}", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String mcpId = "mcp-001";
        String body = """
            {
              "name": "My MCP Server",
              "command": "npx",
              "args": ["-y", "@modelcontextprotocol/server-everything"],
              "env": {},
              "cwd": "/tmp",
              "enabled": true,
              "timeout_secs": 30
            }
            """;
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/mcp-server/" + mcpId))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `DELETE /mcp-server/<id>`

Delete an MCP server.

#### Code Examples

**curl:**

```bash
curl -X DELETE http://localhost:39999/eiva/backend/api/ver-0.95/mcp-server/mcp-001
```

**Rust:**

```rust
use reqwest;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let mcp_id = "mcp-001";
    let client = reqwest::Client::new();
    let resp = client.delete(format!("{}/mcp-server/{}", BASE, mcp_id))
        .send()
        .await?;
    println!("Status: {}", resp.status());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string mcpId = "mcp-001";
        var response = await client.DeleteAsync($"{baseUrl}/mcp-server/{mcpId}");
        Console.WriteLine(response.StatusCode);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String mcpId = "mcp-001";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/mcp-server/" + mcpId))
            .DELETE()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.statusCode());
    }
}
```

---

### `POST /mcp-server/<id>/test`

Test an MCP server connection and list available tools.

**Response (success):**

```json
{
  "status": "success",
  "server": "My MCP Server",
  "tools": [
    {
      "name": "echo",
      "description": "Echoes input back",
      "inputSchema": { "type": "object", "properties": { "message": { "type": "string" } } }
    }
  ],
  "tool_count": 1
}
```

**Response (error):**

```json
{
  "status": "error",
  "message": "Failed to start MCP server"
}
```

#### Code Examples

**curl:**

```bash
curl -X POST http://localhost:39999/eiva/backend/api/ver-0.95/mcp-server/mcp-001/test
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let mcp_id = "mcp-001";
    let client = reqwest::Client::new();
    let resp: Value = client.post(format!("{}/mcp-server/{}/test", BASE, mcp_id))
        .send()
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string mcpId = "mcp-001";
        var response = await client.PostAsync($"{baseUrl}/mcp-server/{mcpId}/test", null);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String mcpId = "mcp-001";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/mcp-server/" + mcpId + "/test"))
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## 5. AI Skill Management

### `GET /skills`

List all AI skills.

**Response:**

```json
[
  {
    "id": "skill-001",
    "name": "Code Review",
    "description": "Reviews code for best practices and potential issues",
    "instructions": "Analyze the provided code and suggest improvements...",
    "enabled": true,
    "linked_secrets": ["GITHUB_TOKEN"]
  }
]
```

#### Code Examples

**curl:**

```bash
curl http://localhost:39999/eiva/backend/api/ver-0.95/skills
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let resp: Vec<Value> = reqwest::get(format!("{}/skills", BASE))
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var response = await client.GetStringAsync($"{baseUrl}/skills");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/skills"))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `GET /skill/<id>`

Get a specific skill by ID.

**Response:**

```json
{
  "id": "skill-001",
  "name": "Code Review",
  "description": "Reviews code for best practices and potential issues",
  "instructions": "Analyze the provided code and suggest improvements...",
  "enabled": true,
  "linked_secrets": ["GITHUB_TOKEN"]
}
```

#### Code Examples

**curl:**

```bash
curl http://localhost:39999/eiva/backend/api/ver-0.95/skill/skill-001
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let skill_id = "skill-001";
    let resp: Value = reqwest::get(format!("{}/skill/{}", BASE, skill_id))
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string skillId = "skill-001";
        var response = await client.GetStringAsync($"{baseUrl}/skill/{skillId}");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String skillId = "skill-001";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/skill/" + skillId))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /skill/<id>`

Create or update an AI skill.

**Request Body:**

```json
{
  "name": "Code Review",
  "description": "Reviews code for best practices and potential issues",
  "instructions": "Analyze the provided code and suggest improvements...",
  "enabled": true,
  "linked_secrets": ["GITHUB_TOKEN"]
}
```

#### Code Examples

**curl:**

```bash
curl -X POST http://localhost:39999/eiva/backend/api/ver-0.95/skill/skill-001 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Code Review",
    "description": "Reviews code for best practices and potential issues",
    "instructions": "Analyze the provided code and suggest improvements...",
    "enabled": true,
    "linked_secrets": ["GITHUB_TOKEN"]
  }'
```

**Rust:**

```rust
use reqwest;
use serde_json::{json, Value};

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let skill_id = "skill-001";
    let client = reqwest::Client::new();
    let resp: Value = client.post(format!("{}/skill/{}", BASE, skill_id))
        .json(&json!({
            "name": "Code Review",
            "description": "Reviews code for best practices and potential issues",
            "instructions": "Analyze the provided code and suggest improvements...",
            "enabled": true,
            "linked_secrets": ["GITHUB_TOKEN"]
        }))
        .send()
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string skillId = "skill-001";
        var body = new
        {
            name = "Code Review",
            description = "Reviews code for best practices and potential issues",
            instructions = "Analyze the provided code and suggest improvements...",
            enabled = true,
            linked_secrets = new[] { "GITHUB_TOKEN" }
        };
        var json = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"{baseUrl}/skill/{skillId}", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String skillId = "skill-001";
        String body = """
            {
              "name": "Code Review",
              "description": "Reviews code for best practices and potential issues",
              "instructions": "Analyze the provided code and suggest improvements...",
              "enabled": true,
              "linked_secrets": ["GITHUB_TOKEN"]
            }
            """;
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/skill/" + skillId))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `DELETE /skill/<id>`

Delete an AI skill.

#### Code Examples

**curl:**

```bash
curl -X DELETE http://localhost:39999/eiva/backend/api/ver-0.95/skill/skill-001
```

**Rust:**

```rust
use reqwest;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let skill_id = "skill-001";
    let client = reqwest::Client::new();
    let resp = client.delete(format!("{}/skill/{}", BASE, skill_id))
        .send()
        .await?;
    println!("Status: {}", resp.status());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string skillId = "skill-001";
        var response = await client.DeleteAsync($"{baseUrl}/skill/{skillId}");
        Console.WriteLine(response.StatusCode);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String skillId = "skill-001";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/skill/" + skillId))
            .DELETE()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.statusCode());
    }
}
```

---

### `POST /skill/<id>/test`

Validate an AI skill configuration.

**Response (success):**

```json
{
  "status": "success",
  "skill": "Code Review",
  "warnings": [],
  "manager_validated": true
}
```

**Response (error):**

```json
{
  "status": "error",
  "skill": "Code Review",
  "errors": [
    "Missing required secret: GITHUB_TOKEN",
    "Invalid instruction format"
  ]
}
```

#### Code Examples

**curl:**

```bash
curl -X POST http://localhost:39999/eiva/backend/api/ver-0.95/skill/skill-001/test
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let skill_id = "skill-001";
    let client = reqwest::Client::new();
    let resp: Value = client.post(format!("{}/skill/{}/test", BASE, skill_id))
        .send()
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string skillId = "skill-001";
        var response = await client.PostAsync($"{baseUrl}/skill/{skillId}/test", null);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String skillId = "skill-001";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/skill/" + skillId + "/test"))
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## 6. Workspace File Management

All workspace endpoints use the prefix `/workspace`.

### `GET /workspace/tree`

Get a recursive JSON tree of the workspace.

**Response:**

```json
{
  "name": "workspace",
  "path": ".",
  "children": [
    {
      "name": "src",
      "path": "src",
      "children": [
        { "name": "main.rs", "path": "src/main.rs" },
        { "name": "lib.rs", "path": "src/lib.rs" }
      ]
    },
    { "name": "README.md", "path": "README.md" }
  ]
}
```

#### Code Examples

**curl:**

```bash
curl http://localhost:39999/eiva/backend/api/ver-0.95/workspace/tree
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let resp: Value = reqwest::get(format!("{}/workspace/tree", BASE))
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var response = await client.GetStringAsync($"{baseUrl}/workspace/tree");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/tree"))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `GET /workspace/list?path=<rel>`

List files in a directory. Directories are listed first, then alphabetically.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | No | Relative path from workspace root (default: `.`) |

**Response:**

```json
{
  "entries": [
    { "name": "src", "isDir": true, "size": 0, "modified": 1720000000 },
    { "name": "README.md", "isDir": false, "size": 1024, "modified": 1720000000 }
  ]
}
```

#### Code Examples

**curl:**

```bash
curl "http://localhost:39999/eiva/backend/api/ver-0.95/workspace/list?path=src"
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let rel_path = "src";
    let resp: Value = reqwest::get(format!("{}/workspace/list?path={}", BASE, rel_path))
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string relPath = "src";
        var response = await client.GetStringAsync($"{baseUrl}/workspace/list?path={relPath}");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String relPath = "src";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/list?path=" + relPath))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `GET /workspace/file?path=<rel>`

Read a file's raw content.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Relative file path from workspace root |

**Response:** Raw file content (text/plain or binary).

#### Code Examples

**curl:**

```bash
curl "http://localhost:39999/eiva/backend/api/ver-0.95/workspace/file?path=README.md"
```

**Rust:**

```rust
use reqwest;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let rel_path = "README.md";
    let resp = reqwest::get(format!("{}/workspace/file?path={}", BASE, rel_path))
        .await?
        .text()
        .await?;
    println!("{}", resp);
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        string relPath = "README.md";
        var response = await client.GetStringAsync($"{baseUrl}/workspace/file?path={relPath}");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String relPath = "README.md";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/file?path=" + relPath))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /workspace/file`

Upload a file to the workspace (multipart form).

**Request:** `multipart/form-data` with fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Destination relative path |
| `file` | file | Yes | The file to upload |

**Response:**

```json
{ "status": "ok", "filename": "example.txt" }
```

#### Code Examples

**curl:**

```bash
curl -X POST http://localhost:39999/eiva/backend/api/ver-0.95/workspace/file \
  -F "path=uploads/example.txt" \
  -F "file=@/path/to/local/file.txt"
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;
use std::fs::File;
use reqwest::multipart;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let file = File::open("example.txt")?;
    let part = multipart::Part::file("example.txt")?
        .mime_str("text/plain")?;
    let form = multipart::Form::new()
        .text("path", "uploads/example.txt")
        .part("file", part);

    let client = reqwest::Client::new();
    let resp: Value = client.post(format!("{}/workspace/file", BASE))
        .multipart(form)
        .send()
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent("uploads/example.txt"), "path");
        var fileContent = new ByteArrayContent(File.ReadAllBytes("example.txt"));
        content.Add(fileContent, "file", "example.txt");

        var response = await client.PostAsync($"{baseUrl}/workspace/file", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        var boundary = "----FormBoundary7MA4YWxkTrZu0gW";
        var body = """
            --%s\r
            Content-Disposition: form-data; name="path"\r
            \r
            uploads/example.txt\r
            --%s\r
            Content-Disposition: form-data; name="file"; filename="example.txt"\r
            Content-Type: text/plain\r
            \r
            %s\r
            --%s--\r
            """.formatted(boundary, boundary,
                Files.readString(Path.of("example.txt")), boundary);

        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/file"))
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /workspace/dir`

Create a directory in the workspace.

**Request Body:**

```json
{ "path": "new-directory" }
```

**Response:**

```json
{ "status": "ok", "path": "new-directory" }
```

#### Code Examples

**curl:**

```bash
curl -X POST http://localhost:39999/eiva/backend/api/ver-0.95/workspace/dir \
  -H "Content-Type: application/json" \
  -d '{ "path": "new-directory" }'
```

**Rust:**

```rust
use reqwest;
use serde_json::{json, Value};

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let resp: Value = client.post(format!("{}/workspace/dir", BASE))
        .json(&json!({ "path": "new-directory" }))
        .send()
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var body = new { path = "new-directory" };
        var json = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"{baseUrl}/workspace/dir", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String body = "{ \"path\": \"new-directory\" }";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/dir"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /workspace/delete`

Delete a file or directory.

**Request Body:**

```json
{ "path": "file-to-delete.txt" }
```

**Response:**

```json
{ "status": "ok" }
```

#### Code Examples

**curl:**

```bash
curl -X POST http://localhost:39999/eiva/backend/api/ver-0.95/workspace/delete \
  -H "Content-Type: application/json" \
  -d '{ "path": "file-to-delete.txt" }'
```

**Rust:**

```rust
use reqwest;
use serde_json::{json, Value};

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let resp: Value = client.post(format!("{}/workspace/delete", BASE))
        .json(&json!({ "path": "file-to-delete.txt" }))
        .send()
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var body = new { path = "file-to-delete.txt" };
        var json = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"{baseUrl}/workspace/delete", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String body = "{ \"path\": \"file-to-delete.txt\" }";
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/delete"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

### `POST /workspace/rename`

Rename a file or directory. The `newName` must not contain `/` or `\`.

**Request Body:**

```json
{ "path": "old-name.txt", "newName": "new-name.txt" }
```

**Response:**

```json
{ "status": "ok" }
```

#### Code Examples

**curl:**

```bash
curl -X POST http://localhost:39999/eiva/backend/api/ver-0.95/workspace/rename \
  -H "Content-Type: application/json" \
  -d '{ "path": "old-name.txt", "newName": "new-name.txt" }'
```

**Rust:**

```rust
use reqwest;
use serde_json::{json, Value};

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::new();
    let resp: Value = client.post(format!("{}/workspace/rename", BASE))
        .json(&json!({
            "path": "old-name.txt",
            "newName": "new-name.txt"
        }))
        .send()
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var body = new { path = "old-name.txt", newName = "new-name.txt" };
        var json = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"{baseUrl}/workspace/rename", content);
        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine(result);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        String body = """
            { "path": "old-name.txt", "newName": "new-name.txt" }
            """;
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/workspace/rename"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## 7. Schedules

### `GET /schedules`

List all configured schedules.

**Response:**

```json
{
  "schedules": [
    {
      "id": "schedule-001",
      "cron": "0 9 * * 1",
      "workflow_id": "workflow-001",
      "enabled": true,
      "last_run": 1720000000,
      "next_run": 1720086400
    }
  ]
}
```

#### Code Examples

**curl:**

```bash
curl http://localhost:39999/eiva/backend/api/ver-0.95/schedules
```

**Rust:**

```rust
use reqwest;
use serde_json::Value;

const BASE: &str = "http://localhost:39999/eiva/backend/api/ver-0.95";

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let resp: Value = reqwest::get(format!("{}/schedules", BASE))
        .await?
        .json()
        .await?;
    println!("{}", serde_json::to_string_pretty(&resp).unwrap());
    Ok(())
}
```

**C#:**

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static readonly HttpClient client = new HttpClient();
    const string baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    static async Task Main()
    {
        var response = await client.GetStringAsync($"{baseUrl}/schedules");
        Console.WriteLine(response);
    }
}
```

**Java:**

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    static final String baseUrl = "http://localhost:39999/eiva/backend/api/ver-0.95";

    public static void main(String[] args) throws Exception {
        var client = HttpClient.newHttpClient();
        var request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/schedules"))
            .GET()
            .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RUST_LOG` | Log level filter for Rust tracing (`trace`, `debug`, `info`, `warn`, `error`) | `info` |
| `RUSTYCLAW_VAULT_PASSWORD` | Master password for the encrypted secrets vault | *(none, required)* |
| `RUSTYCLAW_MODEL_API_KEY` | API key for the AI model provider (OpenAI-compatible) | *(none, required)* |
| `RUSTYCLAW_RATE_LIMIT` | Maximum requests per minute for the AI model | `60` |
| `OPENAI_API_KEY` | API key for OpenAI models (if using OpenAI directly) | *(none)* |
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude models | *(none)* |
| `GOOGLE_API_KEY` | API key for Google Gemini models | *(none)* |

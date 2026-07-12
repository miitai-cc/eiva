# EIVA 前後端認證機制 (Authentication Specification)

## 概述
本文件描述 EIVA 前端與後端 (Gateway) 之間的認證與連線建立過程，特別是基於 SSH 通訊協定的內部溝通機制。

## 架構說明
EIVA 的後端 `eiva-gateway` 內部實作了一個 SSH 伺服器 (`SshServer`)，用於接收與處理命令列或程式端的請求。前端呼叫 REST API 建立任務時，後端會啟動一個 `GatewayClient` 來與本機的 `eiva-gateway` SSH Server 建立連線，進而執行 Chat Prompt 或 Task。

### 認證流程 (SSH 公鑰認證)
1. **客戶端金鑰產生與載入**: 
   - `GatewayClient` 在建立連線時，會讀取預設的 Client Key (`~/.eiva/client_ed25519_key`)。若該金鑰不存在，則會自動生成一對新的 Ed25519 密碼匙。
2. **伺服器端授權清單載入**:
   - `eiva-gateway` 啟動時，會載入 `~/.eiva/authorized_clients` 檔案，作為受信任客戶端的清單。
3. **Trust on First Use (首次連線信任機制)**:
   - 若伺服器端目前沒有任何受信任的客戶端 (即 `authorized_clients` 為空)，當收到第一個連線請求時，伺服器會自動將該請求的 Public Key 記錄到 `authorized_clients` 中並允許連線。
4. **金鑰比對機制**:
   - 當客戶端發起 SSH 連線時，伺服器會接收並計算該連線的 Public Key 指紋 (SHA256 Fingerprint)。
   - 伺服器會走訪 `authorized_clients` 中所有的金鑰，同樣計算它們的指紋。
   - 若指紋比對一致，則允許連線 (Auth Accept)。
   - **注意**: 由於 `russh` 函式庫本身在比對 `PublicKey` 物件 (`PartialEq`) 時，可能會受到包含的註解字串 (Comment) 等資料結構影響而導致比對失敗。因此系統已實作明確使用密碼學指紋 (Fingerprint) 作為唯一判斷基準，以確保穩定性。

## REST API 與 WebSocket 事件對應
在前端建立對話或任務時，流程如下：
1. **建立任務**:
   - 前端發送 `POST /tasks`，帶有 `requirement` 等參數。
   - 後端接收後，會配置一組 `taskId` 並立刻回覆前端 (HTTP 202 Accepted)。
2. **發起內部 SSH 指令**:
   - 後端透過 `GatewayClient::connect` 使用自身的 `client_ed25519_key` 連接回 `eiva-gateway` 內部的 SSH Server。
   - 啟動後，使用 `client.chat(requirement)` 傳送指令給 Gateway。
3. **內部事件轉譯與 WebSocket 廣播**:
   - SSH 連線過程中，Gateway 會持續吐出 `GatewayEvent` (如：`Chunk`, `ToolOutput`, `ResponseDone` 等)。
   - 後端的 `create_task` 常駐背景工作，負責監聽這些 `GatewayEvent`，並將它們即時轉譯為前端定義的 WebSocket 通訊格式 (`proto::ServerMessage`，例如 `TaskLogEvent`, `TaskCompletedEvent`)。
   - 轉譯完成的訊息會送進 `tokio::sync::broadcast` 通道，最終由 `ws_handler` 把訊息推播給瀏覽器。
   - 前端的 WebSocket `socket.onmessage` 會接收這些事件並依序顯示模型的字串回應，或更新執行進度。

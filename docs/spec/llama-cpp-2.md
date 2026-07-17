# Native Llama Inference (llama-cpp-2) Specification

本文件記錄 Eiva 系統中內建 (In-process) 本地模型推理（Option B）的技術實作細節、環境依賴與設定方式。

## 1. 系統架構與相關做法 (Practices)

在 Eiva 中，當設定為「完全在本地執行」的 `inner` 模式時，系統不再依賴外部的 HTTP 推理引擎 (如 Ollama API 伺服器)，而是透過 Rust 原生的 C++ 綁定套件 `llama-cpp-2` 直接在後端行程 (Process) 的記憶體中載入 `.gguf` 模型並進行推理。

* **Provider 實作**：所有的 Native 推理邏輯皆封裝於 `eiva-claw-core/src/providers/native_llama.rs` 中。
* **懶加載機制 (Lazy Loading)**：為了避免啟動伺服器時的長時間等待，模型權重與 Backend 初始化被包裝在 `std::sync::OnceLock` 中。只有在接收到第一筆對話請求時，系統才會將 `.gguf` 檔案從硬碟載入至 CPU RAM 中。一旦載入後，模型實例將跨 Request 共用，加快後續的推論速度。
* **Prompt 格式化**：目前採用基礎的 ChatML 格式化，將使用者的歷史訊息 (`req.messages`) 轉換為連續的字串（包含 `<|im_start|>` 與 `<|im_end|>` 標記），再進行 Tokenize 傳入模型。
* **解碼與生成**：推理迴圈採用每次生成一個 Token 的 Greedy Sampling (貪婪演算法)，並利用 `token_to_piece_bytes` 方法處理 UTF-8 的對應轉換。

## 2. 功能規格 (Specifications)

* **啟動條件**：
  * 環境變數必須設定：`AGENT_MODE=inner`
  * 必須透過環境變數指定模型位置：`NATIVE_LLAMA_MODEL_PATH=/路徑/到/模型.gguf`
* **模型格式**：僅支援 `.gguf` 格式的本地大語言模型。
* **硬體加速**：目前採用純 CPU 模式進行推理 (`GGML_NATIVE=OFF`, 未啟用 `metal` 或 `cuda` 功能)。
* **Tool Calling 限制**：由於 `llama.cpp` 是底層的純文本生成引擎，本身不包含像 OpenAI 一樣的 JSON Schema 自動解析。因此若需要 Agent 正確使用 Tool Calling，模型必須經過特定的 Tool Calling 微調（如 Qwen2.5-Coder），且在 Prompt 的組裝上需更精確地對齊其訓練格式。

## 3. 應安裝的工具 (Required Tools)

由於 `llama-cpp-2` 是一個 FFI (Foreign Function Interface) 綁定套件，它會在 `cargo build` 或 `cargo check` 的建置期間，即時去編譯底層的 `llama.cpp` C++ 原始碼。這代表開發者的系統上必須具備編譯 C++ 專案的基礎設施。

* **CMake**：用於驅動 C++ 原始碼的編譯流程。
* **C++ 編譯器**：如 macOS 上的 `clang` 或 `gcc` (通常包含在 Command Line Tools 內)。

## 4. 安裝與建置方式 (Installation)

### MacOS 環境安裝

1. 安裝 CMake：
   請確認您已經安裝 Homebrew，然後在終端機執行：
   ```bash
   brew install cmake
   ```
2. 確認 C++ 編譯環境：
   如果您尚未安裝 Xcode Command Line Tools，系統編譯時可能會報錯，請執行：
   ```bash
   xcode-select --install
   ```

### 專案設定與執行

1. 在專案根目錄或 `.env` 檔案中加入：
   ```env
   AGENT_MODE=inner
   NATIVE_LLAMA_MODEL_PATH=/absolute/path/to/your/model.gguf
   ```
2. 在 `backend/` 目錄下執行標準的 Rust 編譯指令：
   ```bash
   cargo build
   # 或
   cargo run --bin eiva-gateway
   ```
   *注意：初次編譯時，Cargo 會透過 `llama-cpp-sys-2` 的 `build.rs` 自動呼叫 CMake 編譯 `llama.cpp`，這段過程會花費數分鐘的時間，請耐心等待。*

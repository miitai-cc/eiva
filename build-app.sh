#!/bin/bash

# Stop execution immediately if any command fails
# 當任何一個指令發生錯誤時，立即停止執行腳本
set -e

echo "🚀 Starting EIVA System Build... / 開始建置 EIVA 系統..."
echo ""

echo "====================================="
echo "📦 1. Building Frontend (React / Vite) / 建置前端 (React / Vite)"
echo "====================================="
cd frontend
echo ">> Installing npm dependencies... / 安裝 npm 依賴..."
npm install
echo ">> Executing npm run build... / 執行 npm run build..."
npm run build
cd ..
echo "✅ Frontend build complete! (Files output to backend/assets/web) / 前端建置完成！(檔案已輸出至 backend/assets/web)"
echo ""

echo "====================================="
echo "🦀 2. Building Backend (Rust) / 建置後端 (Rust)"
echo "====================================="
cd backend
echo ">> Executing cargo build --release... / 執行 cargo build --release..."
cargo build --release -p eiva-gateway
cd ..
echo "✅ Backend build complete! / 後端建置完成！"
echo ""

echo "====================================="
echo "🎉 EIVA System built successfully! / EIVA 系統建置全部成功！"
echo "====================================="
echo ""
echo "👉 You can copy and paste the following command to start the server: / 您可以複製並貼上以下指令來啟動伺服器："
echo ""
echo "  cd backend && ./target/release/eiva-gateway"
echo ""
echo "After the server starts, you can access the interface in your browser at: / 伺服器啟動後，您可以開啟瀏覽器存取介面："
echo "  http://127.0.0.1:39999/eiva/frontend/view/index.html"
echo ""

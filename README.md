# EIVA — Enterprise Intelligent Virtual Assistant

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/status-active-brightgreen?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/AI-Powered-purple?style=for-the-badge" alt="AI Powered" />
  <img src="https://img.shields.io/badge/backend-Rust%20%F0%9F%A6%80-orange?style=for-the-badge" alt="Rust Backend" />
</p>

<p align="center">
  <strong>Enterprise-Grade Intelligent Virtual Assistant Platform — AI-driven, integrating the Eiva high-performance secure backend engine to create an efficient, highly intelligent conversational service experience for enterprises.</strong>
</p>

---

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [Core Features](#-core-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Eiva Backend Engine](#-eiva-backend-engine)
- [Quick Start](#-quick-start)
- [Environment Requirements](#-environment-requirements)
- [Installation & Configuration](#-installation--configuration)
- [Usage Guide](#-usage-guide)
- [API Documentation](#-api-documentation)
- [Deployment Guide](#-deployment-guide)
- [Security](#-security)
- [Project Structure](#-project-structure)
- [Contributing Guide](#-contributing-guide)
- [License](#-license)

---

## 🌟 Project Overview

**EIVA (Enterprise Intelligent Virtual Assistant)** is an intelligent virtual assistant solution designed specifically for enterprises. By combining Large Language Models (LLMs), knowledge base management, and multi-turn conversational capabilities, EIVA can understand enterprise business contexts to provide precise and real-time intelligent services.

**The primary purpose of this system is to establish a "nutshell" (sandbox container) for operating enterprise agents, providing a secure and isolated execution environment for enterprise AI agents. It is specifically designed for IoT, Edge Computation, and internal enterprise agents.**

The backend core of EIVA utilizes **[Eiva 🦀🦞](./backend/)** — a high-performance, security-first AI Agent Operating System written in Rust. It offers millisecond-level startup, ultra-low memory footprint (~15MB), and industry-leading multi-layered security protection mechanisms.

Whether it's customer service automation, internal knowledge querying, process decision support, or cross-system data integration, EIVA bridges the gap with natural language, significantly reducing enterprise labor costs and enhancing operational efficiency.

### 🎯 Design Goals

| Goal | Description |
|------|-------------|
| **High Accuracy** | Based on enterprise private knowledge bases to ensure the precision and credibility of answers |
| **Security First** | Eiva multi-layered security architecture prevents AI security threats like Prompt Injection and data leaks |
| **Easy Integration** | Provides standard REST API and WebSocket interfaces for seamless connection with existing systems |
| **High Scalability** | Modular architecture design supporting functional plugins and customizable workflows |
| **Ultimate Performance** | Rust backend ~15MB RAM, <50ms startup, capable of running on low-resource devices like Raspberry Pi |
| **Multi-Language Support** | Supports conversations in Traditional Chinese, Simplified Chinese, English, and more |

---

## ✨ Core Features

### 🤖 Intelligent Conversational Engine
- **Multi-turn Dialogue Management**: Maintains context memory, supporting complex conversational logic across multiple turns
- **Intent Recognition**: Accurately analyzes user intent to trigger corresponding business processes
- **Sentiment Analysis**: Detects conversational sentiment in real-time and automatically adjusts response strategies
- **Multi-modal Input**: Supports various input formats including text, voice, and images

### 📚 Knowledge Base Management
- **RAG (Retrieval-Augmented Generation)**: Dynamically retrieves relevant knowledge from enterprise document repositories to generate accurate answers
- **Vector Search**: High-performance semantic similarity search to quickly locate the most relevant content
- **Knowledge Updates**: Supports real-time knowledge base updates to ensure information timeliness
- **Multi-format Parsing**: Supports parsing of PDF, Word, Excel, Markdown, Web pages, etc.

### 🔌 System Integration
- **API Gateway**: Unified management of external system connections, supporting REST, GraphQL, WebSocket
- **Workflow Engine**: Visual process design to connect multiple business systems
- **Multi-platform Messaging**: Signal, Matrix, Telegram, Discord, Slack, WhatsApp, etc.
- **SSO Integration**: Supports OAuth 2.0 and SAML 2.0 Single Sign-On

### 📊 Analytics & Insights
- **Conversation Analytics Dashboard**: Visually presents user behavior and conversation quality metrics
- **Performance Monitoring**: Real-time tracking of key metrics such as response time, success rate, and satisfaction
- **A/B Testing**: Supports testing multiple versions of response strategies for continuous optimization
- **Export Reports**: Automatically generates periodic analysis reports

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      User Interface Layer               │
│         Web App | Mobile App | 3rd Party Integrations   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────────┐
│                     API Gateway Layer                   │
│          Load Balancing | Authentication | Rate Limiting│
└──────┬──────────────────┬───────────────────────────────┘
       │                  │
┌──────▼──────┐   ┌───────▼───────┐
│ Dialogue    │   │ Knowledge     │
│ Management  │   │ Base Service  │
│ - Intent    │   │ - Parsing     │
│ - Context   │   │ - Vectorizing │
│ - Multi-turn│   │ - RAG Engine  │
└──────┬──────┘   └───────┬───────┘
       │                  │
┌──────▼──────────────────▼───────┐
│   🦀 Eiva Backend Engine    │
│   ─────────────────────────     │
│   AI Agent OS | Rust ~15MB RAM  │
│   ─────────────────────────     │
│   LLM Inference | Tool Exec     │
│   Security Layer| Task Sched.   │
└──────┬──────────────────┬───────┘
       │                  │
┌──────▼──────┐   ┌───────▼───────┐
│ Data Storage│   │ Caching Layer │
│ - Relational│   │ - Redis       │
│ - Vector DB │   │ - Session     │
│ - Object    │   │ - Knowledge   │
└─────────────┘   └───────────────┘
```

---

## 🛠️ Technology Stack

### Backend (Eiva Engine)
| Technology | Purpose |
|------------|---------|
| **Rust 1.86+ (Edition 2024)** | Core backend language |
| **eiva-claw-core** | Agent core library (config, gateway, tools, security) |
| **eiva-gateway** | Standalone gateway daemon (WebSocket protocol) |
| **eiva-cli** | CLI tools and management interface |
| **tokio** | Async runtime |
| **genai** | Multi LLM Provider integration |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | User interface framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Modern frontend build tool |
| **Zustand** | Lightweight state management |
| **TailwindCSS** | Utility-first CSS framework |

### AI / LLM Support
| Provider | Models |
|----------|--------|
| **Anthropic** | Claude Opus, Sonnet, Haiku |
| **OpenAI** | GPT-4o, o1, o3 |
| **Google** | Gemini Pro, Ultra |
| **Ollama** | Local private deployment models |
| **OpenRouter** | 200+ models |
| **Any OpenAI-compatible Endpoint** | Custom deployments |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Docker / Podman** | Containerized deployment |
| **Kubernetes** | Container orchestration management |
| **Nginx** | Reverse proxy |
| **Prometheus + Grafana** | Monitoring and visualization |

---

## 🦀 Eiva Backend Engine

EIVA's core power comes from **[Eiva](./backend/)** — an **AI Agent Operating System** built with Rust, akin to "Linux for AI Agents", providing a stable and secure infrastructure.

> For detailed documentation, please refer to [`backend/README.md`](./backend/README.md)

### Why Choose Eiva?

#### ⚡ Ultimate Performance
| Metric | Eiva | Node.js Agent | Python Agent |
|--------|-----------|---------------|--------------|
| **Memory** | ~15 MB | ~150 MB | ~100+ MB |
| **Startup Time** | <50 ms | ~500 ms | ~1s+ |
| **Binary Size** | ~8 MB | ~200 MB | N/A |
| **Dependencies** | 0 (Single executable) | node_modules | venv |

#### 🔒 Multi-Layered Security Protection

| Security Layer | Protection Details |
|----------------|--------------------|
| **PromptGuard** | Detects Prompt Injection attacks (system override, role confusion, jailbreaking) |
| **LeakDetector** | Prevents API Keys, Tokens, SSH Keys, and other credentials from leaking |
| **Sandbox Isolation** | Bubblewrap (Linux), Landlock, sandbox-exec (macOS) |
| **SSRF Protection** | Blocks requests to private IPs and metadata endpoints |
| **Encrypted Vault** | AES-256-GCM encryption + optional TOTP two-factor authentication |
| **HTTP Request Scanning**| Validates outbound request URLs, headers, and content |

#### 🛠️ 30+ Built-in Tools

| Category | Tools |
|----------|-------|
| **File** | `read_file`, `write_file`, `edit_file`, `list_directory`, `search_files` |
| **Execute** | `execute_command`, `process`, `apply_patch` |
| **Network** | `web_fetch`, `web_search`, `browser` |
| **Memory** | `memory_search`, `memory_get` |
| **Schedule** | `cron`, heartbeat system |
| **Multi-Agent**| `sessions_spawn`, `sessions_send`, `sessions_steer` |
| **Secrets** | `secrets_list`, `secrets_get`, `secrets_store` |

#### 🤖 Multi-Agent Collaboration

```rust
// Spawn a research Agent
let research = spawn_agent("Summarize the latest papers on RLHF", AgentConfig {
    model: "claude-sonnet",
    timeout: Duration::minutes(10),
    ..default()
});

// Spawn a parallel coding Agent
let coder = spawn_agent("Implement the algorithm from the research", AgentConfig {
    model: "gpt-4o",
    ..default()
});

// Dynamically steer direction during execution
research.steer("Focus specifically on Constitutional AI approaches");
```

### Eiva Related Documentation

| Document | Description |
|----------|-------------|
| [`backend/README.md`](./backend/README.md) | Comprehensive Eiva usage guide |
| [`backend/ARCHITECTURE.md`](./backend/ARCHITECTURE.md) | Architecture design explanation |
| [`backend/BUILDING.md`](./backend/BUILDING.md) | Guide to building from source |
| [`backend/QUICKSTART.md`](./backend/QUICKSTART.md) | Quick start guide |
| [`backend/SECURITY.md`](./backend/SECURITY.md) | Detailed security mechanisms |
| [`backend/docs/`](./backend/docs/) | Full technical documentation directory |
| [`backend/CHANGELOG.md`](./backend/CHANGELOG.md) | Version update history |

---

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# 1. Clone the project
git clone https://github.com/your-org/eiva.git
cd eiva

# 2. Copy environment configuration
cp .env.example .env

# 3. Edit configuration (fill in API keys and other necessary parameters)
nano .env

# 4. Start all services (including Eiva backend)
docker compose up -d

# 5. Check service status
docker compose ps

# 6. Open the browser
open http://localhost:3000
```

### Starting Only Eiva Backend

```bash
cd backend

# Install Eiva
cargo install eiva

# Interactive setup wizard (configure API Keys, encrypted vault, messaging platforms)
eiva onboard

# Start Terminal UI
eiva tui

# Or start the gateway daemon (for EIVA frontend connection)
eiva gateway start
```

---

## 📋 Environment Requirements

### Minimum Requirements
| Resource | Requirement |
|----------|-------------|
| CPU | 2 Cores |
| RAM | 4 GB (Eiva backend requires only ~15 MB) |
| Disk Space | 10 GB |
| OS | Ubuntu 22.04 / macOS 13+ / Windows 11 (WSL2) |

### Recommended Requirements (Production Environment)
| Resource | Requirement |
|----------|-------------|
| CPU | 8+ Cores |
| RAM | 16 GB |
| GPU | NVIDIA GPU (For local Ollama inference, optional) |
| Disk Space | 100 GB SSD |

### Required Software
- **Rust** 1.86+ (For backend build)
- **Docker** 24.0+ and **Docker Compose** 2.20+ (For containerized deployment)
- **Node.js** 20.0+ (For frontend development)
- **Git** 2.40+

---

## ⚙️ Installation & Configuration

### 1. Eiva Backend Configuration

```bash
cd backend

# Option 1: Direct installation (Recommended)
cargo install eiva

# Option 2: Build from source
cargo build --release

# Debug build (Fast compilation)
cargo build --workspace

# Full feature build (Matrix, Browser Automation)
cargo build --release --features eiva-claw-core/full
```

#### Configuration Example (`config.example.toml` → `~/.eiva/config.toml`)

```bash
# Copy configuration file
cp backend/config.example.toml ~/.eiva/config.toml

# Interactive setup
eiva onboard
```

### 2. Frontend Configuration

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### 3. Main Environment Variables

```env
# LLM Provider Configuration (Choose one)
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-openai-key

# Eiva Gateway Connection
RUSTYCLAW_GATEWAY_URL=ssh://127.0.0.1:2222

# Frontend Services
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080

# Database (Optional, for conversational history persistence)
DATABASE_URL=postgresql://user:password@localhost:5432/eiva_db
REDIS_URL=redis://localhost:6379/0
```

---

## 📖 Usage Guide

### Conversing via Terminal UI

```bash
eiva tui
```

### Conversing via Web Interface

1. Start Eiva gateway: `eiva gateway start`
2. Start EIVA frontend: `cd frontend && npm run dev`
3. Open browser: `http://localhost:5173`

### Skills System

```bash
# Install community skills from ClawHub
clawhub install claw-me-maybe    # Messaging platform integration (Beeper)
clawhub install github           # GitHub operations
clawhub install jira             # Jira ticket management
```

Custom Skill Example:

```yaml
---
name: company-faq
description: Enterprise internal FAQ
requires:
  bins: []
  env: [KNOWLEDGE_BASE_PATH]
---

# Enterprise FAQ Skill

Please refer to the knowledge base documents in ${KNOWLEDGE_BASE_PATH} to provide accurate enterprise policy answers.
```

### Scheduled Automation

```json
{
  "schedule": { "kind": "cron", "expr": "0 9 * * MON" },
  "payload": {
    "kind": "agentTurn",
    "message": "Compile this week's business report and send it to the management group"
  }
}
```

---

## 📡 API Documentation

For the complete API documentation, please visit: `http://localhost:8080/docs` (Swagger UI)

Eiva WebSocket Protocol Specification: [`backend/docs/CLIENT_SPEC.md`](./backend/docs/CLIENT_SPEC.md)

### Core API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/chat` | Send a chat message |
| `GET` | `/api/v1/sessions/{id}` | Retrieve conversation history |
| `DELETE` | `/api/v1/sessions/{id}` | Clear conversation memory |
| `POST` | `/api/v1/knowledge/upload` | Upload knowledge base documents |
| `GET` | `/api/v1/knowledge/search` | Semantic search in the knowledge base |
| `WS` | `/api/v1/gateway` | Eiva Gateway WebSocket |
| `GET` | `/api/v1/analytics/dashboard` | Retrieve analytics data |

### Response Format

```json
{
  "success": true,
  "data": {
    "response": "According to company policy, employees are entitled to 14 days of annual leave...",
    "session_id": "sess_abc123",
    "sources": [
      {
        "document": "HR_Policy.pdf",
        "page": 12,
        "similarity": 0.92
      }
    ],
    "metadata": {
      "model": "claude-sonnet",
      "tokens_used": 350,
      "response_time_ms": 48,
      "backend": "eiva/0.4.0"
    }
  },
  "timestamp": "2026-07-11T09:30:00Z"
}
```

---

## 🚢 Deployment Guide

### Docker Compose Production Deployment

```bash
# Use production configuration
docker compose -f docker-compose.yml up -d

# Verify all services are running normally
docker compose ps
docker compose logs -f eiva-gateway
```

### Direct Eiva Binary Deployment

```bash
# Compile Release version
cd backend
cargo build --release

# Deploy binaries
cp target/release/eiva /usr/local/bin/
cp target/release/eiva-gateway /usr/local/bin/

# Configure as a system service (systemd)
sudo systemctl enable eiva-gateway
sudo systemctl start eiva-gateway
```

### Raspberry Pi / ARM Deployment

```bash
# Install cross compilation tool
cargo install cross --git https://github.com/cross-rs/cross

# 64-bit (Pi 3/4/5)
cross build --release --target aarch64-unknown-linux-gnu \
  -p eiva-cli --no-default-features

# Copy to device
scp target/aarch64-unknown-linux-gnu/release/eiva pi@raspberrypi:/usr/local/bin/
```

### Health Check

```bash
# Check service status
curl http://localhost:8080/health

# Expected response
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "backend": "eiva/0.4.0",
#   "services": { "gateway": "ok", "llm": "ok" }
# }
```

---

## 🔒 Security

EIVA provides enterprise-grade protection based on Eiva's multi-layered security architecture:

```
User Input
    │
    ▼
┌───────────────┐
│ InputValidator│ ─── Length, Encoding, Padding Attacks
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  PromptGuard  │ ─── 6 Injection Categories, Adjustable Sensitivity
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Agent      │ ─── Sandbox Isolated Execution
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ LeakDetector  │ ─── Blocks credentials in output/requests
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ SSRF Validator│ ─── Blocks private IPs and metadata endpoints
└───────────────┘
```

- **Encrypted Vault**: AES-256-GCM encryption + optional TOTP two-factor authentication
- **Access Control**: Role-Based Access Control (RBAC) with fine granularity
- **Audit Logs**: Comprehensive logging of all operations and conversation history
- **Private Deployment**: Supports fully offline local deployment, ensuring data never leaves the enterprise environment

See [`backend/SECURITY.md`](./backend/SECURITY.md) and [`backend/docs/SECURITY.md`](./backend/docs/SECURITY.md) for details.

---

## 📁 Project Structure

```
eiva/
├── README.md                   # This document
├── Dockerfile                  # Container build config
├── docker-compose.yml          # Service orchestration config
├── LICENSE                     # License terms
│
├── backend/                    # 🦀 Eiva Backend Engine
│   ├── README.md               # Eiva comprehensive guide
│   ├── Cargo.toml              # Rust Workspace config
│   ├── ARCHITECTURE.md         # Architecture explanation
│   ├── BUILDING.md             # Build guide
│   ├── QUICKSTART.md           # Quick start
│   ├── SECURITY.md             # Security overview
│   ├── CHANGELOG.md            # Version history
│   ├── config.example.toml     # Config file example
│   ├── crates/                 # Rust Crate modules
│   │   ├── eiva-claw-core/     # Core library (gateway, tools, security)
│   │   ├── eiva-cli/      # CLI tools
│   │   ├── eiva-tui/      # Terminal UI
│   │   ├── eiva-gateway/  # Gateway service
│   │   ├── eiva-desktop/  # Desktop UI
│   │   ├── eiva-onboard/  # Setup wizard
│   │   ├── eiva-view/     # View components
│   │   ├── eiva-web/      # WASM Web module
│   │   ├── tokenjuice/         # Token management
│   │   └── memory-tree/        # Memory tree structure
│   ├── docs/                   # Technical documentation
│   ├── tests/                  # Integration tests
│   ├── scripts/                # Build scripts
│   ├── vendor/                 # Vendor packages
│   └── legacy/                 # Legacy versions (Node.js)
│
├── frontend/                   # React Frontend App
│   ├── src/
│   ├── public/
│   └── package.json
│
└── agent/                      # AI Agent config and skills
```

---

## 🤝 Contributing Guide

Contributions are welcome! Please follow this workflow:

1. **Fork** this repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push the branch: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

### Backend Contributions (Eiva)

Please read [`backend/CONTRIBUTING.md`](./backend/CONTRIBUTING.md) and [`backend/STYLE_GUIDE.md`](./backend/STYLE_GUIDE.md) first.

```bash
# Run all tests
cd backend
cargo test --workspace

# Code quality checks
cargo clippy --workspace -- -D warnings
cargo fmt --check
```

### Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: Add a new feature
fix: Fix a bug
docs: Update documentation
style: Code format adjustments
refactor: Refactoring (no functional changes)
test: Add or modify tests
chore: Changes to build tools or auxiliary tools
```

---

## 🙏 Acknowledgments

Eiva is a fork of and heavily inspired by the [RustyClaw](https://github.com/rexlunae/RustyClaw) project. We extend our gratitude to the original creators and contributors for providing such a robust and secure AI agent operating system.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
The Eiva backend engine is also licensed under the [MIT License](./backend/LICENSE).

---

## 📞 Contact Us

- **Official Website**: https://eiva.example.com
- **Technical Support**: support@eiva.example.com
- **Issue Tracker**: [GitHub Issues](https://github.com/your-org/eiva/issues)
- **Eiva Community**: [Discord](https://discord.com/invite/clawd)

---

<p align="center">
  Made with ❤️ and 🦀 by the EIVA Team<br/>
  Powered by <a href="./backend/">Eiva</a> — The secure, open-source operating system for AI agents<br/>
  © 2026 EIVA — Enterprise Intelligent Virtual Assistant. All rights reserved.
</p>

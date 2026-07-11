#!/bin/bash
# scripts/core_lines.sh — Count core agent lines for marketing
# Core = the essential agent brain: security, sessions, memory, scheduling
# Excludes: tools (integrations), providers, messengers, CLI, TUI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Eiva Core Line Count"
echo "========================="
echo ""

# Core directories — the essential "agent brain"
printf "%-50s %8s\n" "Module" "Lines"
printf "%-50s %8s\n" "──────────────────────────────────────────────" "──────"

count_lines() {
    local path="$ROOT_DIR/$1"
    if [ -d "$path" ]; then
        find "$path" -name "*.rs" -exec cat {} + 2>/dev/null | wc -l | tr -d ' '
    elif [ -f "$path" ]; then
        wc -l < "$path" 2>/dev/null | tr -d ' '
    else
        echo "0"
    fi
}

total=0

modules=(
    "Security (prompt guard, leak detection)|crates/eiva-core/src/security"
    "Secrets vault (AES-256, TOTP)|crates/eiva-core/src/secrets"
    "Sandbox (bubblewrap, landlock)|crates/eiva-core/src/sandbox.rs"
    "Memory (semantic search)|crates/eiva-core/src/memory.rs"
    "Memory flush (compaction)|crates/eiva-core/src/memory_flush.rs"
    "Sessions (multi-agent)|crates/eiva-core/src/sessions.rs"
    "Skills (loading, availability)|crates/eiva-core/src/skills.rs"
    "Cron (scheduling, heartbeats)|crates/eiva-core/src/cron.rs"
    "Gateway (agent loop, WebSocket)|crates/eiva-core/src/gateway"
    "Runtime (process, async)|crates/eiva-core/src/runtime"
)

for entry in "${modules[@]}"; do
    label="${entry%%|*}"
    path="${entry##*|}"
    count=$(count_lines "$path")
    printf "%-50s %8s\n" "$label" "$count"
    total=$((total + count))
done

echo ""
printf "%-50s %8s\n" "──────────────────────────────────────────────" "──────"
printf "%-50s %8s\n" "CORE TOTAL" "$total"
echo ""

# Show what's excluded
echo "Excluded from core count:"
tools=$(count_lines "crates/eiva-core/src/tools")
providers=$(wc -l < "$ROOT_DIR/crates/eiva-core/src/providers.rs" 2>/dev/null | tr -d ' ')
messengers=$(count_lines "crates/eiva-core/src/messengers")
cli=$(count_lines "crates/eiva-cli")
tui=$(count_lines "crates/eiva-tui")

printf "  %-48s %8s\n" "Tools (integrations)" "$tools"
printf "  %-48s %8s\n" "Providers (LLM adapters)" "$providers"
printf "  %-48s %8s\n" "Messengers (channel adapters)" "$messengers"
printf "  %-48s %8s\n" "CLI" "$cli"
printf "  %-48s %8s\n" "TUI" "$tui"

echo ""
full_count=$(find "$ROOT_DIR/crates" -name "*.rs" -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
printf "Full project: %s lines of Rust\n" "$full_count"

# Output just the number for badge generation
if [ "$1" = "--badge" ]; then
    echo ""
    echo "BADGE_VALUE=$total"
fi

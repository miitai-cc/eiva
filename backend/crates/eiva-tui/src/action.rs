/// Thread/task info for TUI display (unified).
///
/// Reuses the server-frame `ThreadInfoDto` from `eiva-claw-core` since the
/// TUI directly consumes gateway server frames.
pub type ThreadInfo = eiva_claw_core::gateway::protocol::ThreadInfoDto;

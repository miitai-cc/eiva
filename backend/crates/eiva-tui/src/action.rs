/// Thread/task info for TUI display (unified).
///
/// Reuses the server-frame `ThreadInfoDto` from `eiva-core` since the
/// TUI directly consumes gateway server frames.
pub type ThreadInfo = eiva_core::gateway::protocol::ThreadInfoDto;

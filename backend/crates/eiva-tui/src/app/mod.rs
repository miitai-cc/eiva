mod command_action;
mod events;
mod tui_component;
// ── App module ──────────────────────────────────────────────────────────────
//
// Re-exports from app.rs for the public path `eiva_tui::app::App`.

mod app;

pub use app::App;
pub(crate) use app::UserInput;
pub(crate) use events::{GwEvent, PanelKind};

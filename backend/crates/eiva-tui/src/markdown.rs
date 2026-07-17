//! Simple markdown to styled text conversion for TUI rendering.
//!
//! Thin wrapper around [`eiva_claw_core::markdown`] that adds iocraft
//! rendering helpers.

#[allow(unused_imports)]
use iocraft::prelude::*;

// Re-export the core markdown types and functions
pub use eiva_claw_core::markdown::render_ansi;

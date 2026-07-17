# EIVA Project Rules

## Common Shared Code Separation
When separating or creating common shared code between the frontend and backend, strictly adhere to the following directory structure and naming conventions:
- **Backend (Rust):** Place shared crates in `lib/rust/crates/common/<crate_name>`.
- **Frontend (React/JS/TS):** Place shared packages in `lib/react/common/<package_name>` and use a scoped package name (e.g. `@eiva/common`).

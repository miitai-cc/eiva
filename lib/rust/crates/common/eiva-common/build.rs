use std::io::Result;

fn main() -> Result<()> {
    prost_build::compile_protos(&["proto/eiva_api.proto"], &["proto"])?;
    Ok(())
}

use salvo::prelude::*;
use std::path::{Path, PathBuf};
use tokio::fs;

fn resolve_workspace_path(rel_path: &str) -> Option<PathBuf> {
    let mut base = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    base.push("backend");
    base.push("assets");
    base.push("workspace");
    
    let _ = std::fs::create_dir_all(&base);
    
    let mut target = base.clone();
    for component in Path::new(rel_path).components() {
        match component {
            std::path::Component::Normal(p) => target.push(p),
            _ => {}
        }
    }
    
    if target.starts_with(&base) {
        Some(target)
    } else {
        None
    }
}

#[handler]
pub async fn list_workspace(req: &mut Request, res: &mut Response) {
    let rel_path = req.query::<String>("path").unwrap_or_default();
    let Some(target_dir) = resolve_workspace_path(&rel_path) else {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(Json(serde_json::json!({"error": "Invalid path"})));
        return;
    };
    
    if !target_dir.exists() {
        res.status_code(StatusCode::NOT_FOUND);
        res.render(Json(serde_json::json!({"error": "Path not found"})));
        return;
    }
    
    let mut entries = Vec::new();
    if let Ok(mut read_dir) = fs::read_dir(target_dir).await {
        while let Ok(Some(entry)) = read_dir.next_entry().await {
            let path = entry.path();
            let is_dir = path.is_dir();
            let name = entry.file_name().to_string_lossy().to_string();
            let size = path.metadata().map(|m| m.len()).unwrap_or(0);
            let modified = path.metadata()
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);
            entries.push(serde_json::json!({
                "name": name,
                "isDir": is_dir,
                "size": size,
                "modified": modified
            }));
        }
    }
    
    // Sort directories first, then alphabetically
    entries.sort_by(|a, b| {
        let a_is_dir = a["isDir"].as_bool().unwrap_or(false);
        let b_is_dir = b["isDir"].as_bool().unwrap_or(false);
        if a_is_dir != b_is_dir {
            b_is_dir.cmp(&a_is_dir)
        } else {
            let a_name = a["name"].as_str().unwrap_or("");
            let b_name = b["name"].as_str().unwrap_or("");
            a_name.cmp(b_name)
        }
    });
    
    res.render(Json(serde_json::json!({"entries": entries})));
}

#[handler]
pub async fn create_workspace_dir(req: &mut Request, res: &mut Response) {
    if let Ok(body) = req.parse_json::<serde_json::Value>().await {
        let rel_path = body.get("path").and_then(|v| v.as_str()).unwrap_or_default();
        let Some(target_dir) = resolve_workspace_path(rel_path) else {
            res.status_code(StatusCode::BAD_REQUEST);
            res.render(Json(serde_json::json!({"error": "Invalid path"})));
            return;
        };
        
        if let Err(e) = fs::create_dir_all(&target_dir).await {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
            return;
        }
        res.render(Json(serde_json::json!({"status": "ok", "path": rel_path})));
    } else {
        res.status_code(StatusCode::BAD_REQUEST);
    }
}

#[handler]
pub async fn upload_workspace_file(req: &mut Request, res: &mut Response) {
    let rel_path = req.form::<String>("path").await.unwrap_or_default();
    let Some(target_dir) = resolve_workspace_path(&rel_path) else {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(Json(serde_json::json!({"error": "Invalid path"})));
        return;
    };
    
    let _ = fs::create_dir_all(&target_dir).await;
    
    if let Some(file) = req.file("file").await {
        let filename = file.name().unwrap_or("upload.bin").to_string();
        let dest = target_dir.join(&filename);
        if let Err(e) = fs::copy(file.path(), &dest).await {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
            return;
        }
        res.render(Json(serde_json::json!({"status": "ok", "filename": filename})));
    } else {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(Json(serde_json::json!({"error": "No file provided"})));
    }
}

#[handler]
pub async fn download_workspace_file(req: &mut Request, res: &mut Response) {
    let rel_path = req.query::<String>("path").unwrap_or_default();
    let Some(target_file) = resolve_workspace_path(&rel_path) else {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(Text::Plain("Invalid path"));
        return;
    };
    
    if !target_file.exists() || target_file.is_dir() {
        res.status_code(StatusCode::NOT_FOUND);
        res.render(Text::Plain("File not found"));
        return;
    }
    
    match salvo::fs::NamedFile::builder(&target_file).build().await {
        Ok(named_file) => {
            named_file.send(req.headers(), res).await;
        }
        Err(e) => {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Text::Plain(e.to_string()));
        }
    }
}

#[handler]
pub async fn delete_workspace_entry(req: &mut Request, res: &mut Response) {
    if let Ok(body) = req.parse_json::<serde_json::Value>().await {
        let rel_path = body.get("path").and_then(|v| v.as_str()).unwrap_or_default();
        let Some(target) = resolve_workspace_path(rel_path) else {
            res.status_code(StatusCode::BAD_REQUEST);
            res.render(Json(serde_json::json!({"error": "Invalid path"})));
            return;
        };
        
        if !target.exists() {
            res.status_code(StatusCode::NOT_FOUND);
            res.render(Json(serde_json::json!({"error": "Path not found"})));
            return;
        }
        
        let result = if target.is_dir() {
            fs::remove_dir_all(&target).await
        } else {
            fs::remove_file(&target).await
        };
        
        match result {
            Ok(()) => res.render(Json(serde_json::json!({"status": "ok"}))),
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    } else {
        res.status_code(StatusCode::BAD_REQUEST);
    }
}

#[handler]
pub async fn rename_workspace_entry(req: &mut Request, res: &mut Response) {
    if let Ok(body) = req.parse_json::<serde_json::Value>().await {
        let old_path = body.get("path").and_then(|v| v.as_str()).unwrap_or_default();
        let new_name = body.get("newName").and_then(|v| v.as_str()).unwrap_or_default();
        
        if new_name.is_empty() || new_name.contains('/') || new_name.contains('\\') {
            res.status_code(StatusCode::BAD_REQUEST);
            res.render(Json(serde_json::json!({"error": "Invalid new name"})));
            return;
        }
        
        let Some(old_target) = resolve_workspace_path(old_path) else {
            res.status_code(StatusCode::BAD_REQUEST);
            res.render(Json(serde_json::json!({"error": "Invalid path"})));
            return;
        };
        
        if !old_target.exists() {
            res.status_code(StatusCode::NOT_FOUND);
            res.render(Json(serde_json::json!({"error": "Path not found"})));
            return;
        }
        
        // Compute new path (same parent, new name)
        let new_target = old_target.parent().unwrap_or(&old_target).join(new_name);
        
        // Verify new path is still within workspace
        if let Some(base) = resolve_workspace_path("") {
            if !new_target.starts_with(&base) {
                res.status_code(StatusCode::BAD_REQUEST);
                res.render(Json(serde_json::json!({"error": "Invalid path"})));
                return;
            }
        }
        
        match fs::rename(&old_target, &new_target).await {
            Ok(()) => res.render(Json(serde_json::json!({"status": "ok"}))),
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    } else {
        res.status_code(StatusCode::BAD_REQUEST);
    }
}

fn build_tree_sync(dir: &Path, rel_path: &str) -> serde_json::Value {
    let mut children = Vec::new();
    if let Ok(read_dir) = std::fs::read_dir(dir) {
        let mut entries: Vec<_> = read_dir.flatten().collect();
        // Sort alphabetically
        entries.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
        
        for entry in entries {
            let path = entry.path();
            if path.is_dir() {
                let name = entry.file_name().to_string_lossy().to_string();
                let child_rel = if rel_path.is_empty() { name.clone() } else { format!("{}/{}", rel_path, name) };
                children.push(build_tree_sync(&path, &child_rel));
            }
        }
    }
    serde_json::json!({
        "name": if rel_path.is_empty() { "root".to_string() } else { dir.file_name().unwrap().to_string_lossy().to_string() },
        "path": rel_path,
        "children": children
    })
}

#[handler]
pub async fn get_workspace_tree(_req: &mut Request, res: &mut Response) {
    let base = resolve_workspace_path("").unwrap_or_else(|| PathBuf::from("."));
    
    // Run the recursive sync scan in a blocking thread
    let tree = tokio::task::spawn_blocking(move || {
        build_tree_sync(&base, "")
    }).await.unwrap_or_else(|_| serde_json::json!({ "error": "failed to build tree" }));
    
    res.render(Json(tree));
}

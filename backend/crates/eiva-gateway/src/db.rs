use rusqlite::{Connection, params};
use std::path::PathBuf;

#[derive(Clone)]
pub struct WorkflowDb {
    path: PathBuf,
}

impl WorkflowDb {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn init(&self) -> anyhow::Result<()> {
        let conn = Connection::open(&self.path)?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL
            )",
            [],
        )?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL
            )",
            [],
        )?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;
        // MCP servers: create with structured columns
        conn.execute(
            "CREATE TABLE IF NOT EXISTS mcp_servers (
                id           TEXT PRIMARY KEY,
                name         TEXT NOT NULL DEFAULT '',
                command      TEXT NOT NULL DEFAULT '',
                args         TEXT NOT NULL DEFAULT '[]',
                env          TEXT NOT NULL DEFAULT '{}',
                cwd          TEXT,
                enabled      INTEGER NOT NULL DEFAULT 1,
                timeout_secs INTEGER NOT NULL DEFAULT 30
            )",
            [],
        )?;
        // Migrate old mcp_servers table (id + data blob) to new schema
        Self::migrate_mcp_servers(&conn)?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS ai_skills (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL DEFAULT '',
                description     TEXT NOT NULL DEFAULT '',
                instructions    TEXT NOT NULL DEFAULT '',
                enabled         INTEGER NOT NULL DEFAULT 1,
                linked_secrets  TEXT NOT NULL DEFAULT '[]'
            )",
            [],
        )?;
        Self::migrate_ai_skills(&conn)?;

        // AI Models table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS ai_models (
                id              TEXT PRIMARY KEY,
                provider        TEXT NOT NULL DEFAULT '',
                name            TEXT NOT NULL DEFAULT '',
                api_key         TEXT NOT NULL DEFAULT '',
                base_url        TEXT NOT NULL DEFAULT '',
                enabled         INTEGER NOT NULL DEFAULT 1,
                extra_params    TEXT NOT NULL DEFAULT '{}'
            )",
            [],
        )?;

        Ok(())
    }

    /// Detect old mcp_servers table (only id + data columns) and migrate data.
    fn migrate_mcp_servers(conn: &Connection) -> anyhow::Result<()> {
        let has_data_col: bool = conn.prepare("SELECT data FROM mcp_servers LIMIT 0").is_ok();
        if !has_data_col {
            return Ok(()); // already new schema or empty
        }
        // Read all old rows
        let mut stmt = conn.prepare("SELECT id, data FROM mcp_servers")?;
        let old_rows: Vec<(String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
            .filter_map(|r| r.ok())
            .collect();
        if old_rows.is_empty() {
            return Ok(());
        }
        // Recreate table with new schema
        conn.execute("DROP TABLE mcp_servers", [])?;
        conn.execute(
            "CREATE TABLE mcp_servers (
                id           TEXT PRIMARY KEY,
                name         TEXT NOT NULL DEFAULT '',
                command      TEXT NOT NULL DEFAULT '',
                args         TEXT NOT NULL DEFAULT '[]',
                env          TEXT NOT NULL DEFAULT '{}',
                cwd          TEXT,
                enabled      INTEGER NOT NULL DEFAULT 1,
                timeout_secs INTEGER NOT NULL DEFAULT 30
            )",
            [],
        )?;
        // Insert migrated rows
        for (id, data) in &old_rows {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                let name = v["name"].as_str().unwrap_or("");
                let command = v["command"].as_str().unwrap_or("");
                let args = v["args"].to_string();
                let env = v["env"].to_string();
                let cwd = v["cwd"].as_str();
                let enabled = v["enabled"].as_bool().unwrap_or(true) as i32;
                let timeout = v["timeout_secs"].as_u64().unwrap_or(30) as i32;
                conn.execute(
                    "INSERT INTO mcp_servers (id, name, command, args, env, cwd, enabled, timeout_secs)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![id, name, command, args, env, cwd, enabled, timeout],
                )?;
            }
        }
        Ok(())
    }

    /// Detect old ai_skills table (only id + data columns) and migrate data.
    fn migrate_ai_skills(conn: &Connection) -> anyhow::Result<()> {
        let has_data_col: bool = conn.prepare("SELECT data FROM ai_skills LIMIT 0").is_ok();
        if !has_data_col {
            return Ok(());
        }
        let mut stmt = conn.prepare("SELECT id, data FROM ai_skills")?;
        let old_rows: Vec<(String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
            .filter_map(|r| r.ok())
            .collect();
        if old_rows.is_empty() {
            return Ok(());
        }
        conn.execute("DROP TABLE ai_skills", [])?;
        conn.execute(
            "CREATE TABLE ai_skills (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL DEFAULT '',
                description     TEXT NOT NULL DEFAULT '',
                instructions    TEXT NOT NULL DEFAULT '',
                enabled         INTEGER NOT NULL DEFAULT 1,
                linked_secrets  TEXT NOT NULL DEFAULT '[]'
            )",
            [],
        )?;
        for (id, data) in &old_rows {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(data) {
                let name = v["name"].as_str().unwrap_or("");
                let description = v["description"].as_str().unwrap_or("");
                let instructions = v["instructions"]
                    .as_str()
                    .or_else(|| v["prompt"].as_str())
                    .unwrap_or("");
                let enabled = v["enabled"].as_bool().unwrap_or(true) as i32;
                let linked_secrets = v["linked_secrets"].to_string();
                conn.execute(
                    "INSERT INTO ai_skills (id, name, description, instructions, enabled, linked_secrets)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![id, name, description, instructions, enabled, linked_secrets],
                )?;
            }
        }
        Ok(())
    }

    pub async fn get_workflow(&self, id: String) -> anyhow::Result<Option<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare("SELECT data FROM workflows WHERE id = ?1")?;
            let mut rows = stmt.query(params![id])?;
            if let Some(row) = rows.next()? {
                let data: String = row.get(0)?;
                Ok(Some(data))
            } else {
                Ok(None)
            }
        })
        .await?
    }

    pub async fn save_workflow(&self, id: String, data: String) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            conn.execute(
                "INSERT INTO workflows (id, data) VALUES (?1, ?2)
                 ON CONFLICT(id) DO UPDATE SET data = excluded.data",
                params![id, data],
            )?;
            Ok(())
        })
        .await?
    }
    pub async fn list_workflows(&self) -> anyhow::Result<Vec<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare("SELECT id FROM workflows")?;
            let rows = stmt.query_map([], |row| row.get(0))?;
            let mut ids = Vec::new();
            for id in rows {
                ids.push(id?);
            }
            Ok(ids)
        })
        .await?
    }

    pub async fn delete_workflow(&self, id: String) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            conn.execute("DELETE FROM workflows WHERE id = ?1", params![id])?;
            Ok(())
        })
        .await?
    }

    pub async fn get_schedule(&self, id: String) -> anyhow::Result<Option<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare("SELECT data FROM schedules WHERE id = ?1")?;
            let mut rows = stmt.query(params![id])?;
            if let Some(row) = rows.next()? {
                Ok(Some(row.get(0)?))
            } else {
                Ok(None)
            }
        })
        .await?
    }

    pub async fn save_schedule(&self, id: String, data: String) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            conn.execute(
                "INSERT INTO schedules (id, data) VALUES (?1, ?2)
                 ON CONFLICT(id) DO UPDATE SET data = excluded.data",
                params![id, data],
            )?;
            Ok(())
        })
        .await?
    }

    pub async fn list_schedules(&self) -> anyhow::Result<Vec<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare("SELECT data FROM schedules ORDER BY id DESC")?;
            let rows = stmt.query_map([], |row| row.get(0))?;
            let mut schedules = Vec::new();
            for row in rows {
                schedules.push(row?);
            }
            Ok(schedules)
        })
        .await?
    }

    pub async fn delete_schedule(&self, id: String) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            conn.execute("DELETE FROM schedules WHERE id = ?1", params![id])?;
            Ok(())
        })
        .await?
    }

    pub async fn get_task(&self, id: String) -> anyhow::Result<Option<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare("SELECT data FROM tasks WHERE id = ?1")?;
            let mut rows = stmt.query(params![id])?;
            if let Some(row) = rows.next()? {
                Ok(Some(row.get(0)?))
            } else {
                Ok(None)
            }
        })
        .await?
    }

    pub async fn save_task(
        &self,
        id: String,
        data: String,
        created_at: String,
    ) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            conn.execute(
                "INSERT INTO tasks (id, data, created_at) VALUES (?1, ?2, ?3)
                 ON CONFLICT(id) DO UPDATE SET data = excluded.data",
                params![id, data, created_at],
            )?;
            Ok(())
        })
        .await?
    }

    pub async fn list_tasks(&self, limit: usize) -> anyhow::Result<Vec<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt =
                conn.prepare("SELECT data FROM tasks ORDER BY created_at DESC LIMIT ?1")?;
            let rows = stmt.query_map(params![limit as i64], |row| row.get(0))?;
            let mut tasks = Vec::new();
            for row in rows {
                tasks.push(row?);
            }
            Ok(tasks)
        })
        .await?
    }

    // --- MCP Servers CRUD ---

    fn mcp_row_to_json(
        id: String,
        name: String,
        command: String,
        args: String,
        env: String,
        cwd: Option<String>,
        enabled: i32,
        timeout_secs: i32,
    ) -> String {
        let args_val: serde_json::Value =
            serde_json::from_str(&args).unwrap_or(serde_json::json!([]));
        let env_val: serde_json::Value =
            serde_json::from_str(&env).unwrap_or(serde_json::json!({}));
        serde_json::json!({
            "id": id,
            "name": name,
            "command": command,
            "args": args_val,
            "env": env_val,
            "cwd": cwd,
            "enabled": enabled != 0,
            "timeout_secs": timeout_secs,
        })
        .to_string()
    }

    pub async fn get_mcp_server(&self, id: String) -> anyhow::Result<Option<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare(
                "SELECT id, name, command, args, env, cwd, enabled, timeout_secs
                 FROM mcp_servers WHERE id = ?1",
            )?;
            let mut rows = stmt.query(params![id])?;
            if let Some(row) = rows.next()? {
                Ok(Some(Self::mcp_row_to_json(
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                )))
            } else {
                Ok(None)
            }
        })
        .await?
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn save_mcp_server(
        &self,
        id: String,
        name: String,
        command: String,
        args: String,
        env: String,
        cwd: Option<String>,
        enabled: bool,
        timeout_secs: u64,
    ) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            conn.execute(
                "INSERT INTO mcp_servers (id, name, command, args, env, cwd, enabled, timeout_secs)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                 ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    command = excluded.command,
                    args = excluded.args,
                    env = excluded.env,
                    cwd = excluded.cwd,
                    enabled = excluded.enabled,
                    timeout_secs = excluded.timeout_secs",
                params![
                    id,
                    name,
                    command,
                    args,
                    env,
                    cwd,
                    enabled as i32,
                    timeout_secs as i32,
                ],
            )?;
            Ok(())
        })
        .await?
    }

    pub async fn list_mcp_servers(&self) -> anyhow::Result<Vec<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare(
                "SELECT id, name, command, args, env, cwd, enabled, timeout_secs
                 FROM mcp_servers",
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(Self::mcp_row_to_json(
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                ))
            })?;
            let mut data_list = Vec::new();
            for d in rows {
                data_list.push(d?);
            }
            Ok(data_list)
        })
        .await?
    }

    pub async fn delete_mcp_server(&self, id: String) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            conn.execute("DELETE FROM mcp_servers WHERE id = ?1", params![id])?;
            Ok(())
        })
        .await?
    }

    // --- AI Skills CRUD ---

    fn skill_row_to_json(
        id: String,
        name: String,
        description: String,
        instructions: String,
        enabled: i32,
        linked_secrets: String,
    ) -> String {
        let secrets_val: serde_json::Value =
            serde_json::from_str(&linked_secrets).unwrap_or(serde_json::json!([]));
        serde_json::json!({
            "id": id,
            "name": name,
            "description": description,
            "instructions": instructions,
            "enabled": enabled != 0,
            "linked_secrets": secrets_val,
        })
        .to_string()
    }

    pub async fn get_skill(&self, id: String) -> anyhow::Result<Option<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare(
                "SELECT id, name, description, instructions, enabled, linked_secrets
                 FROM ai_skills WHERE id = ?1",
            )?;
            let mut rows = stmt.query(params![id])?;
            if let Some(row) = rows.next()? {
                Ok(Some(Self::skill_row_to_json(
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                )))
            } else {
                Ok(None)
            }
        })
        .await?
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn save_skill(
        &self,
        id: String,
        name: String,
        description: String,
        instructions: String,
        enabled: bool,
        linked_secrets: String,
    ) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            conn.execute(
                "INSERT INTO ai_skills (id, name, description, instructions, enabled, linked_secrets)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                 ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    instructions = excluded.instructions,
                    enabled = excluded.enabled,
                    linked_secrets = excluded.linked_secrets",
                params![id, name, description, instructions, enabled as i32, linked_secrets],
            )?;
            Ok(())
        })
        .await?
    }

    pub async fn list_skills(&self) -> anyhow::Result<Vec<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare(
                "SELECT id, name, description, instructions, enabled, linked_secrets
                 FROM ai_skills",
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(Self::skill_row_to_json(
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            })?;
            let mut data_list = Vec::new();
            for d in rows {
                data_list.push(d?);
            }
            Ok(data_list)
        })
        .await?
    }

    pub async fn delete_skill(&self, id: String) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            conn.execute("DELETE FROM ai_skills WHERE id = ?1", params![id])?;
            Ok(())
        })
        .await?
    }

    // --- AI Models CRUD ---

    fn ai_model_row_to_json(
        id: String,
        provider: String,
        name: String,
        api_key: String,
        base_url: String,
        enabled: i32,
        extra_params: String,
    ) -> String {
        let extra_val: serde_json::Value =
            serde_json::from_str(&extra_params).unwrap_or(serde_json::json!({}));
        let obj = serde_json::json!({
            "id": id,
            "provider": provider,
            "name": name,
            "api_key": api_key,
            "base_url": base_url,
            "enabled": enabled == 1,
            "extra_params": extra_val
        });
        serde_json::to_string(&obj).unwrap_or_default()
    }

    pub async fn get_ai_model(&self, id: String) -> anyhow::Result<Option<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare(
                "SELECT id, provider, name, api_key, base_url, enabled, extra_params
                 FROM ai_models WHERE id = ?1",
            )?;
            let mut rows = stmt.query(params![id])?;
            if let Some(row) = rows.next()? {
                Ok(Some(Self::ai_model_row_to_json(
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                )))
            } else {
                Ok(None)
            }
        })
        .await?
    }

    pub async fn save_ai_model(
        &self,
        id: String,
        provider: String,
        name: String,
        api_key: String,
        base_url: String,
        enabled: bool,
        extra_params: String,
    ) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let enabled_int = if enabled { 1 } else { 0 };
            conn.execute(
                "INSERT INTO ai_models (id, provider, name, api_key, base_url, enabled, extra_params)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                    provider = excluded.provider,
                    name = excluded.name,
                    api_key = excluded.api_key,
                    base_url = excluded.base_url,
                    enabled = excluded.enabled,
                    extra_params = excluded.extra_params",
                params![id, provider, name, api_key, base_url, enabled_int, extra_params],
            )?;
            Ok(())
        })
        .await?
    }

    pub async fn list_ai_models(&self) -> anyhow::Result<Vec<String>> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            let mut stmt = conn.prepare(
                "SELECT id, provider, name, api_key, base_url, enabled, extra_params
                 FROM ai_models",
            )?;
            let rows = stmt.query_map([], |row| {
                Ok(Self::ai_model_row_to_json(
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                ))
            })?;
            let mut result = Vec::new();
            for r in rows {
                if let Ok(json_str) = r {
                    result.push(json_str);
                }
            }
            Ok(result)
        })
        .await?
    }

    pub async fn delete_ai_model(&self, id: String) -> anyhow::Result<()> {
        let path = self.path.clone();
        tokio::task::spawn_blocking(move || {
            let conn = Connection::open(&path)?;
            conn.execute("DELETE FROM ai_models WHERE id = ?1", params![id])?;
            Ok(())
        })
        .await?
    }
}

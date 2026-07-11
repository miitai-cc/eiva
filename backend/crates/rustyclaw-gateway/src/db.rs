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
}

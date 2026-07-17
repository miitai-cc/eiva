use sqlx::AnyPool;
use crate::errors::SecurityError;
use crate::models::UserModel;

pub struct UserRepo;

impl UserRepo {
    pub async fn find_by_id(pool: &AnyPool, id: &str) -> Result<UserModel, SecurityError> {
        sqlx::query_as::<_, UserModel>(
            "SELECT id, username, email, role, created_at FROM users WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| SecurityError::NotFound(format!("User {} not found", id)))
    }

    pub async fn find_by_username(pool: &AnyPool, username: &str) -> Result<Option<UserModel>, SecurityError> {
        sqlx::query_as::<_, UserModel>(
            "SELECT id, username, email, role, created_at FROM users WHERE username = ?"
        )
        .bind(username)
        .fetch_optional(pool)
        .await
        .map_err(SecurityError::from)
    }

    pub async fn find_with_password(
        pool: &AnyPool,
        username: &str,
    ) -> Result<Option<(UserModel, String)>, SecurityError> {
        let row = sqlx::query_as::<_, (String, String, String, String, String, String)>(
            "SELECT id, username, email, password_hash, role, created_at FROM users WHERE username = ?"
        )
        .bind(username)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(|(id, username, email, password_hash, role, created_at)| {
            (UserModel { id, username, email, role, created_at }, password_hash)
        }))
    }

    pub async fn list_all(pool: &AnyPool) -> Result<Vec<UserModel>, SecurityError> {
        sqlx::query_as::<_, UserModel>(
            "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await
        .map_err(SecurityError::from)
    }

    pub async fn create(
        pool: &AnyPool,
        id: &str,
        username: &str,
        email: &str,
        password_hash: &str,
        role: &str,
    ) -> Result<UserModel, SecurityError> {
        sqlx::query(
            "INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(id)
        .bind(username)
        .bind(email)
        .bind(password_hash)
        .bind(role)
        .execute(pool)
        .await
        .map_err(|e| {
            if let sqlx::Error::Database(ref db_err) = e {
                if db_err.code().as_deref() == Some("23000") || db_err.is_unique_violation() {
                    return SecurityError::Conflict("Username or email already exists".into());
                }
            }
            SecurityError::Database(e)
        })?;

        Self::find_by_id(pool, id).await
    }

    pub async fn upsert_sso(
        pool: &AnyPool,
        id: &str,
        username: &str,
        email: &str,
        role: &str,
    ) -> Result<UserModel, SecurityError> {
        sqlx::query(
            "INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, '', ?)
             ON CONFLICT(id) DO UPDATE SET username=?, email=?, role=?"
        )
        .bind(id)
        .bind(username)
        .bind(email)
        .bind(role)
        .bind(username)
        .bind(email)
        .bind(role)
        .execute(pool)
        .await?;

        Self::find_by_id(pool, id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::any::AnyPoolOptions;
    use crate::password::hash_password;

    async fn setup_pool() -> AnyPool {
        sqlx::any::install_default_drivers();
        let pool = AnyPoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("Failed to create test pool");

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create users table");

        pool
    }

    #[tokio::test]
    async fn test_create_and_find_by_id() {
        let pool = setup_pool().await;
        let id = "test-id-1";
        let pwd = hash_password("password123");

        let user = UserRepo::create(&pool, id, "testuser", "test@example.com", &pwd, "user")
            .await
            .expect("Create should succeed");

        assert_eq!(user.id, id);
        assert_eq!(user.username, "testuser");
        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.role, "user");

        let found = UserRepo::find_by_id(&pool, id).await.expect("Find should succeed");
        assert_eq!(found.username, "testuser");
    }

    #[tokio::test]
    async fn test_find_by_username() {
        let pool = setup_pool().await;
        let pwd = hash_password("pwd");
        UserRepo::create(&pool, "id-2", "alice", "alice@example.com", &pwd, "admin").await.unwrap();

        let user = UserRepo::find_by_username(&pool, "alice").await.expect("Query should succeed");
        assert!(user.is_some());
        assert_eq!(user.unwrap().email, "alice@example.com");

        let none = UserRepo::find_by_username(&pool, "nobody").await.expect("Query should succeed");
        assert!(none.is_none());
    }

    #[tokio::test]
    async fn test_find_with_password() {
        let pool = setup_pool().await;
        let pwd = hash_password("secret!@#");
        UserRepo::create(&pool, "id-3", "bob", "bob@example.com", &pwd, "user").await.unwrap();

        let result = UserRepo::find_with_password(&pool, "bob").await.expect("Query should succeed");
        assert!(result.is_some());
        let (user, hash) = result.unwrap();
        assert_eq!(user.username, "bob");
        assert!(argon2::PasswordVerifier::verify_password(
            &argon2::Argon2::default(),
            "secret!@#".as_bytes(),
            &argon2::PasswordHash::new(&hash).unwrap(),
        ).is_ok());
    }

    #[tokio::test]
    async fn test_list_all() {
        let pool = setup_pool().await;
        let pwd = hash_password("pwd");
        UserRepo::create(&pool, "id-a", "a", "a@ex.com", &pwd, "user").await.unwrap();
        UserRepo::create(&pool, "id-b", "b", "b@ex.com", &pwd, "admin").await.unwrap();

        let users = UserRepo::list_all(&pool).await.expect("List should succeed");
        assert_eq!(users.len(), 2);
    }

    #[tokio::test]
    async fn test_create_duplicate_username() {
        let pool = setup_pool().await;
        let pwd = hash_password("pwd");
        UserRepo::create(&pool, "id-1", "dup", "dup1@ex.com", &pwd, "user").await.unwrap();

        let result = UserRepo::create(&pool, "id-2", "dup", "dup2@ex.com", &pwd, "user").await;
        assert!(result.is_err());
        match result.unwrap_err() {
            SecurityError::Conflict(_) => {} // expected
            other => panic!("Expected Conflict, got: {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_upsert_sso() {
        let pool = setup_pool().await;
        let user = UserRepo::upsert_sso(&pool, "sso-id", "sso_user", "sso@ex.com", "user")
            .await
            .expect("Upsert should succeed");
        assert_eq!(user.username, "sso_user");

        let updated = UserRepo::upsert_sso(&pool, "sso-id", "sso_user_v2", "sso_new@ex.com", "admin")
            .await
            .expect("Re-upsert should succeed");
        assert_eq!(updated.username, "sso_user_v2");
        assert_eq!(updated.email, "sso_new@ex.com");
        assert_eq!(updated.role, "admin");
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let pool = setup_pool().await;
        let result = UserRepo::find_by_id(&pool, "nonexistent").await;
        assert!(result.is_err());
        match result.unwrap_err() {
            SecurityError::NotFound(_) => {}
            other => panic!("Expected NotFound, got: {:?}", other),
        }
    }
}

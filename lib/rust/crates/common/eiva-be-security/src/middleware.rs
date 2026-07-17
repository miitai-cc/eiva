use salvo::prelude::*;
use salvo::http::{StatusCode, header};
use crate::jwt::verify_token;

pub struct AuthMiddleware {
    jwt_secret: String,
}

impl AuthMiddleware {
    pub fn new(jwt_secret: String) -> Self {
        Self { jwt_secret }
    }
}

#[async_trait]
impl Handler for AuthMiddleware {
    async fn handle(&self, req: &mut Request, depot: &mut Depot, res: &mut Response, ctrl: &mut FlowCtrl) {
        // Skip auth for login and health endpoints
        let path = req.uri().path().to_string();
        if path == "/api/auth/login" || path == "/api/auth/register" || path == "/api/health" {
            return;
        }

        let auth_header = match req.headers().get(header::AUTHORIZATION) {
            Some(v) => v.to_str().unwrap_or(""),
            None => {
                res.status_code(StatusCode::UNAUTHORIZED);
                res.render(Json(serde_json::json!({"error": "Missing authorization header"})));
                ctrl.skip_rest();
                return;
            }
        };

        let token = if auth_header.starts_with("Bearer ") {
            &auth_header[7..]
        } else {
            res.status_code(StatusCode::UNAUTHORIZED);
            res.render(Json(serde_json::json!({"error": "Invalid authorization format"})));
            ctrl.skip_rest();
            return;
        };

        match verify_token(token, &self.jwt_secret) {
            Ok(claims) => {
                depot.insert("user_id", claims.sub);
                depot.insert("username", claims.username);
                depot.insert("role", claims.role);
            }
            Err(_) => {
                res.status_code(StatusCode::UNAUTHORIZED);
                res.render(Json(serde_json::json!({"error": "Invalid or expired token"})));
                ctrl.skip_rest();
            }
        }
    }
}

use std::sync::Arc;

use axum::{
    Json,
    extract::{FromRequestParts, State},
    http::StatusCode,
    response::IntoResponse,
};
use uuid::Uuid;

use crate::{
    AppState,
    errors::ApiError,
    models::{CreateRequest, Device, UserRole},
};

pub async fn health_check() -> impl IntoResponse {
    StatusCode::OK
}

#[axum::debug_handler]
pub async fn debug_headers(headers: axum::http::HeaderMap) -> String {
    let mut s = String::new();
    for (k, v) in headers.iter() {
        s.push_str(&format!("{k}: {}\n", v.to_str().unwrap_or("???")));
    }
    s
}

pub async fn list_devices(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Device>>, ApiError> {
    let devices = sqlx::query_as::<_, Device>(
        r#"
            SELECT id, name, max_consumption, user_id, created_at
            FROM devices
            ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| ApiError::Internal)?;

    Ok(Json(devices))
}

#[axum::debug_handler]
pub async fn create(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
    Json(payload): Json<CreateRequest>,
) -> Result<Json<Device>, ApiError> {
    let device = sqlx::query_as::<_, Device>(
        r#"
          INSERT INTO devices (name, max_consumption, user_id)
          VALUES ($1, $2, $3)
          RETURNING id, name, max_consumption, user_id, created_at  
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.max_consumption)
    .bind(&user.user_id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(db) = &e {
            if db.code().as_deref() == Some("23505") {
                return ApiError::Conflict;
            }
        }
        ApiError::Internal
    })?;

    Ok(Json(device))
}

pub struct AuthenticatedUser {
    pub user_id: Uuid,
    pub role: UserRole,
}

impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Sync + Send,
{
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        let user_id_header = parts
            .headers
            .get("x-user-id")
            .ok_or(ApiError::Unauthorized("Missing X-User-Id".to_string()))?;
        let user_id_str = user_id_header
            .to_str()
            .map_err(|_| ApiError::Unauthorized("Invalid X-User-Id header".to_string()))?;
        let user_id = Uuid::parse_str(user_id_str)
            .map_err(|_| ApiError::Unauthorized("Invalid UUID in X-User-Id".to_string()))?;

        let role_header = parts
            .headers
            .get("x-user-role")
            .ok_or(ApiError::Unauthorized("Missing X-User-Role".to_string()))?;
        let role_str = role_header
            .to_str()
            .map_err(|_| ApiError::Unauthorized("Invalid X-User-Role header".to_string()))?;

        let role = match role_str.to_uppercase().as_str() {
            "ADMIN" => UserRole::ADMIN,
            "CLIENT" => UserRole::CLIENT,
            _ => return Err(ApiError::Unauthorized("Invalid role".to_string())),
        };

        Ok(AuthenticatedUser { user_id, role })
    }
}

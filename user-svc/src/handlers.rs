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
    models::{CreateRequest, UpdateRequest, User, UserRole},
};

pub async fn health_check() -> impl IntoResponse {
    StatusCode::OK
}

pub async fn create(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
    Json(payload): Json<CreateRequest>,
) -> Result<Json<User>, ApiError> {
    let user_data = sqlx::query_as::<_, User>(
        r#"
           INSERT INTO users (id, unit_energy, home_type, goal_kwh_month)
           VALUES ($1, $2, $3, $4)
           RETURNING id, unit_energy, home_type, goal_kwh_month, created_at, updated_at
        "#,
    )
    .bind(&user.user_id)
    .bind(&payload.unit_energy)
    .bind(&payload.home_type)
    .bind(&payload.goal_kwh_month)
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

    Ok(Json(user_data))
}

pub async fn update(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
    Json(payload): Json<UpdateRequest>,
) -> Result<Json<User>, ApiError> {
    let user_id = if let Some(target) = payload.user_id {
        if user.role != UserRole::ADMIN && target != user.user_id {
            return Err(ApiError::Unauthorized("Invalid role".to_string()));
        }
        target
    } else {
        user.user_id
    };

    let updated_user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET
            unit_energy     = COALESCE($2, unit_energy),
            home_type       = COALESCE($3, home_type),
            goal_kwh_month  = COALESCE($4, goal_kwh_month),
            updated_at      = NOW()
        WHERE id = $1
        RETURNING
            id,
            unit_energy,
            home_type,
            goal_kwh_month,
            created_at,
            updated_at
        "#,
    )
    .bind(&user_id)
    .bind(&payload.unit_energy)
    .bind(&payload.home_type)
    .bind(&payload.goal_kwh_month)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => ApiError::NotFound("user id not found".to_string()),
        sqlx::Error::Database(ref db) if db.code().as_deref() == Some("23505") => {
            ApiError::Conflict
        }
        _ => ApiError::Internal,
    })?;

    Ok(Json(updated_user))
}

pub async fn get_all(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
) -> Result<Json<Vec<User>>, ApiError> {
    if user.role != UserRole::ADMIN {
        return Err(ApiError::Unauthorized("Invalid role".to_string()));
    }

    let users = sqlx::query_as::<_, User>(
        r#"
        SELECT
            id,
            unit_energy,
            home_type,
            goal_kwh_month,
            created_at,
            updated_at
        FROM users
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|_| ApiError::Internal)?;

    Ok(Json(users))
}

pub async fn me(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
) -> Result<Json<User>, ApiError> {
    let me = sqlx::query_as::<_, User>(
        r#"
        SELECT
            id,
            unit_energy,
            home_type,
            goal_kwh_month,
            created_at,
            updated_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(&user.user_id)
    .fetch_one(&state.db_pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => ApiError::NotFound("user id not found".to_string()),
        _ => ApiError::Internal,
    })?;

    Ok(Json(me))
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
        _state: &S,
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

use std::sync::Arc;

use axum::{
    Json,
    extract::{FromRequestParts, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use uuid::Uuid;

use crate::{
    AppState,
    errors::ApiError,
    models::{CreateRequest, Device, UpdateRequest, UserRole},
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
    .bind(&payload.user_id)
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

#[axum::debug_handler]
pub async fn get_device(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Device>, ApiError> {
    let query = if user.role == UserRole::ADMIN {
        r#"
        SELECT id, name, max_consumption, user_id, created_at
        FROM devices
        WHERE id = $1
        "#
    } else {
        r#"
        SELECT id, name, max_consumption, user_id, created_at
        FROM devices
        WHERE id = $1 AND user_id = $2
        "#
    };

    let device = if user.role == UserRole::ADMIN {
        sqlx::query_as::<_, Device>(query)
            .bind(id)
            .fetch_optional(&state.db_pool)
            .await
    } else {
        sqlx::query_as::<_, Device>(query)
            .bind(id)
            .bind(user.user_id)
            .fetch_optional(&state.db_pool)
            .await
    }
    .map_err(|_| ApiError::Internal)?
    .ok_or(ApiError::NotFound("device id not found".to_string()))?;

    Ok(Json(device))
}

pub async fn list_devices(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
) -> Result<Json<Vec<Device>>, ApiError> {
    let devices = if user.role == UserRole::ADMIN {
        sqlx::query_as::<_, Device>(
            r#"
            SELECT id, name, max_consumption, user_id, created_at
            FROM devices
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(&state.db_pool)
        .await
    } else {
        sqlx::query_as::<_, Device>(
            r#"
            SELECT id, name, max_consumption, user_id, created_at
            FROM devices
            WHERE user_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(user.user_id)
        .fetch_all(&state.db_pool)
        .await
    }
    .map_err(|_| ApiError::Internal)?;

    Ok(Json(devices))
}

pub async fn update(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
    Json(payload): Json<UpdateRequest>,
) -> Result<Json<Device>, ApiError> {
    let query = if user.role == UserRole::ADMIN {
        r#"
        UPDATE devices
        SET 
            name = COALESCE($2, name),
            max_consumption = COALESCE($3, max_consumption)
        WHERE id = $1
        RETURNING id, name, max_consumption, user_id, created_at
        "#
    } else {
        r#"
        UPDATE devices
        SET 
            name = COALESCE($2, name),
            max_consumption = COALESCE($3, max_consumption)
        WHERE id = $1 AND user_id = $4
        RETURNING id, name, max_consumption, user_id, created_at
        "#
    };

    let device = if user.role == UserRole::ADMIN {
        sqlx::query_as::<_, Device>(query)
            .bind(payload.id)
            .bind(payload.name.as_ref())
            .bind(payload.max_consumption)
            .fetch_optional(&state.db_pool)
            .await
    } else {
        sqlx::query_as::<_, Device>(query)
            .bind(payload.id)
            .bind(payload.name.as_ref())
            .bind(payload.max_consumption)
            .bind(user.user_id)
            .fetch_optional(&state.db_pool)
            .await
    }
    .map_err(|_| ApiError::Internal)?
    .ok_or(ApiError::NotFound("device id not found".to_string()))?;

    Ok(Json(device))
}

#[axum::debug_handler]
pub async fn delete_device(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    if user.role != UserRole::ADMIN {
        return Err(ApiError::Unauthorized("Not an admin".to_string()));
    }

    let result = sqlx::query(
        r#"
        DELETE FROM devices
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(&state.db_pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Ok(StatusCode::NO_CONTENT),
        Ok(_) => Err(ApiError::NotFound("device id not found".to_string())),
        Err(e) => {
            if let sqlx::Error::Database(db) = &e {
                if db.code().as_deref() == Some("23503") {
                    return Err(ApiError::Conflict);
                }
            }
            Err(ApiError::Internal)
        }
    }
}

#[axum::debug_handler]
pub async fn delete_all_devices(
    State(state): State<Arc<AppState>>,
    user: AuthenticatedUser,
) -> Result<StatusCode, ApiError> {
    if user.role == UserRole::ADMIN {
        return Err(ApiError::Unauthorized("Not an admin".to_string()));
    }

    let result = sqlx::query(
        r#"
        DELETE FROM devices
        "#,
    )
    .execute(&state.db_pool)
    .await;

    match result {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => {
            if let sqlx::Error::Database(db) = &e {
                if db.code().as_deref() == Some("23503") {
                    return Err(ApiError::Conflict);
                }
            }
            Err(ApiError::Internal)
        }
    }
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

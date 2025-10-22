use std::{
    fmt::{Display, Formatter},
    sync::Arc,
};

use argon2::{
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
    password_hash::{SaltString, rand_core::OsRng},
};
use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};
use reqwest::Client;
use serde::Serialize;
use uuid::Uuid;

use crate::{
    AppState,
    config::JwtConfig,
    jwt::{AuthUser, sign, verify},
    user::{AuthResponse, LoginRequest, RegisterRequest, User, UserResponse},
};

pub async fn health_check() -> impl IntoResponse {
    StatusCode::OK
}

pub async fn test_device_health() -> Result<String, StatusCode> {
    let client = Client::new();

    match client.get("http://device-svc:8080/health").send().await {
        Ok(response) => {
            if response.status().is_success() {
                Ok("Device service is healthy.".to_string())
            } else {
                Err(StatusCode::SERVICE_UNAVAILABLE)
            }
        }
        Err(_) => Err(StatusCode::SERVICE_UNAVAILABLE),
    }
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<User>, ApiError> {
    let hash = hash_password(&payload.password).map_err(|_| ApiError::Internal)?;

    let user = sqlx::query_as::<_, User>(
        r#"
    INSERT INTO users (username, password_hash)
    VALUES ($1, $2)
    RETURNING id, username, password_hash, role, created_at
    "#,
    )
    .bind(&payload.username)
    .bind(&hash)
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

    Ok(Json(user))
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, password_hash, role, created_at FROM users WHERE username=$1",
    )
    .bind(&payload.username)
    .fetch_optional(&state.db_pool)
    .await
    .map_err(|e| {
        tracing::error!(?e, "db error on login");
        ApiError::Internal
    })?
    .ok_or(ApiError::BadCredentials)?;

    if !verify_password(&payload.password, &user.password_hash).map_err(|e| {
        tracing::warn!(?e, "bad password hash");
        ApiError::BadCredentials
    })? {
        return Err(ApiError::BadCredentials);
    }

    let cfg = JwtConfig::from_env();
    let token = sign(user.id, user.role, &cfg).map_err(|e| {
        tracing::error!(?e, "jwt sign failed");
        ApiError::Internal
    })?;

    Ok(Json(AuthResponse {
        access_token: token,
        token_type: "Bearer".into(),
        expires_in: cfg.ttl_seconds,
    }))
}

#[derive(Serialize)]
pub struct MeResponse {
    user_id: Uuid,
}

pub async fn me(user: AuthUser) -> Result<Json<MeResponse>, ApiError> {
    Ok(Json(MeResponse {
        user_id: user.user_id,
    }))
}

pub async fn verify_token(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, StatusCode> {
    let token = extract_bearer(&headers).ok_or(StatusCode::UNAUTHORIZED)?;

    let cfg = JwtConfig::from_env();

    let claims = verify(token, &cfg).map_err(|_| StatusCode::UNAUTHORIZED)?;

    let mut out = HeaderMap::new();

    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| StatusCode::UNAUTHORIZED)?;
    out.insert("X-User-Id", user_id.to_string().parse().unwrap());

    out.insert("X-User-Role", claims.role.to_string().parse().unwrap());
    Ok((StatusCode::OK, out))
}

fn extract_bearer(headers: &HeaderMap) -> Option<&str> {
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)?
        .to_str()
        .ok()?;
    let (scheme, token) = auth.split_once(' ')?;
    if scheme.eq_ignore_ascii_case("bearer") {
        Some(token)
    } else {
        None
    }
}

fn hash_password(pwd: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon = Argon2::default();
    let hash = argon.hash_password(pwd.as_bytes(), &salt)?;
    Ok(hash.to_string())
}

fn verify_password(password: &str, stored: &str) -> Result<bool, argon2::password_hash::Error> {
    let parsed = PasswordHash::new(stored)?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

#[derive(Debug)]
pub enum ApiError {
    BadCredentials,
    Conflict,
    Internal,
}

impl Display for ApiError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            ApiError::BadCredentials => f.write_str("bad credentials"),
            ApiError::Conflict => f.write_str("conflict"),
            ApiError::Internal => f.write_str("internal server error"),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let status = match self {
            ApiError::BadCredentials => StatusCode::UNAUTHORIZED,
            ApiError::Conflict => StatusCode::CONFLICT,
            ApiError::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        };
        (status, self.to_string()).into_response()
    }
}

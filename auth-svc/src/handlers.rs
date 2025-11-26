use std::sync::Arc;

use argon2::{
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
    password_hash::{SaltString, rand_core::OsRng},
};
use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use reqwest::Client;
use serde::Serialize;
use tracing::error;
use uuid::Uuid;

use crate::{
    AppState,
    config::JwtConfig,
    errors::ApiError,
    jwt::{sign, verify},
    messaging::{UserCreatedEvent, UserPayload},
    user::{AuthResponse, LoginRequest, RegisterRequest, User},
};

pub async fn health_check() -> impl IntoResponse {
    StatusCode::OK
}

#[derive(Serialize)]
struct CreateUserPayload {
    unit_energy: String,
    home_type: String,
    goal_kwh_month: i64,
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
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

    let cfg = JwtConfig::from_env();
    let token = sign(user.id, user.role, &cfg).map_err(|e| {
        tracing::error!(?e, "jwt sign failed");
        ApiError::Internal
    })?;

    let create_body = CreateUserPayload {
        unit_energy: "KWH".into(),
        home_type: "HOUSE".into(),
        goal_kwh_month: 300,
    };

    let traefik = std::env::var("TRAEFIK_URL").unwrap_or_else(|_| "http://traefik:80".into());
    let host = std::env::var("TRAEFIK_HOST").unwrap_or_else(|_| "localhost".into());
    let url = format!("{}/user/create", traefik);

    let resp = Client::new()
        .post(&url)
        .header("Host", host)
        .bearer_auth(&token)
        .json(&create_body)
        .send()
        .await
        .map_err(|e| {
            tracing::error!(?e, "user-svc call failed");
            ApiError::Internal
        })?;

    if let Err(e) = resp.error_for_status_ref() {
        tracing::error!(
            ?e,
            "user-svc /create returned error; rolling back auth user"
        );
        let _ = sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(user.id)
            .execute(&state.db_pool)
            .await;
        return Err(ApiError::Internal);
    }

    if let Err(err) = state
        .publisher
        .publish_user_created(&UserCreatedEvent {
            event_type: "USER_CREATED",
            user_id: user.id,
            payload: UserPayload {
                id: user.id,
                username: user.username.clone(),
                default_unit: create_body.unit_energy.clone(),
                default_home_type: create_body.home_type.clone(),
                default_goal: create_body.goal_kwh_month,
            },
        })
        .await
    {
        error!(?err, "failed to publish USER_CREATED event");
    }

    Ok(Json(AuthResponse {
        access_token: token,
        token_type: "Bearer".into(),
        expires_in: cfg.ttl_seconds,
    }))
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

pub async fn verify_token(headers: HeaderMap) -> Result<impl IntoResponse, StatusCode> {
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

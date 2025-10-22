use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation};
use time::{Duration, OffsetDateTime};

use crate::{config::JwtConfig, handlers::ApiError, user::UserRole};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub iss: String,
    pub aud: String,
    pub exp: i64,
    pub iat: i64,
    pub role: UserRole,
}

pub fn sign(user_id: Uuid, role: UserRole, cfg: &JwtConfig) -> Result<String, ApiError> {
    let now = OffsetDateTime::now_utc();
    let exp = now + Duration::seconds(cfg.ttl_seconds as i64);

    let claims = Claims {
        sub: user_id.to_string(),
        iss: cfg.issuer.clone(),
        aud: cfg.audience.clone(),
        exp: exp.unix_timestamp(),
        iat: now.unix_timestamp(),
        role,
    };

    jsonwebtoken::encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(cfg.secret.as_bytes()),
    )
    .map_err(|_| ApiError::Internal)
}

pub fn verify(token: &str, cfg: &JwtConfig) -> Result<Claims, ApiError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_audience(&[cfg.audience.clone()]);
    validation.set_issuer(&[cfg.issuer.clone()]);
    validation.validate_exp = true;

    jsonwebtoken::decode::<Claims>(
        token,
        &DecodingKey::from_secret(cfg.secret.as_bytes()),
        &validation,
    )
    .map(|data| data.claims)
    .map_err(|_| ApiError::BadCredentials) // treat any verify error as 401
}

/// Extractor that enforces a valid Bearer token and exposes the subject as a UUID
pub struct AuthUser {
    pub user_id: Uuid,
}

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> + Send {
        // Clone whatever you need to move into the async block
        let header_opt = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .map(|v| v.to_string());

        async move {
            let auth_header = header_opt.ok_or(ApiError::BadCredentials)?;
            let token = auth_header
                .strip_prefix("Bearer ")
                .ok_or(ApiError::BadCredentials)?;

            let cfg = JwtConfig::from_env();
            let claims = verify(token, &cfg).map_err(|_| ApiError::BadCredentials)?;
            let user_id = Uuid::parse_str(&claims.sub).map_err(|_| ApiError::BadCredentials)?;
            Ok(AuthUser { user_id })
        }
    }
}

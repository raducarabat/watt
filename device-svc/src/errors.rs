use std::fmt::{self, Display, Formatter};

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;

#[derive(Debug)]
pub enum ApiError {
    Unauthorized(String),
    Conflict,
    BadRequest(String),
    Internal,
}

impl Display for ApiError {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::Unauthorized(err) => write!(f, "unauthorized: {}", err),
            ApiError::Conflict => write!(f, "conflict"),
            ApiError::BadRequest(err) => write!(f, "bad request: {}", err),
            ApiError::Internal => write!(f, "internal server error"),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            ApiError::Unauthorized(msg) => {
                (StatusCode::UNAUTHORIZED, Json(json!({ "error": msg }))).into_response()
            }

            ApiError::Conflict => {
                (StatusCode::CONFLICT, Json(json!({ "error": "conflict" }))).into_response()
            }

            ApiError::BadRequest(msg) => {
                (StatusCode::BAD_REQUEST, Json(json!({ "error": msg }))).into_response()
            }

            ApiError::Internal => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "internal server error" })),
            )
                .into_response(),
        }
    }
}

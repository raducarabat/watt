use std::fmt::{Display, Formatter};

use axum::response::{IntoResponse, Response};
use reqwest::StatusCode;

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

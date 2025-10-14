use axum::{
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use reqwest::Client;

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

pub async fn verify_token(headers: HeaderMap) -> StatusCode {
    if headers.contains_key("authorization") {
        StatusCode::OK
    } else {
        StatusCode::UNAUTHORIZED
    }
}

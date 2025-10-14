use axum::{Router, routing::get};

use crate::handlers::{self, test_device_health, verify_token};

pub fn create_routes() -> Router<()> {
    Router::new()
        .route("/health", get(handlers::health_check))
        .route("/test-device", get(test_device_health))
        .route("/verify-token", get(verify_token))
}

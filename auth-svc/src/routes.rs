use std::sync::Arc;

use axum::{
    Router,
    routing::{get, post},
};

use crate::{
    AppState,
    handlers::{self, login, me, register, test_device_health},
};

pub fn create_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(handlers::health_check))
        .route("/test-device", get(test_device_health))
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/me", get(me))
}

use std::sync::Arc;

use axum::{
    Router,
    routing::{get, post},
};

use crate::{
    AppState,
    handlers::{self, login, register},
};

pub fn create_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(handlers::health_check))
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/verify", get(handlers::verify_token))
}

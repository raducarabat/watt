use axum::{Router, routing::get};

use crate::handlers::health_check;

pub fn create_routes() -> Router<()> {
    Router::new().route("/health", get(health_check))
}

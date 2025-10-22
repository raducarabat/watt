use std::sync::Arc;

use axum::{
    Router,
    middleware::from_fn,
    routing::{get, post},
};

use crate::{
    AppState,
    handlers::{self, create, debug_headers, health_check},
    middleware::require_admin_middleware,
};

pub fn create_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(health_check))
        .route(
            "/create",
            post(create).route_layer(from_fn(require_admin_middleware)),
        )
        .route("/read", get(handlers::list_devices))
        .route("/debug", get(debug_headers))
}

use std::sync::Arc;

use axum::{
    Router,
    middleware::from_fn,
    routing::{delete, get, post, put},
};

use crate::{
    AppState,
    handlers::{
        self, create, debug_headers, delete_all_devices, delete_device, get_device, health_check,
        update,
    },
    middleware::require_admin_middleware,
};

pub fn create_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(health_check))
        .route(
            "/create",
            post(create).route_layer(from_fn(require_admin_middleware)),
        )
        .route("/read/all", get(handlers::list_devices))
        .route("/debug", get(debug_headers))
        .route("/read/{id}", get(get_device))
        .route("/update", put(update))
        .route("/delete/{id}", delete(delete_device))
        .route("/delete/all", delete(delete_all_devices))
}

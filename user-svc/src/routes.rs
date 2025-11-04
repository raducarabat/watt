use std::sync::Arc;

use axum::{
    Router,
    routing::{get, post, put},
};

use crate::{
    AppState,
    handlers::{create, get_all, health_check, me, update},
};

pub fn create_route() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(health_check))
        .route("/create", post(create))
        .route("/update", put(update))
        .route("/get_all", get(get_all))
        .route("/me", get(me))
}

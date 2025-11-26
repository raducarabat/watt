use std::sync::Arc;

use axum::{
    Json, Router,
    extract::Query,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
};
use chrono::NaiveDate;
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    AppState, db,
    models::{ConsumptionResponse, HourlyPoint},
};

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/consumption", get(get_consumption))
        .with_state(state)
}

async fn health() -> impl IntoResponse {
    StatusCode::OK
}

#[derive(Debug, Deserialize)]
struct ConsumptionQuery {
    device_id: Uuid,
    day: String,
}

async fn get_consumption(
    Query(query): Query<ConsumptionQuery>,
    state: axum::extract::State<Arc<AppState>>,
) -> Result<Json<ConsumptionResponse>, Response> {
    let day = NaiveDate::parse_from_str(&query.day, "%Y-%m-%d")
        .map_err(|_| StatusCode::BAD_REQUEST.into_response())?;

    let mut points = vec![
        HourlyPoint {
            hour: 0,
            value: 0.0
        };
        24
    ];
    for (idx, point) in points.iter_mut().enumerate() {
        point.hour = idx as i32;
    }

    let existing = db::fetch_consumption(&state.db_pool, query.device_id, day)
        .await
        .map_err(|err| {
            tracing::error!(?err, "failed to fetch consumption");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        })?;

    for item in existing {
        if let Some(target) = points.get_mut(item.hour as usize) {
            target.value = item.value;
        }
    }

    Ok(Json(ConsumptionResponse {
        device_id: query.device_id,
        day,
        points,
    }))
}

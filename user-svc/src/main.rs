use std::sync::Arc;

use axum::Router;
use routes::create_route;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod errors;
mod handlers;
mod messaging;
mod middleware;
mod models;
mod routes;

use messaging::EventPublisher;

struct AppState {
    db_pool: PgPool,
    publisher: EventPublisher,
}

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!();

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set.");
    let broker_url =
        std::env::var("SYNC_BROKER_URL").expect("SYNC_BROKER_URL must be set for user-svc.");
    let sync_queue = std::env::var("SYNC_QUEUE").unwrap_or_else(|_| "sync.events".into());

    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&db_url)
        .await?;

    MIGRATOR.run(&pool).await?;

    let publisher = EventPublisher::new(broker_url, sync_queue).await?;

    let shared_state = Arc::new(AppState {
        db_pool: pool,
        publisher,
    });

    let app = Router::new()
        .merge(create_route())
        .with_state(shared_state.clone());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("listening on 8080");
    axum::serve(listener, app).await?;

    Ok(())
}

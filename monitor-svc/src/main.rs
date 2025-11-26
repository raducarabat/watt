use std::sync::Arc;

use config::AppConfig;
use consumers::{spawn_measurement_consumer, spawn_sync_consumer};
use http::router;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tokio::signal;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod consumers;
mod db;
mod http;
mod models;

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!();

pub struct AppState {
    pub db_pool: PgPool,
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = Arc::new(AppConfig::from_env());

    let pool = PgPoolOptions::new()
        .max_connections(cfg.max_db_connections)
        .connect(&cfg.database_url)
        .await?;

    MIGRATOR.run(&pool).await?;

    let state = Arc::new(AppState {
        db_pool: pool.clone(),
    });

    let _measurement_handle = spawn_measurement_consumer(cfg.clone(), pool.clone());
    let _sync_handle = spawn_sync_consumer(cfg.clone(), pool.clone());

    let app = router(state);

    let listener = tokio::net::TcpListener::bind(cfg.http_addr()).await?;
    info!("monitor-svc listening on {}", cfg.http_addr());

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    info!("signal received, shutting down monitor-svc");
}

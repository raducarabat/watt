use std::{fs, path::PathBuf, time::Duration};

use anyhow::Context;
use chrono::{DateTime, Timelike, Utc};
use lapin::{
    BasicProperties, Channel, Connection, ConnectionProperties,
    options::{BasicPublishOptions, ConfirmSelectOptions, QueueDeclareOptions},
    types::FieldTable,
};
use rand::Rng;
use serde::Deserialize;
use serde_json::json;
use tokio::{signal, time::interval};
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
struct SimulatorConfig {
    broker_url: String,
    queue: String,
    #[serde(default = "default_interval_seconds")]
    interval_seconds: u64,
    devices: Vec<DeviceConfig>,
}

#[derive(Debug, Deserialize)]
struct DeviceConfig {
    device_id: Uuid,
    #[serde(default = "default_base_load")]
    night_load: f64,
    #[serde(default = "default_peak_load")]
    peak_load: f64,
}

fn default_interval_seconds() -> u64 {
    600
}

fn default_base_load() -> f64 {
    0.1
}

fn default_peak_load() -> f64 {
    0.8
}

fn config_path() -> PathBuf {
    std::env::var("SIMULATOR_CONFIG")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("device-simulator/config.json"))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = load_config(config_path()).context("failed to load simulator config")?;

    let connection = Connection::connect(&cfg.broker_url, ConnectionProperties::default()).await?;
    let channel = connection.create_channel().await?;

    channel
        .queue_declare(
            &cfg.queue,
            QueueDeclareOptions {
                durable: true,
                auto_delete: false,
                ..Default::default()
            },
            FieldTable::default(),
        )
        .await?;

    channel
        .confirm_select(ConfirmSelectOptions::default())
        .await?;

    info!(
        "device simulator started; publishing {} devices every {}s",
        cfg.devices.len(),
        cfg.interval_seconds
    );

    let mut ticker = interval(Duration::from_secs(cfg.interval_seconds));

    loop {
        tokio::select! {
            _ = ticker.tick() => {
                if let Err(err) = publish_batch(&channel, &cfg).await {
                    error!(?err, "failed to publish batch");
                }
            }
            _ = shutdown_signal() => {
                info!("shutdown signal received");
                break;
            }
        }
    }

    Ok(())
}

fn load_config(path: PathBuf) -> anyhow::Result<SimulatorConfig> {
    let bytes = fs::read(&path)
        .with_context(|| format!("cannot read simulator config at {}", path.display()))?;
    let config = serde_json::from_slice(&bytes)
        .with_context(|| format!("invalid simulator config at {}", path.display()))?;
    Ok(config)
}

async fn publish_batch(channel: &Channel, cfg: &SimulatorConfig) -> anyhow::Result<()> {
    let mut rng = rand::rng();
    let now = Utc::now();
    for device in &cfg.devices {
        let value = generate_measurement(device, now, &mut rng);
        let payload = json!({
            "timestamp": now,
            "device_id": device.device_id,
            "measurement_value": value
        });
        let body = serde_json::to_vec(&payload)?;
        channel
            .basic_publish(
                "",
                &cfg.queue,
                BasicPublishOptions::default(),
                &body,
                BasicProperties::default().with_delivery_mode(2),
            )
            .await?
            .await?;
    }
    Ok(())
}

fn generate_measurement(
    device: &DeviceConfig,
    ts: DateTime<Utc>,
    rng: &mut rand::rngs::ThreadRng,
) -> f64 {
    let hour = ts.hour() as f64;
    let base = device.night_load;
    let peak = device.peak_load;
    let normalized = (hour - 18.0).abs() / 6.0;
    let curve = if normalized < 1.0 {
        peak - (peak - base) * normalized
    } else if hour < 6.0 {
        base
    } else {
        base + (peak - base) * (1.0 - (hour - 12.0).abs() / 12.0).max(0.0)
    };
    let noise: f64 = rng.random_range(-0.05..0.05);
    (curve + noise).max(0.0)
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
}

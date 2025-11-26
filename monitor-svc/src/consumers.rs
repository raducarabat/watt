use std::{sync::Arc, time::Duration};

use futures_util::StreamExt;
use lapin::{
    Channel, Connection, ConnectionProperties, Consumer,
    options::{
        BasicAckOptions, BasicConsumeOptions, BasicNackOptions, BasicQosOptions,
        QueueDeclareOptions,
    },
    types::FieldTable,
};
use sqlx::{self, PgPool};
use tokio::task::JoinHandle;
use tracing::{error, info, warn};

use crate::{
    config::AppConfig,
    db::{self, HourBucket},
    models::{MeasurementMessage, SyncEnvelope},
};

const RECONNECT_DELAY: Duration = Duration::from_secs(5);

pub fn spawn_measurement_consumer(cfg: Arc<AppConfig>, pool: PgPool) -> JoinHandle<()> {
    tokio::spawn(async move {
        loop {
            match run_measurement_consumer(cfg.clone(), pool.clone()).await {
                Ok(_) => info!("measurement consumer exited"),
                Err(err) => error!(?err, "measurement consumer error"),
            }
            tokio::time::sleep(RECONNECT_DELAY).await;
        }
    })
}

pub fn spawn_sync_consumer(cfg: Arc<AppConfig>, pool: PgPool) -> JoinHandle<()> {
    tokio::spawn(async move {
        loop {
            match run_sync_consumer(cfg.clone(), pool.clone()).await {
                Ok(_) => info!("sync consumer exited"),
                Err(err) => error!(?err, "sync consumer error"),
            }
            tokio::time::sleep(RECONNECT_DELAY).await;
        }
    })
}

async fn create_connection(url: &str) -> Result<Connection, lapin::Error> {
    Connection::connect(url, ConnectionProperties::default()).await
}

async fn run_measurement_consumer(cfg: Arc<AppConfig>, pool: PgPool) -> Result<(), anyhow::Error> {
    let conn = create_connection(&cfg.data_broker_url).await?;
    let channel = conn.create_channel().await?;
    channel.basic_qos(50, BasicQosOptions::default()).await?;

    declare_queue(&channel, &cfg.measurement_queue).await?;

    let mut consumer = channel
        .basic_consume(
            &cfg.measurement_queue,
            "monitor-measurements",
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await?;

    process_measurements(&mut consumer, pool).await;

    Ok(())
}

async fn run_sync_consumer(cfg: Arc<AppConfig>, pool: PgPool) -> Result<(), anyhow::Error> {
    let conn = create_connection(&cfg.sync_broker_url).await?;
    let channel = conn.create_channel().await?;
    channel.basic_qos(20, BasicQosOptions::default()).await?;

    declare_queue(&channel, &cfg.sync_queue).await?;

    let mut consumer = channel
        .basic_consume(
            &cfg.sync_queue,
            "monitor-sync",
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await?;

    process_sync_events(&mut consumer, pool).await;

    Ok(())
}

async fn declare_queue(channel: &Channel, name: &str) -> Result<(), lapin::Error> {
    channel
        .queue_declare(
            name,
            QueueDeclareOptions {
                durable: true,
                auto_delete: false,
                ..Default::default()
            },
            FieldTable::default(),
        )
        .await?;
    Ok(())
}

async fn process_measurements(consumer: &mut Consumer, pool: PgPool) {
    while let Some(delivery) = consumer.next().await {
        match delivery {
            Ok(delivery) => {
                let result: Result<(), anyhow::Error> = async {
                    let msg: MeasurementMessage = serde_json::from_slice(&delivery.data)?;
                    let bucket = HourBucket::from_timestamp(msg.timestamp);

                    match db::accumulate_measurement(
                        &pool,
                        msg.device_id,
                        &bucket,
                        msg.measurement_value,
                    )
                    .await
                    {
                        Ok(_) => Ok(()),
                        Err(sqlx::Error::Database(db_err))
                            if db_err.code().as_deref() == Some("23503") =>
                        {
                            db::ensure_device_placeholder(&pool, msg.device_id).await?;
                            db::accumulate_measurement(
                                &pool,
                                msg.device_id,
                                &bucket,
                                msg.measurement_value,
                            )
                            .await?;
                            Ok(())
                        }
                        Err(err) => Err(err.into()),
                    }
                }
                .await;

                match result {
                    Ok(_) => {
                        if let Err(err) = delivery.ack(BasicAckOptions::default()).await {
                            error!(?err, "failed to ack measurement message");
                        }
                    }
                    Err(err) => {
                        error!(?err, "failed to process measurement message");
                        if let Err(nack_err) = delivery
                            .nack(BasicNackOptions {
                                requeue: true,
                                ..Default::default()
                            })
                            .await
                        {
                            error!(?nack_err, "failed to nack measurement message");
                        }
                    }
                }
            }
            Err(err) => error!(?err, "measurement consumer delivery error"),
        }
    }
}

async fn process_sync_events(consumer: &mut Consumer, pool: PgPool) {
    while let Some(delivery) = consumer.next().await {
        match delivery {
            Ok(delivery) => {
                let result = async {
                    let event: SyncEnvelope = serde_json::from_slice(&delivery.data)?;
                    match event.event_type.as_str() {
                        "DEVICE_CREATED" | "DEVICE_UPDATED" => {
                            if let Some(payload) = event.payload {
                                db::upsert_device(&pool, &payload).await?;
                            } else {
                                warn!("device event missing payload: {:?}", event);
                            }
                        }
                        "DEVICE_DELETED" => {
                            if let Some(device_id) = event.device_id {
                                db::delete_device(&pool, device_id).await?;
                            } else if let Some(payload) = event.payload {
                                db::delete_device(&pool, payload.id).await?;
                            } else {
                                warn!("device delete event missing id: {:?}", event);
                            }
                        }
                        other => {
                            warn!(event_type = other, "unhandled sync event");
                        }
                    }

                    Ok::<(), anyhow::Error>(())
                }
                .await;

                match result {
                    Ok(_) => {
                        if let Err(err) = delivery.ack(BasicAckOptions::default()).await {
                            error!(?err, "failed to ack sync message");
                        }
                    }
                    Err(err) => {
                        error!(?err, "failed to process sync message");
                        if let Err(nack_err) = delivery
                            .nack(BasicNackOptions {
                                requeue: true,
                                ..Default::default()
                            })
                            .await
                        {
                            error!(?nack_err, "failed to nack sync message");
                        }
                    }
                }
            }
            Err(err) => error!(?err, "sync consumer delivery error"),
        }
    }
}

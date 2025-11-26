use std::time::Duration;

use lapin::{
    BasicProperties, Channel, Connection, ConnectionProperties,
    options::{BasicPublishOptions, ConfirmSelectOptions, QueueDeclareOptions},
    types::FieldTable,
};
use serde::Serialize;
use tokio::sync::Mutex;
use tracing::error;
use uuid::Uuid;

use crate::models::Device;

const RECONNECT_DELAY: Duration = Duration::from_secs(2);

pub struct EventPublisher {
    url: String,
    queue: String,
    inner: Mutex<Option<ChannelState>>,
}

struct ChannelState {
    #[allow(dead_code)]
    connection: Connection,
    channel: Channel,
}

#[derive(Serialize)]
struct SyncEnvelope<T: Serialize> {
    event_type: &'static str,
    user_id: Option<Uuid>,
    device_id: Option<Uuid>,
    payload: Option<T>,
}

#[derive(Serialize)]
struct DevicePayload {
    id: Uuid,
    user_id: Uuid,
    name: String,
    max_consumption: i32,
    metadata: serde_json::Value,
}

impl EventPublisher {
    pub async fn new(url: String, queue: String) -> anyhow::Result<Self> {
        let publisher = Self {
            url,
            queue,
            inner: Mutex::new(None),
        };
        publisher.ensure_channel().await?;
        Ok(publisher)
    }

    pub async fn publish_device_event(
        &self,
        event_type: &'static str,
        device: &Device,
    ) -> anyhow::Result<()> {
        let payload = DevicePayload {
            id: device.id,
            user_id: device.user_id,
            name: device.name.clone(),
            max_consumption: device.max_consumption,
            metadata: serde_json::json!({}),
        };

        let event = SyncEnvelope {
            event_type,
            user_id: Some(device.user_id),
            device_id: Some(device.id),
            payload: Some(payload),
        };

        self.publish(&event).await
    }

    pub async fn publish_device_deleted(&self, device_id: Uuid) -> anyhow::Result<()> {
        let event: SyncEnvelope<serde_json::Value> = SyncEnvelope {
            event_type: "DEVICE_DELETED",
            user_id: None,
            device_id: Some(device_id),
            payload: None,
        };
        self.publish(&event).await
    }

    async fn publish<T: Serialize>(&self, event: &T) -> anyhow::Result<()> {
        let payload = serde_json::to_vec(event)?;
        let mut attempts = 0;
        loop {
            let channel = match self.ensure_channel().await {
                Ok(channel) => channel,
                Err(err) => {
                    attempts += 1;
                    if attempts >= 3 {
                        return Err(err);
                    }
                    tokio::time::sleep(RECONNECT_DELAY).await;
                    continue;
                }
            };

            match channel
                .basic_publish(
                    "",
                    &self.queue,
                    BasicPublishOptions::default(),
                    &payload,
                    BasicProperties::default().with_delivery_mode(2),
                )
                .await
            {
                Ok(confirm) => {
                    confirm.await?;
                    return Ok(());
                }
                Err(err) => {
                    error!(?err, "failed to publish device sync event");
                    self.reset().await;
                    attempts += 1;
                    if attempts >= 3 {
                        return Err(err.into());
                    }
                    tokio::time::sleep(RECONNECT_DELAY).await;
                }
            }
        }
    }

    async fn ensure_channel(&self) -> anyhow::Result<Channel> {
        if let Some(state) = self.inner.lock().await.as_ref() {
            return Ok(state.channel.clone());
        }

        self.reconnect().await
    }

    async fn reconnect(&self) -> anyhow::Result<Channel> {
        let conn = Connection::connect(&self.url, ConnectionProperties::default()).await?;
        let channel = conn.create_channel().await?;
        channel
            .queue_declare(
                &self.queue,
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

        let mut guard = self.inner.lock().await;
        *guard = Some(ChannelState {
            connection: conn,
            channel: channel.clone(),
        });

        Ok(channel)
    }

    async fn reset(&self) {
        let mut guard = self.inner.lock().await;
        *guard = None;
    }
}

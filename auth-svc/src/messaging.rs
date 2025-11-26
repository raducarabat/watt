use std::time::Duration;

use anyhow::Result;
use lapin::{
    BasicProperties, Channel, Connection, ConnectionProperties,
    options::{BasicPublishOptions, ConfirmSelectOptions, QueueDeclareOptions},
    types::FieldTable,
};
use serde::Serialize;
use tokio::sync::Mutex;
use tracing::error;
use uuid::Uuid;

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
pub struct UserCreatedEvent {
    pub event_type: &'static str,
    pub user_id: Uuid,
    pub payload: UserPayload,
}

#[derive(Serialize)]
pub struct UserPayload {
    pub id: Uuid,
    pub username: String,
    pub default_unit: String,
    pub default_home_type: String,
    pub default_goal: i64,
}

impl EventPublisher {
    pub async fn new(url: String, queue: String) -> Result<Self> {
        let publisher = Self {
            url,
            queue,
            inner: Mutex::new(None),
        };
        publisher.ensure_channel().await?;
        Ok(publisher)
    }

    pub async fn publish_user_created(&self, event: &UserCreatedEvent) -> Result<()> {
        self.publish(event).await
    }

    async fn publish<T: Serialize>(&self, payload: &T) -> Result<()> {
        let body = serde_json::to_vec(payload)?;

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
                    &body,
                    BasicProperties::default().with_delivery_mode(2),
                )
                .await
            {
                Ok(confirm) => {
                    confirm.await?;
                    return Ok(());
                }
                Err(err) => {
                    error!(?err, "failed to publish user event");
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

    async fn ensure_channel(&self) -> Result<Channel> {
        if let Some(state) = self.inner.lock().await.as_ref() {
            return Ok(state.channel.clone());
        }

        self.reconnect().await
    }

    async fn reconnect(&self) -> Result<Channel> {
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

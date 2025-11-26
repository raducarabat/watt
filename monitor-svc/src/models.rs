use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct MeasurementMessage {
    pub timestamp: DateTime<Utc>,
    pub device_id: Uuid,
    pub measurement_value: f64,
}

#[derive(Debug, Deserialize)]
pub struct SyncEnvelope {
    pub event_type: String,
    pub device_id: Option<Uuid>,
    pub payload: Option<DevicePayload>,
}

#[derive(Debug, Deserialize)]
pub struct DevicePayload {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub name: String,
    pub max_consumption: Option<i32>,
    #[serde(default)]
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize, Clone)]
pub struct HourlyPoint {
    pub hour: i32,
    pub value: f64,
}

#[derive(Debug, Serialize)]
pub struct ConsumptionResponse {
    pub device_id: Uuid,
    pub day: NaiveDate,
    pub points: Vec<HourlyPoint>,
}

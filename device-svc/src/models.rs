use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Device {
    pub id: Uuid,
    pub name: String,
    pub max_consumption: i32,
    pub user_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRequest {
    pub user_id: Uuid,
    pub name: String,
    pub max_consumption: i32,
}

#[derive(Deserialize)]
pub struct UpdateRequest {
    pub id: Uuid,
    pub name: Option<String>,
    pub max_consumption: Option<f64>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum UserRole {
    CLIENT,
    ADMIN,
}

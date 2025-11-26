use chrono::{DateTime, NaiveDate, Timelike, Utc};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::models::{DevicePayload, HourlyPoint};

pub async fn upsert_device(pool: &PgPool, payload: &DevicePayload) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO devices (id, user_id, name, max_consumption, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            name = EXCLUDED.name,
            max_consumption = EXCLUDED.max_consumption,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        "#,
    )
    .bind(payload.id)
    .bind(payload.user_id)
    .bind(&payload.name)
    .bind(payload.max_consumption)
    .bind(&payload.metadata)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_device(pool: &PgPool, device_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM devices WHERE id = $1")
        .bind(device_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn ensure_device_placeholder(pool: &PgPool, device_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO devices (id, name, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .bind(device_id)
    .bind("Unknown device")
    .execute(pool)
    .await?;
    Ok(())
}

pub struct HourBucket {
    pub day: NaiveDate,
    pub hour: i32,
}

impl HourBucket {
    pub fn from_timestamp(ts: DateTime<Utc>) -> Self {
        let day = ts.date_naive();
        Self {
            day,
            hour: ts.hour() as i32,
        }
    }
}

pub async fn accumulate_measurement(
    pool: &PgPool,
    device_id: Uuid,
    bucket: &HourBucket,
    value: f64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO hourly_consumption (device_id, day, hour, value, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (device_id, day, hour)
        DO UPDATE SET value = hourly_consumption.value + EXCLUDED.value,
                      updated_at = NOW()
        "#,
    )
    .bind(device_id)
    .bind(bucket.day)
    .bind(bucket.hour)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn fetch_consumption(
    pool: &PgPool,
    device_id: Uuid,
    day: NaiveDate,
) -> Result<Vec<HourlyPoint>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT hour, value
        FROM hourly_consumption
        WHERE device_id = $1 AND day = $2
        ORDER BY hour ASC
        "#,
    )
    .bind(device_id)
    .bind(day)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| HourlyPoint {
            hour: row.get::<i16, _>("hour") as i32,
            value: row.get::<f64, _>("value"),
        })
        .collect())
}

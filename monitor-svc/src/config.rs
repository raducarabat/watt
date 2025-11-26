use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub sync_broker_url: String,
    pub data_broker_url: String,
    pub sync_queue: String,
    pub measurement_queue: String,
    pub http_host: String,
    pub http_port: u16,
    pub max_db_connections: u32,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set for monitor-svc"),
            sync_broker_url: env::var("SYNC_BROKER_URL")
                .expect("SYNC_BROKER_URL must be set for monitor-svc"),
            data_broker_url: env::var("DATA_BROKER_URL")
                .expect("DATA_BROKER_URL must be set for monitor-svc"),
            sync_queue: env::var("SYNC_QUEUE").unwrap_or_else(|_| "sync.events".into()),
            measurement_queue: env::var("MEASUREMENT_QUEUE")
                .unwrap_or_else(|_| "device.measurements".into()),
            http_host: env::var("SERVICE_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            http_port: env::var("SERVICE_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8080),
            max_db_connections: env::var("DATABASE_MAX_CONNECTIONS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10),
        }
    }

    pub fn http_addr(&self) -> String {
        format!("{}:{}", self.http_host, self.http_port)
    }
}

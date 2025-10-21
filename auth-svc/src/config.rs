pub struct JwtConfig {
    pub secret: String,
    pub issuer: String,
    pub audience: String,
    pub ttl_seconds: i64,
}

impl JwtConfig {
    pub fn from_env() -> Self {
        Self {
            secret: std::env::var("JWT_SECRET").expect("JWT_SECRET is required."),
            issuer: std::env::var("JWT_ISSUER").expect("JWT_ISSUER is required."),
            audience: std::env::var("JWT_AUDIENCE").expect("JWT_AUDIENCE is required."),
            ttl_seconds: std::env::var("ACCESS_TOKEN_TTL_SECONDS")
                .ok()
                .and_then(|v| v.trim().parse::<i64>().ok())
                .unwrap_or(3600),
        }
    }
}

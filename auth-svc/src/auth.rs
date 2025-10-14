use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::user::UserRole;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub role: UserRole,
    pub exp: usize,
    pub iat: usize,
    pub iss: String,
    pub aud: String,
}

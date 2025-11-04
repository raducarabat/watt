use std::fmt;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, PartialEq)]
pub enum UserRole {
    CLIENT,
    ADMIN,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "unit_energy", rename_all = "UPPERCASE")]
pub enum UnitEnergy {
    KWH,
    WH,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "home_type", rename_all = "UPPERCASE")]
pub enum HomeType {
    APARTMENT,
    HOUSE,
    OFFICE,
    INDUSTRIAL,
}

impl fmt::Display for HomeType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            HomeType::APARTMENT => write!(f, "APARTMENT"),
            HomeType::HOUSE => write!(f, "HOUSE"),
            HomeType::OFFICE => write!(f, "OFFICE"),
            HomeType::INDUSTRIAL => write!(f, "INDUSTRIAL"),
        }
    }
}

impl fmt::Display for UnitEnergy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UnitEnergy::KWH => write!(f, "KWH"),
            UnitEnergy::WH => write!(f, "WH"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub unit_energy: UnitEnergy,
    pub home_type: HomeType,
    pub goal_kwh_month: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRequest {
    pub unit_energy: UnitEnergy,
    pub home_type: HomeType,
    pub goal_kwh_month: i64,
}

#[derive(Deserialize, Debug)]
pub struct UpdateRequest {
    pub user_id: Option<uuid::Uuid>,
    pub unit_energy: Option<UnitEnergy>,
    pub home_type: Option<HomeType>,
    pub goal_kwh_month: Option<i64>,
}

-- Add migration script here
CREATE TYPE unit_energy AS ENUM ('KWH', 'WH');
CREATE TYPE home_type AS ENUM ('APARTMENT', 'HOUSE', 'OFFICE', 'INDUSTRIAL');

CREATE TABLE users (
    id UUID PRIMARY KEY,
    unit_energy unit_energy NOT NULL DEFAULT 'KWH',
    home_type home_type NOT NULL DEFAULT 'HOUSE',
    goal_kwh_month BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

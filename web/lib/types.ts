export type UUID = string;

export type UnitEnergy = "KWH" | "WH";
export type HomeType = "APARTMENT" | "HOUSE" | "OFFICE" | "INDUSTRIAL";
export type UserRole = "ADMIN" | "CLIENT";

export interface User {
  id: UUID;
  unit_energy: UnitEnergy;
  home_type: HomeType;
  goal_kwh_month: number;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: UUID;
  name: string;
  max_consumption: number;
  user_id: UUID;
  created_at: string;
}

export interface HourlyPoint {
  hour: number;
  value: number;
}

export interface ConsumptionResponse {
  device_id: UUID;
  day: string;
  points: HourlyPoint[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserCreateRequest {
  unit_energy: UnitEnergy;
  home_type: HomeType;
  goal_kwh_month: number;
}

export interface UserUpdateRequest {
  user_id?: UUID;
  unit_energy?: UnitEnergy;
  home_type?: HomeType;
  goal_kwh_month?: number;
}

export interface DeviceCreateRequest {
  user_id: UUID;
  name: string;
  max_consumption: number;
}

export interface DeviceUpdateRequest {
  id: UUID;
  name?: string;
  max_consumption?: number;
}

export interface ApiErrorShape {
  status: number;
  message: string;
  details?: unknown;
}

export interface AuthClaims {
  sub: UUID;
  role?: UserRole | string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

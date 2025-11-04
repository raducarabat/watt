import { decode } from "jsonwebtoken";

import {
  clearClientAuthToken,
  clearServerAuthToken,
  getClientAuthToken,
  getServerAuthToken,
  setClientAuthToken,
  setServerAuthToken,
} from "@/lib/cookies";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import type { AuthClaims } from "@/lib/types";

export function decodeAuthToken(token?: string | null): AuthClaims | null {
  if (!token) return null;
  const result = decode(token);
  if (!result || typeof result === "string") {
    return null;
  }
  return result as AuthClaims;
}

export function isTokenExpired(claims: AuthClaims | null): boolean {
  if (!claims?.exp) return false;
  const expiresAtMs = claims.exp * 1000;
  return Number.isFinite(expiresAtMs) && Date.now() >= expiresAtMs;
}

export function hasAdminClaim(claims: AuthClaims | null): boolean {
  if (!claims?.role) return false;
  return String(claims.role).toUpperCase() === "ADMIN";
}

export async function getServerTokenOrThrow(): Promise<string> {
  const token = await getServerAuthToken();
  if (!token) {
    throw new Error("Authentication token is missing");
  }
  return token;
}

export async function persistToken(token: string): Promise<void> {
  await setServerAuthToken(token);
  if (typeof window !== "undefined") {
    setClientAuthToken(token);
  }
}

export async function clearToken(): Promise<void> {
  await clearServerAuthToken();
  if (typeof window !== "undefined") {
    clearClientAuthToken();
  }
}

export function clientLogout(redirectTo = "/login") {
  clearClientAuthToken();
  if (typeof window !== "undefined") {
    window.location.assign(redirectTo);
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return await getServerAuthToken();
  }
  return getClientAuthToken();
}

export { AUTH_COOKIE_NAME };

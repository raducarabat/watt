import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/constants";

const ONE_DAY_SECONDS = 60 * 60 * 24;

type CookieOptions = {
  maxAge?: number;
};

export async function getServerAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function setServerAuthToken(
  token: string,
  options: CookieOptions = {},
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: options.maxAge ?? ONE_DAY_SECONDS * 7,
  });
}

export async function clearServerAuthToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export function getClientAuthToken(): string | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${AUTH_COOKIE_NAME}=`));
  return value ? decodeURIComponent(value.split("=")[1]) : null;
}

export function setClientAuthToken(
  token: string,
  options: CookieOptions = {},
): void {
  if (typeof document === "undefined") return;
  const maxAge = options.maxAge ?? ONE_DAY_SECONDS * 7;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearClientAuthToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

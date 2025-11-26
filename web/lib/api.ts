import { AUTH_COOKIE_NAME } from "@/lib/constants";
import type {
  AuthResponse,
  ConsumptionResponse,
  Device,
  DeviceCreateRequest,
  DeviceUpdateRequest,
  LoginRequest,
  UUID,
  RegisterRequest,
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from "@/lib/types";

const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost";
const SERVER_BASE_URL = "http://traefik";

export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: HeadersInit;
  next?: RequestInit["next"];
  cache?: RequestInit["cache"];
};

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    return (text ? ({ message: text } as unknown as T) : ({} as T));
  }
  return (await res.json()) as T;
}

export async function fetchJSON<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = "GET", body, token, headers, next, cache } = options;

  const requestHeaders = new Headers({ "Content-Type": "application/json" });
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }
  if (headers) {
    const extraHeaders = new Headers(headers);
    extraHeaders.forEach((value, key) => requestHeaders.set(key, value));
  }

  const base = typeof window === "undefined" ? SERVER_BASE_URL : PUBLIC_BASE_URL;
  const devOverride = process.env.NODE_ENV !== "production" ? process.env.API_BASE_URL_DEV : undefined;
  const resolvedBase = devOverride ?? base;
  const url = new URL(path, resolvedBase).toString();

  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: cache ?? "no-store",
    next,
  });

  if (!res.ok) {
    const parsed = await parseResponse<Partial<{ message: string }>>(res).catch(
      () => undefined,
    );
    const message =
      parsed?.message ?? res.statusText ?? "Request failed with an error";
    throw new ApiError(message, res.status, parsed);
  }

  return parseResponse<T>(res);
}

export const authApi = {
  login: (payload: LoginRequest) =>
    fetchJSON<AuthResponse>("/auth/login", {
      method: "POST",
      body: payload,
    }),
  register: (payload: RegisterRequest) =>
    fetchJSON<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload,
    }),
};

export const userApi = {
  me: (token: string) =>
    fetchJSON<User>("/user/me", {
      token,
    }),
  create: (token: string, payload: UserCreateRequest) =>
    fetchJSON<User>("/user/create", {
      method: "POST",
      body: payload,
      token,
    }),
  update: (token: string, payload: UserUpdateRequest) =>
    fetchJSON<User>("/user/update", {
      method: "PUT",
      body: payload,
      token,
    }),
  getAll: (token: string) =>
    fetchJSON<User[]>("/user/get_all", {
      token,
    }),
};

export const deviceApi = {
  create: (token: string, payload: DeviceCreateRequest) =>
    fetchJSON<Device>("/device/create", {
      method: "POST",
      body: payload,
      token,
    }),
  readAll: (token: string) =>
    fetchJSON<Device[]>("/device/read/all", {
      token,
    }),
  readById: (token: string, id: string) =>
    fetchJSON<Device>(`/device/read/${id}`, {
      token,
    }),
  update: (token: string, payload: DeviceUpdateRequest) =>
    fetchJSON<Device>("/device/update", {
      method: "PUT",
      body: payload,
      token,
    }),
  delete: (token: string, id: string) =>
    fetchJSON<void>(`/device/delete/${id}`, {
      method: "DELETE",
      token,
    }),
  deleteAll: (token: string) =>
    fetchJSON<void>("/device/delete/all", {
      method: "DELETE",
      token,
    }),
};

export const monitorApi = {
  getConsumption: (token: string, params: { deviceId: UUID; day: string }) =>
    fetchJSON<ConsumptionResponse>(
      `/monitor/consumption?device_id=${params.deviceId}&day=${params.day}`,
      { token },
    ),
};

export function buildAuthHeaderFromCookie(cookieHeader?: string) {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const authCookie = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!authCookie) return undefined;
  const token = authCookie.split("=")[1];
  return `Bearer ${token}`;
}

"use server";

import { revalidatePath } from "next/cache";

import { ApiError, deviceApi, userApi } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { ADMIN_ROUTE, DASHBOARD_ROUTE, LOGIN_ROUTE } from "@/lib/constants";
import { requireAuthToken } from "@/lib/server";
import type { DeviceCreateRequest, DeviceUpdateRequest, UserUpdateRequest } from "@/lib/types";
import type { ActionResult } from "../dashboard/actions";

function actionError(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      void clearToken();
      return {
        success: false,
        error: "Session expired. Redirecting to login.",
        redirect: LOGIN_ROUTE,
      };
    }
    return { success: false, error: error.message };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Unexpected error" };
}

function revalidateAdminAndDashboard() {
  revalidatePath(ADMIN_ROUTE);
  revalidatePath(DASHBOARD_ROUTE);
}

export async function adminUpdateUserAction(payload: UserUpdateRequest): Promise<ActionResult> {
  const token = await requireAuthToken();
  try {
    await userApi.update(token, payload);
    revalidateAdminAndDashboard();
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function adminCreateDeviceAction(payload: DeviceCreateRequest): Promise<ActionResult> {
  const token = await requireAuthToken();
  try {
    await deviceApi.create(token, payload);
    revalidateAdminAndDashboard();
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function adminUpdateDeviceAction(payload: DeviceUpdateRequest): Promise<ActionResult> {
  const token = await requireAuthToken();
  try {
    await deviceApi.update(token, payload);
    revalidateAdminAndDashboard();
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function adminDeleteDeviceAction(id: string): Promise<ActionResult> {
  const token = await requireAuthToken();
  try {
    await deviceApi.delete(token, id);
    revalidateAdminAndDashboard();
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function adminDeleteAllDevicesAction(): Promise<ActionResult> {
  const token = await requireAuthToken();
  try {
    await deviceApi.deleteAll(token);
    revalidateAdminAndDashboard();
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

"use server";

import { revalidatePath } from "next/cache";

import { ApiError, deviceApi, userApi } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { DASHBOARD_ROUTE, LOGIN_ROUTE } from "@/lib/constants";
import { requireAuthToken } from "@/lib/server";
import type { DeviceUpdateRequest, UserUpdateRequest } from "@/lib/types";

export interface ActionResult {
  success: boolean;
  error?: string;
  redirect?: string;
}

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

export async function updateProfileAction(payload: UserUpdateRequest): Promise<ActionResult> {
  const token = await requireAuthToken();
  try {
    await userApi.update(token, payload);
    revalidatePath(DASHBOARD_ROUTE);
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateDeviceAction(payload: DeviceUpdateRequest): Promise<ActionResult> {
  const token = await requireAuthToken();
  try {
    await deviceApi.update(token, payload);
    revalidatePath(DASHBOARD_ROUTE);
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteDeviceAction(id: string): Promise<ActionResult> {
  const token = await requireAuthToken();
  try {
    await deviceApi.delete(token, id);
    revalidatePath(DASHBOARD_ROUTE);
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

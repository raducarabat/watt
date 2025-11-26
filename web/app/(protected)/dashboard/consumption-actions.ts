"use server";

import { ApiError, monitorApi } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { LOGIN_ROUTE } from "@/lib/constants";
import { requireAuthToken } from "@/lib/server";
import type { ConsumptionResponse } from "@/lib/types";

export interface ConsumptionActionResult {
  success: boolean;
  data?: ConsumptionResponse;
  error?: string;
  redirect?: string;
}

export async function fetchConsumptionAction(
  deviceId: string,
  day: string,
): Promise<ConsumptionActionResult> {
  const token = await requireAuthToken();

  try {
    const data = await monitorApi.getConsumption(token, { deviceId, day });
    return { success: true, data };
  } catch (error) {
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
}

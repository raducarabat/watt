"use server";

import { authApi } from "@/lib/api";
import { persistToken } from "@/lib/auth";
import type { LoginRequest, RegisterRequest } from "@/lib/types";

interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function loginAction(payload: LoginRequest): Promise<AuthActionResult> {
  try {
    const result = await authApi.login(payload);
    await persistToken(result.access_token);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to login. Please try again." };
  }
}

export async function registerAction(payload: RegisterRequest): Promise<AuthActionResult> {
  try {
    const result = await authApi.register(payload);
    await persistToken(result.access_token);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to register. Please try again." };
  }
}

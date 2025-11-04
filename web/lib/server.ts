import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api";
import { clearToken } from "@/lib/auth";
import { getServerAuthToken } from "@/lib/cookies";
import { LOGIN_ROUTE } from "@/lib/constants";

export async function requireAuthToken(): Promise<string> {
  const token = await getServerAuthToken();
  if (!token) {
    redirect(LOGIN_ROUTE);
  }
  return token;
}

export async function withAuthHandling<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await clearToken();
      redirect(`${LOGIN_ROUTE}?reason=expired`);
    }
    throw err;
  }
}

"use server";

import { redirect } from "next/navigation";

import { clearToken } from "@/lib/auth";
import { LOGIN_ROUTE } from "@/lib/constants";

export async function logoutAction() {
  await clearToken();
  redirect(LOGIN_ROUTE);
}

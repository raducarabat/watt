import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { Badge } from "@/components/Badge";
import { deviceApi, userApi } from "@/lib/api";
import { decodeAuthToken, hasAdminClaim } from "@/lib/auth";
import { DASHBOARD_ROUTE } from "@/lib/constants";
import { requireAuthToken, withAuthHandling } from "@/lib/server";
import { logoutAction } from "../actions";
import {
  adminCreateDeviceAction,
  adminDeleteAllDevicesAction,
  adminDeleteDeviceAction,
  adminUpdateDeviceAction,
  adminUpdateUserAction,
} from "./actions";

export default async function AdminPage() {
  const token = await requireAuthToken();
  const claims = decodeAuthToken(token);

  if (!hasAdminClaim(claims)) {
    redirect(DASHBOARD_ROUTE);
  }

  const [users, devices] = await withAuthHandling(() =>
    Promise.all([userApi.getAll(token), deviceApi.readAll(token)]),
  );

  const userLabel = claims?.sub ? claims.sub.slice(0, 8) : "Admin";

  return (
    <AppShell userName={userLabel} isAdmin onLogout={logoutAction}>
      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Administrator console</h1>
            <p className="text-sm text-neutral-400">
              Manage user profiles and devices across the platform.
            </p>
          </div>
          <Badge variant="muted">{users.length} users · {devices.length} devices</Badge>
        </div>

        <AdminConsole
          users={users}
          devices={devices}
          actions={{
            updateUser: adminUpdateUserAction,
            createDevice: adminCreateDeviceAction,
            updateDevice: adminUpdateDeviceAction,
            deleteDevice: adminDeleteDeviceAction,
            deleteAllDevices: adminDeleteAllDevicesAction,
          }}
        />
      </section>
    </AppShell>
  );
}

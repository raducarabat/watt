import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { ConsumptionChart } from "@/components/dashboard/ConsumptionChart";
import { DevicesTable } from "@/components/dashboard/DevicesTable";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { deviceApi, monitorApi, userApi } from "@/lib/api";
import { decodeAuthToken, hasAdminClaim } from "@/lib/auth";
import { formatEnumLabel } from "@/lib/utils";
import { logoutAction } from "../actions";
import {
  deleteDeviceAction,
  updateDeviceAction,
  updateProfileAction,
} from "./actions";
import { requireAuthToken, withAuthHandling } from "@/lib/server";

export default async function DashboardPage() {
  const token = await requireAuthToken();
  const claims = decodeAuthToken(token);
  const isAdmin = hasAdminClaim(claims);
  const today = new Date().toISOString().split("T")[0];

  const [user, devices] = await withAuthHandling(() =>
    Promise.all([userApi.me(token), deviceApi.readAll(token)]),
  );

  const userLabel = claims?.sub ? claims.sub.slice(0, 8) : "User";
  const visibleDevices = isAdmin
    ? devices.filter((device) => device.user_id === user.id)
    : devices;

  const initialDeviceId = visibleDevices[0]?.id ?? null;
  let initialConsumption = null;
  if (initialDeviceId) {
    try {
      initialConsumption = await withAuthHandling(() =>
        monitorApi.getConsumption(token, {
          deviceId: initialDeviceId,
          day: today,
        }),
      );
    } catch {
      initialConsumption = null;
    }
  }

  return (
    <AppShell userName={userLabel} isAdmin={isAdmin} onLogout={logoutAction}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <ProfileCard user={user} onSubmit={updateProfileAction} />

        <section className="space-y-4">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Your devices</h2>
              <p className="text-sm text-neutral-400">
                Manage the appliances contributing to your usage profile.
              </p>
            </div>
            <Badge variant="muted">{visibleDevices.length} linked</Badge>
          </header>

          <DevicesTable
            devices={visibleDevices}
            onUpdate={updateDeviceAction}
            onDelete={deleteDeviceAction}
            canDelete={false}
          />
        </section>
      </div>

      <ConsumptionChart
        devices={visibleDevices}
        initialDeviceId={initialDeviceId}
        initialDay={today}
        initialData={initialConsumption}
        unitLabel={formatEnumLabel(user.unit_energy)}
      />

      <section className="mt-8 grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-card">
        <h2 className="text-lg font-semibold text-white">Account details</h2>
        <dl className="grid gap-3 text-sm text-neutral-400 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-white">User ID</dt>
            <dd className="truncate font-mono text-xs text-neutral-300">{user.id}</dd>
          </div>
          <div>
            <dt className="font-medium text-white">Role</dt>
            <dd>{formatEnumLabel((claims?.role as string | undefined) ?? "client")}</dd>
          </div>
          <div>
            <dt className="font-medium text-white">Unit preference</dt>
            <dd>{formatEnumLabel(user.unit_energy)}</dd>
          </div>
          <div>
            <dt className="font-medium text-white">Home type</dt>
            <dd>{formatEnumLabel(user.home_type)}</dd>
          </div>
        </dl>
      </section>
    </AppShell>
  );
}

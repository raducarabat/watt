"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Tabs";
import { AdminDevicesTable } from "@/components/admin/DevicesTable";
import { UsersTable } from "@/components/admin/UsersTable";
import type {
  adminCreateDeviceAction,
  adminDeleteAllDevicesAction,
  adminDeleteDeviceAction,
  adminUpdateDeviceAction,
  adminUpdateUserAction,
} from "@/app/(protected)/admin/actions";
import type { Device, User } from "@/lib/types";

interface AdminConsoleProps {
  devices: Device[];
  users: User[];
  actions: {
    updateUser: typeof adminUpdateUserAction;
    createDevice: typeof adminCreateDeviceAction;
    updateDevice: typeof adminUpdateDeviceAction;
    deleteDevice: typeof adminDeleteDeviceAction;
    deleteAllDevices: typeof adminDeleteAllDevicesAction;
  };
}

export function AdminConsole({ devices, users, actions }: AdminConsoleProps) {
  const [tab, setTab] = useState<"users" | "devices">("users");

  const handleChange = (value: string) => {
    setTab(value === "devices" ? "devices" : "users");
  };

  return (
    <Tabs value={tab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="users" activeValue={tab} onValueChange={handleChange}>
          Users
        </TabsTrigger>
        <TabsTrigger value="devices" activeValue={tab} onValueChange={handleChange}>
          Devices
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users" activeValue={tab}>
        <UsersTable users={users} onUpdate={actions.updateUser} />
      </TabsContent>

      <TabsContent value="devices" activeValue={tab}>
        <AdminDevicesTable
          users={users}
          devices={devices}
          onCreate={actions.createDevice}
          onUpdate={actions.updateDevice}
          onDelete={actions.deleteDevice}
          onDeleteAll={actions.deleteAllDevices}
        />
      </TabsContent>
    </Tabs>
  );
}

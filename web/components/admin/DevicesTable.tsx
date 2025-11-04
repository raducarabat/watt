"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Select } from "@/components/Select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/Table";
import { useToast } from "@/components/ToastProvider";
import { formatDateTime } from "@/lib/utils";
import type {
  adminCreateDeviceAction,
  adminDeleteAllDevicesAction,
  adminDeleteDeviceAction,
  adminUpdateDeviceAction,
} from "@/app/(protected)/admin/actions";
import type { ActionResult } from "@/app/(protected)/dashboard/actions";
import type { Device, User } from "@/lib/types";

const createSchema = z.object({
  user_id: z.string().uuid({ message: "Select a user" }),
  name: z.string().min(1, "Device name is required"),
  max_consumption: z.number().min(0, "Must be zero or greater"),
});

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
});

type CreateValues = z.infer<typeof createSchema>;
type UpdateValues = z.infer<typeof updateSchema>;

interface AdminDevicesTableProps {
  devices: Device[];
  users: User[];
  onCreate: typeof adminCreateDeviceAction;
  onUpdate: typeof adminUpdateDeviceAction;
  onDelete: typeof adminDeleteDeviceAction;
  onDeleteAll: typeof adminDeleteAllDevicesAction;
}

export function AdminDevicesTable({
  devices,
  users,
  onCreate,
  onUpdate,
  onDelete,
  onDeleteAll,
}: AdminDevicesTableProps) {
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Device | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: `${user.id.slice(0, 8)}… (${user.home_type})`,
      })),
    [users],
  );

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      user_id: userOptions[0]?.value ?? "",
      name: "",
      max_consumption: 0,
    },
  });

  const editForm = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      id: "",
      user_id: "",
      name: "",
      max_consumption: 0,
    },
  });

  useEffect(() => {
    if (editing) {
      editForm.reset({
        id: editing.id,
        user_id: editing.user_id,
        name: editing.name,
        max_consumption: editing.max_consumption,
      });
    }
  }, [editing, editForm]);

  useEffect(() => {
    if (userOptions.length > 0 && !createForm.getValues("user_id")) {
      createForm.setValue("user_id", userOptions[0].value);
    }
  }, [userOptions, createForm]);

  if (devices.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No device records"
          description="Use the button below to attach a device to a user account."
        />
        <Button onClick={() => setIsCreateOpen(true)} disabled={userOptions.length === 0}>
          Add device
        </Button>
      </div>
    );
  }

  const handleResult = (result: ActionResult | undefined, successMsg: string) => {
    if (!result?.success) {
      const message = result?.error ?? "Operation failed";
      push({ intent: "error", title: "Action failed", description: message });
      if (result?.redirect) {
        window.location.assign(result.redirect);
      }
      return false;
    }
    push({ intent: "success", title: successMsg, description: "Data refreshed." });
    return true;
  };

  const submitCreate = (values: CreateValues) => {
    startTransition(async () => {
      const result = await onCreate(values);
      if (handleResult(result, "Device created")) {
        setIsCreateOpen(false);
        createForm.reset({ user_id: userOptions[0]?.value ?? "", name: "", max_consumption: 0 });
      }
    });
  };

  const submitEdit = (values: UpdateValues) => {
    startTransition(async () => {
      setError(null);
      const result = await onUpdate(values);
      if (!handleResult(result, "Device updated")) {
        if (result?.error) {
          setError(result.error);
        }
        return;
      }
      setEditing(null);
    });
  };

  const deleteDevice = (device: Device) =>
    startTransition(async () => {
      const result = await onDelete(device.id);
      handleResult(result, "Device deleted");
    });

  const deleteAllDevices = () =>
    startTransition(async () => {
      const result = await onDeleteAll();
      handleResult(result, "Devices cleared");
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)} disabled={userOptions.length === 0}>
            Add device
          </Button>
          <ConfirmDialog
            title="Delete all devices"
            description="This removes every device record. Proceed with caution."
            onConfirm={deleteAllDevices}
            trigger={(open) => (
              <Button variant="destructive" onClick={open} disabled={devices.length === 0}>
                Delete all
              </Button>
            )}
          />
        </div>
        <p className="text-xs text-neutral-400">
          Device create/update is available to admins only.
        </p>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Max (W)</TableHeaderCell>
            <TableHeaderCell>Owner</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell className="font-medium">{device.name}</TableCell>
              <TableCell>{device.max_consumption}</TableCell>
              <TableCell className="font-mono text-xs">{device.user_id}</TableCell>
              <TableCell>{formatDateTime(device.created_at)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(device)}>
                    Edit
                  </Button>
                  <ConfirmDialog
                    title="Delete device"
                    description={`Delete ${device.name}? This cannot be undone.`}
                    onConfirm={() => deleteDevice(device)}
                    trigger={(open) => (
                      <Button variant="destructive" size="sm" onClick={open}>
                        Delete
                      </Button>
                    )}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={isCreateOpen}
        onClose={() => {
          if (isPending) return;
          setIsCreateOpen(false);
          createForm.reset({ user_id: userOptions[0]?.value ?? "", name: "", max_consumption: 0 });
        }}
        title="Add device"
        description="Attach a new device to a user."
      >
        <form className="space-y-4" onSubmit={createForm.handleSubmit(submitCreate)}>
          <FormField
            htmlFor="create-user"
            label="User"
            error={createForm.formState.errors.user_id?.message}
          >
            <Select
              id="create-user"
              disabled={isPending || userOptions.length === 0}
              {...createForm.register("user_id")}
            >
              <option value="" disabled>
                Select a user
              </option>
              {userOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            htmlFor="create-name"
            label="Device name"
            error={createForm.formState.errors.name?.message}
          >
            <Input id="create-name" disabled={isPending} {...createForm.register("name")} />
          </FormField>

          <FormField
            htmlFor="create-max"
            label="Max consumption (W)"
            error={createForm.formState.errors.max_consumption?.message}
          >
            <Input
              id="create-max"
              type="number"
              min={0}
              step="any"
              disabled={isPending}
              {...createForm.register("max_consumption", { valueAsNumber: true })}
            />
          </FormField>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending} disabled={isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => {
          if (isPending) return;
          setEditing(null);
          setError(null);
        }}
        title="Edit device"
        description="Modify existing device metadata."
      >
        <form className="space-y-4" onSubmit={editForm.handleSubmit(submitEdit)}>
          <input type="hidden" {...editForm.register("id")} />
          <input type="hidden" {...editForm.register("user_id")} />

          <FormField
            htmlFor="edit-name"
            label="Device name"
            error={editForm.formState.errors.name?.message}
          >
            <Input id="edit-name" disabled={isPending} {...editForm.register("name")} />
          </FormField>

          <FormField
            htmlFor="edit-max"
            label="Max consumption (W)"
            error={editForm.formState.errors.max_consumption?.message}
          >
            <Input
              id="edit-max"
              type="number"
              min={0}
              step="any"
              disabled={isPending}
              {...editForm.register("max_consumption", { valueAsNumber: true })}
            />
          </FormField>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending} disabled={isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

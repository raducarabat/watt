"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/Table";
import { useToast } from "@/components/ToastProvider";
import { formatDateTime } from "@/lib/utils";
import type {
  deleteDeviceAction,
  updateDeviceAction,
} from "@/app/(protected)/dashboard/actions";
import type { Device } from "@/lib/types";

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  max_consumption: z.number().min(0, "Must be zero or greater"),
});

type FormValues = z.infer<typeof schema>;

interface DevicesTableProps {
  devices: Device[];
  onUpdate: typeof updateDeviceAction;
  onDelete: typeof deleteDeviceAction;
  canDelete?: boolean;
}

export function DevicesTable({ devices, onUpdate, onDelete, canDelete }: DevicesTableProps) {
  const { push } = useToast();
  const [editing, setEditing] = useState<Device | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: "",
      name: "",
      max_consumption: 0,
    },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        id: editing.id,
        name: editing.name,
        max_consumption: editing.max_consumption,
      });
    }
  }, [editing, form]);

  if (devices.length === 0) {
    return (
      <EmptyState
        title="No devices yet"
        description="Devices linked to your account will appear here."
      />
    );
  }

  const closeModal = () => {
    if (isPending) return;
    setEditing(null);
    setError(null);
  };

  const handleSubmit = (values: FormValues) => {
    startTransition(async () => {
      setError(null);
      const result = await onUpdate({
        id: values.id,
        name: values.name,
        max_consumption: values.max_consumption,
      });

      if (!result?.success) {
        const message = result?.error ?? "Update failed";
        setError(message);
        push({
          intent: "error",
          title: "Could not update device",
          description: message,
        });
        if (result?.redirect) {
          window.location.assign(result.redirect);
        }
        return;
      }

      push({
        intent: "success",
        title: "Device updated",
        description: "Changes saved successfully.",
      });
      setEditing(null);
    });
  };

  const handleDelete = (device: Device) =>
    startTransition(async () => {
      const result = await onDelete(device.id);
      if (!result?.success) {
        const message = result?.error ?? "Delete failed";
        push({
          intent: "error",
          title: "Could not delete",
          description: message,
        });
        if (result?.redirect) {
          window.location.assign(result.redirect);
        }
        return;
      }

      push({
        intent: "success",
        title: "Device removed",
        description: `${device.name} has been deleted.`,
      });
    });

  return (
    <div className="space-y-4">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Max Consumption</TableHeaderCell>
            <TableHeaderCell>Recorded</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell className="font-medium">{device.name}</TableCell>
              <TableCell>{device.max_consumption} W</TableCell>
              <TableCell>{formatDateTime(device.created_at)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(device)}
                  >
                    Edit
                  </Button>
                  {canDelete && (
                    <ConfirmDialog
                      title="Delete device"
                      description={`Are you sure you want to delete ${device.name}?`}
                      onConfirm={() => handleDelete(device)}
                      trigger={(open) => (
                        <Button variant="destructive" size="sm" onClick={open}>
                          Delete
                        </Button>
                      )}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={Boolean(editing)}
        onClose={closeModal}
        title="Edit device"
        description="Update details and we will refresh your dashboard."
      >
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <input type="hidden" {...form.register("id")} />
          <FormField
            htmlFor="device-name"
            label="Device name"
            error={form.formState.errors.name?.message}
          >
            <Input
              id="device-name"
              disabled={isPending}
              {...form.register("name")}
            />
          </FormField>
          <FormField
            htmlFor="device-max"
            label="Max consumption (W)"
            error={form.formState.errors.max_consumption?.message}
          >
            <Input
              id="device-max"
              type="number"
              min={0}
              step="any"
              disabled={isPending}
              {...form.register("max_consumption", { valueAsNumber: true })}
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
              onClick={closeModal}
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

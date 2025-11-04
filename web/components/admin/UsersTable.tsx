"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Select } from "@/components/Select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/Table";
import { useToast } from "@/components/ToastProvider";
import { formatDateTime, formatEnumLabel } from "@/lib/utils";
import type { adminUpdateUserAction } from "@/app/(protected)/admin/actions";
import type { HomeType, UnitEnergy, User } from "@/lib/types";

const schema = z.object({
  user_id: z.string().uuid(),
  unit_energy: z.enum(["KWH", "WH"]),
  home_type: z.enum(["APARTMENT", "HOUSE", "OFFICE", "INDUSTRIAL"]),
  goal_kwh_month: z.number().min(0, "Goal must be zero or greater"),
});

type FormValues = z.infer<typeof schema>;

interface UsersTableProps {
  users: User[];
  onUpdate: typeof adminUpdateUserAction;
}

const HOME_LABELS: Record<HomeType, string> = {
  APARTMENT: "Apartment",
  HOUSE: "House",
  OFFICE: "Office",
  INDUSTRIAL: "Industrial",
};

const ENERGY_LABELS: Record<UnitEnergy, string> = {
  KWH: "Kilowatt-hours",
  WH: "Watt-hours",
};

export function UsersTable({ users, onUpdate }: UsersTableProps) {
  const { push } = useToast();
  const [editing, setEditing] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_id: "",
      unit_energy: "KWH",
      home_type: "HOUSE",
      goal_kwh_month: 0,
    },
  });

  useEffect(() => {
    if (editing) {
      form.reset({
        user_id: editing.id,
        unit_energy: editing.unit_energy,
        home_type: editing.home_type,
        goal_kwh_month: editing.goal_kwh_month,
      });
    }
  }, [editing, form]);

  if (users.length === 0) {
    return (
      <EmptyState
        title="No user records"
        description="User profiles are created when accounts register."
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
      const result = await onUpdate(values);

      if (!result?.success) {
        const message = result?.error ?? "Update failed";
        setError(message);
        push({
          intent: "error",
          title: "Could not update user",
          description: message,
        });
        if (result?.redirect) {
          window.location.assign(result.redirect);
        }
        return;
      }

      push({
        intent: "success",
        title: "User updated",
        description: "User profile changes saved.",
      });
      setEditing(null);
    });
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>User ID</TableHeaderCell>
            <TableHeaderCell>Unit</TableHeaderCell>
            <TableHeaderCell>Home</TableHeaderCell>
            <TableHeaderCell>Goal (kWh)</TableHeaderCell>
            <TableHeaderCell>Updated</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-mono text-xs">{user.id}</TableCell>
              <TableCell>{formatEnumLabel(user.unit_energy)}</TableCell>
              <TableCell>{formatEnumLabel(user.home_type)}</TableCell>
              <TableCell>{user.goal_kwh_month}</TableCell>
              <TableCell>{formatDateTime(user.updated_at)}</TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditing(user)}>
                    Edit
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs text-neutral-400">
        Note: profiles are provisioned automatically when new accounts register through the
        authentication service.
      </p>

      <Modal
        open={Boolean(editing)}
        onClose={closeModal}
        title="Edit user profile"
        description="Adjust consumption targets or metadata for this account."
      >
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <input type="hidden" {...form.register("user_id")} />

          <FormField
            htmlFor="admin-unit"
            label="Energy unit"
            error={form.formState.errors.unit_energy?.message}
          >
            <Select
              id="admin-unit"
              disabled={isPending}
              {...form.register("unit_energy")}
            >
              {Object.entries(ENERGY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            htmlFor="admin-home"
            label="Home type"
            error={form.formState.errors.home_type?.message}
          >
            <Select
              id="admin-home"
              disabled={isPending}
              {...form.register("home_type")}
            >
              {Object.entries(HOME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            htmlFor="admin-goal"
            label="Monthly goal (kWh)"
            error={form.formState.errors.goal_kwh_month?.message}
          >
            <Input
              id="admin-goal"
              type="number"
              min={0}
              step="any"
              disabled={isPending}
              {...form.register("goal_kwh_month", { valueAsNumber: true })}
            />
          </FormField>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending} disabled={isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

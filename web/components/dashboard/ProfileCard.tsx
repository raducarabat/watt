"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { useToast } from "@/components/ToastProvider";
import { formatDateTime } from "@/lib/utils";
import type { updateProfileAction } from "@/app/(protected)/dashboard/actions";
import type { HomeType, UnitEnergy, User } from "@/lib/types";

const schema = z.object({
  goal_kwh_month: z.number().min(0, "Goal must be zero or greater"),
  home_type: z.enum(["APARTMENT", "HOUSE", "OFFICE", "INDUSTRIAL"]),
  unit_energy: z.enum(["KWH", "WH"]),
});

type FormValues = z.infer<typeof schema>;

interface ProfileCardProps {
  user: User;
  onSubmit: typeof updateProfileAction;
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

export function ProfileCard({ user, onSubmit }: ProfileCardProps) {
  const { push } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      goal_kwh_month: user.goal_kwh_month,
      home_type: user.home_type,
      unit_energy: user.unit_energy,
    },
  });

  const handleSubmit = (values: FormValues) => {
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({
        home_type: values.home_type,
        unit_energy: values.unit_energy,
        goal_kwh_month: values.goal_kwh_month,
      });

      if (!result?.success) {
        const message = result?.error ?? "Failed to update profile";
        setError(message);
        push({
          intent: "error",
          title: "Profile update failed",
          description: message,
        });
        if (result?.redirect) {
          window.location.assign(result.redirect);
        }
        return;
      }

      push({
        intent: "success",
        title: "Profile updated",
        description: "Your preferences were saved successfully.",
      });
    });
  };

  return (
    <Card className="space-y-6">
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
        <CardDescription>Customize how we calculate your energy goals.</CardDescription>
      </CardHeader>

      <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          htmlFor="unit_energy"
          label="Energy unit"
          error={form.formState.errors.unit_energy?.message}
        >
          <Select
            id="unit_energy"
            disabled={isPending}
            defaultValue={user.unit_energy}
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
          htmlFor="home_type"
          label="Home type"
          error={form.formState.errors.home_type?.message}
        >
          <Select
            id="home_type"
            disabled={isPending}
            defaultValue={user.home_type}
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
          htmlFor="goal_kwh_month"
          label="Monthly goal"
          description="Target energy usage (kWh)."
          error={form.formState.errors.goal_kwh_month?.message}
        >
          <Input
            id="goal_kwh_month"
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

        <Button isLoading={isPending} disabled={isPending}>
          Save changes
        </Button>
      </form>

      <div className="grid gap-3 rounded-xl bg-neutral-900/70 p-4 text-sm text-neutral-400">
        <p>
          <span className="font-medium text-white">Member since:</span>{" "}
          {formatDateTime(user.created_at)}
        </p>
        <p>
          <span className="font-medium text-white">Last updated:</span>{" "}
          {formatDateTime(user.updated_at)}
        </p>
      </div>
    </Card>
  );
}

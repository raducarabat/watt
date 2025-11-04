"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Input";
import { useToast } from "@/components/ToastProvider";
import { registerAction } from "@/app/(auth)/actions";
import { DASHBOARD_ROUTE } from "@/lib/constants";

const registerSchema = z
  .object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { push } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    setFormError(null);
    startTransition(async () => {
      const result = await registerAction({
        username: values.username,
        password: values.password,
      });

      if (!result?.success) {
        const errorMsg = result?.error ?? "Registration failed";
        setFormError(errorMsg);
        push({
          intent: "error",
          title: "Could not create account",
          description: errorMsg,
        });
        return;
      }

      push({
        intent: "success",
        title: "Account created",
        description: "Welcome aboard!",
      });

      router.replace(DASHBOARD_ROUTE);
    });
  };

  return (
    <Card className="space-y-8">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Join Watt Energy and start tracking usage.</CardDescription>
      </CardHeader>

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField htmlFor="username" label="Username" required error={form.formState.errors.username?.message}>
          <Input id="username" autoComplete="username" disabled={isPending} {...form.register("username")}/>
        </FormField>

        <FormField htmlFor="password" label="Password" required error={form.formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" disabled={isPending} {...form.register("password")}/>
        </FormField>

        <FormField
          htmlFor="confirmPassword"
          label="Confirm password"
          required
          error={form.formState.errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            disabled={isPending}
            {...form.register("confirmPassword")}
          />
        </FormField>

        {formError && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{formError}</p>}

        <Button className="w-full" isLoading={isPending} disabled={isPending}>
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-400">
        Already have an account? <Link className="font-semibold text-white hover:text-neutral-200" href="/login">Sign in</Link>.
      </p>
    </Card>
  );
}

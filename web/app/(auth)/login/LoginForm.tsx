"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/Card";
import { FormField } from "@/components/FormField";
import { Input } from "@/components/Input";
import { useToast } from "@/components/ToastProvider";
import { loginAction } from "@/app/(auth)/actions";
import { DASHBOARD_ROUTE } from "@/lib/constants";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    setFormError(null);
    startTransition(async () => {
      const result = await loginAction(values);
      if (!result?.success) {
        const errorMsg = result?.error ?? "Invalid credentials";
        setFormError(errorMsg);
        push({
          intent: "error",
          title: "Login failed",
          description: errorMsg,
        });
        return;
      }

      push({
        intent: "success",
        title: "Welcome back",
        description: "You are now signed in.",
      });

      const next = searchParams.get("next") || DASHBOARD_ROUTE;
      router.replace(next);
    });
  };

  return (
    <Card className="space-y-8">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access your energy dashboard.</CardDescription>
      </CardHeader>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          htmlFor="username"
          label="Username"
          required
          error={form.formState.errors.username?.message}
        >
          <Input
            id="username"
            autoComplete="username"
            disabled={isPending}
            {...form.register("username")}
          />
        </FormField>

        <FormField
          htmlFor="password"
          label="Password"
          required
          error={form.formState.errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={isPending}
            {...form.register("password")}
          />
        </FormField>

        {formError && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {formError}
          </p>
        )}

        <Button className="w-full" isLoading={isPending} disabled={isPending}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-400">
        Don&apos;t have an account?{" "}
        <Link className="font-semibold text-white hover:text-neutral-200" href="/register">
          Create one
        </Link>
        .
      </p>
    </Card>
  );
}

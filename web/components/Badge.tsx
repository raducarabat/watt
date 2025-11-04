"use client";

import type { PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

interface BadgeProps extends PropsWithChildren {
  variant?: "default" | "outline" | "muted";
  className?: string;
}

export function Badge({ variant = "default", className, children }: BadgeProps) {
  const base = "inline-flex h-7 items-center rounded-full px-3 text-xs font-medium";
  const variants = {
    default: "bg-neutral-800 text-neutral-100",
    outline: "border border-neutral-700 text-neutral-300",
    muted: "bg-neutral-900 text-neutral-400",
  } as const;

  return <span className={twMerge(base, variants[variant], className)}>{children}</span>;
}

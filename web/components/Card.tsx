"use client";

import type { PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

interface CardProps extends PropsWithChildren {
  className?: string;
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={twMerge(
        "rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 text-neutral-100 shadow-card transition",
        "backdrop-blur supports-[backdrop-filter]:bg-neutral-900/80",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends PropsWithChildren {
  className?: string;
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return <div className={twMerge("mb-6 flex flex-col gap-1 text-neutral-200", className)}>{children}</div>;
}

interface CardTitleProps extends PropsWithChildren {
  className?: string;
}

export function CardTitle({ className, children }: CardTitleProps) {
  return (
    <h2 className={twMerge("text-xl font-semibold tracking-tight text-white", className)}>
      {children}
    </h2>
  );
}

interface CardDescriptionProps extends PropsWithChildren {
  className?: string;
}

export function CardDescription({ className, children }: CardDescriptionProps) {
  return (
    <p className={twMerge("text-sm text-neutral-400", className)}>
      {children}
    </p>
  );
}

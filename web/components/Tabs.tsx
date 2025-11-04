"use client";

import type { PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

interface TabsProps extends PropsWithChildren {
  value: string;
  className?: string;
}

export function Tabs({ value, className, children }: TabsProps) {
  return (
    <div className={twMerge("space-y-4", className)} data-current={value}>
      {children}
    </div>
  );
}

interface TabsListProps extends PropsWithChildren {
  className?: string;
}

export function TabsList({ className, children }: TabsListProps) {
  return <div className={twMerge("flex gap-2", className)}>{children}</div>;
}

interface TabsTriggerProps extends PropsWithChildren {
  value: string;
  activeValue: string;
  onValueChange: (value: string) => void;
}

export function TabsTrigger({
  value,
  activeValue,
  onValueChange,
  children,
}: TabsTriggerProps) {
  const isActive = value === activeValue;
  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={twMerge(
        "rounded-2xl px-4 py-2 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-neutral-500",
        isActive
          ? "bg-neutral-100 text-neutral-950 shadow"
          : "bg-neutral-800 text-neutral-300 hover:text-white"
      )}
      role="tab"
      aria-selected={isActive}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends PropsWithChildren {
  value: string;
  activeValue: string;
  className?: string;
}

export function TabsContent({
  value,
  activeValue,
  className,
  children,
}: TabsContentProps) {
  if (value !== activeValue) return null;
  return (
    <div
      role="tabpanel"
      className={twMerge(
        "rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}

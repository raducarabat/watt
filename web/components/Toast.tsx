"use client";

import { twMerge } from "tailwind-merge";

type ToastVariant = "default" | "success" | "error";

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "bg-slate-900 text-slate-100",
  success: "bg-emerald-600 text-emerald-50",
  error: "bg-red-600 text-red-50",
};

interface ToastProps {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  onDismiss?: () => void;
}

export function Toast({ title, description, variant = "default", onDismiss }: ToastProps) {
  return (
    <div
      className={twMerge(
        "group relative flex w-full min-w-[280px] max-w-sm flex-col gap-2 rounded-2xl p-4 shadow-2xl transition",
        VARIANT_STYLES[variant],
      )}
    >
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-inherit opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        ✕
      </button>
      {title && <p className="text-sm font-semibold">{title}</p>}
      {description && <p className="text-sm opacity-90">{description}</p>}
    </div>
  );
}

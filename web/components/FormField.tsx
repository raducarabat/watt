"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface FormFieldProps extends PropsWithChildren {
  label: ReactNode;
  htmlFor: string;
  description?: ReactNode;
  error?: string;
  className?: string;
  required?: boolean;
}

export function FormField({
  label,
  htmlFor,
  description,
  error,
  className,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className={twMerge("space-y-2", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-neutral-200"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {description && <p className="text-xs text-neutral-400">{description}</p>}
      {children}
      {error && <p className="text-xs font-medium text-red-400">{error}</p>}
    </div>
  );
}

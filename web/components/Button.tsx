"use client";

import type { ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

type ButtonVariant = "default" | "ghost" | "outline" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSNAMES: Record<ButtonVariant, string> = {
  default:
    "bg-neutral-100 text-neutral-950 hover:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
  ghost:
    "text-neutral-200 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
  outline:
    "border border-neutral-700 text-neutral-100 hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
  destructive:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
};

const SIZE_CLASSNAMES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      isLoading,
      disabled,
      children,
      asChild,
      ...props
    },
    ref,
  ) => {
    const merged = twMerge(
      "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
      VARIANT_CLASSNAMES[variant],
      SIZE_CLASSNAMES[size],
      className,
    );

    const Comp: React.ElementType = asChild ? Slot : "button";

    return (
      <Comp ref={ref} className={merged} disabled={disabled || isLoading} {...props}>
        {isLoading && (
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </Comp>
    );
  },
);

Button.displayName = "Button";

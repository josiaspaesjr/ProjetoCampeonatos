import * as React from "react";
import { cn } from "@/lib/utils";

/* Badges v3: chips condensados com fundo/borda skewados em ::before. */
const variants = {
  default: "text-white before:bg-brand",
  secondary: "text-muted-2 before:border before:border-white/14",
  destructive: "text-white before:bg-brand",
  success: "text-success before:border before:border-success/50",
  warning: "text-brand-soft before:border before:border-brand/45",
  outline: "text-foreground before:border before:border-white/14",
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "relative isolate inline-flex items-center gap-2 px-3 py-1 font-cond text-xs font-semibold uppercase tracking-[0.08em] before:absolute before:inset-0 before:-z-10 before:-skew-x-9",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

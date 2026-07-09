import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "border-gold/45 text-gold-light",
  secondary: "border-white/14 text-muted-2",
  destructive: "border-destructive/50 text-destructive",
  success: "border-success/50 text-success",
  warning: "border-gold/45 bg-warning/15 text-warning-foreground",
  outline: "border-white/14 text-foreground",
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

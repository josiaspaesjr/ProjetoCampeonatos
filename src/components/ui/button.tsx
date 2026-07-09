import * as React from "react";
import { cn } from "@/lib/utils";

/* O fundo/borda skewado (−9°) vive num ::before para o texto ficar reto —
   assinatura do design v3 sem precisar de span interno em cada call site. */
const base =
  "relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap font-cond font-bold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 before:absolute before:inset-0 before:-z-10 before:-skew-x-9 before:transition-colors";

const variants = {
  default: "text-white before:bg-brand hover:before:bg-[#d5261d]",
  success: "text-ink before:bg-success hover:before:bg-success/90",
  destructive: "text-white before:bg-brand hover:before:bg-[#d5261d]",
  outline:
    "text-foreground before:border before:border-white/28 hover:before:border-white/55",
  "outline-brand":
    "text-brand before:border before:border-brand/60 hover:before:border-brand hover:text-brand-soft",
  secondary:
    "text-secondary-foreground before:bg-secondary hover:before:bg-secondary/80",
  ghost:
    "text-muted-2 before:hidden hover:bg-accent hover:text-accent-foreground",
  link: "text-brand-soft underline-offset-4 hover:underline normal-case tracking-normal before:hidden",
} as const;

const sizes = {
  default: "h-11 px-6 text-base",
  sm: "h-8 px-3.5 text-sm",
  lg: "h-13 px-9 text-lg",
  icon: "h-10 w-10",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

/** mesmas variantes para <Link> e <a> */
export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

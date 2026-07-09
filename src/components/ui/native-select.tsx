import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * <select> nativo estilizado no padrão do design system. Mantém as páginas
 * como Server Components (o Select Radix exigiria client) e funciona melhor
 * em tablet.
 */
export function NativeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-11 w-full appearance-none border border-input bg-raised px-4 py-1 text-base transition-colors focus-visible:border-gold focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

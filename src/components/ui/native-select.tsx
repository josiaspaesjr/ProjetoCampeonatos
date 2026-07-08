import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * <select> nativo estilizado no padrão shadcn. Mantém as páginas como Server
 * Components (o Select Radix exigiria client) e funciona melhor em tablet.
 */
export function NativeSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-9 w-full appearance-none rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

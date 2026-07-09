"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Spinner pequeno herdando a cor do texto. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}

/**
 * Botão de submit para forms de server action: mostra spinner e desabilita
 * enquanto a action roda. Deve ficar DENTRO do <form>.
 */
export function BotaoAcao({ children, disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending || disabled} aria-busy={pending}>
      {pending && <Spinner />}
      {children}
    </Button>
  );
}

/**
 * Versão sem estilo próprio — recebe as classes do call site (botões v3
 * customizados: skew, tamanhos fora da escala do <Button>).
 */
export function BotaoAcaoBruto({
  children,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...props}
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn(className, pending && "cursor-wait opacity-70")}
    >
      {pending && <Spinner className="mr-2 h-3.5 w-3.5 align-[-2px]" />}
      {children}
    </button>
  );
}

/**
 * Ação em texto (ex.: "excluir", "ok"): vira reticências enquanto pende,
 * sem mudar de largura de forma brusca.
 */
export function AcaoTexto({
  children,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...props}
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn(className, pending && "animate-pulse cursor-wait opacity-60")}
    >
      {pending ? "aguarde…" : children}
    </button>
  );
}

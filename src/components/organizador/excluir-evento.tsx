"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/botao-acao";

function BotaoConfirmar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-8 cursor-pointer items-center gap-2 bg-brand px-3.5 font-cond text-sm font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:opacity-70"
    >
      {pending && <Spinner className="h-3.5 w-3.5" />}
      {pending ? "Excluindo…" : "Excluir definitivamente"}
    </button>
  );
}

/**
 * Exclusão de evento em rascunho com confirmação em dois passos:
 * "Excluir evento" → "Tem certeza? Excluir definitivamente / cancelar".
 */
export function ExcluirEvento({
  excluir,
}: {
  excluir: () => Promise<void>;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="cursor-pointer font-cond text-sm font-semibold uppercase tracking-[0.04em] text-muted-3 transition-colors hover:text-brand"
      >
        Excluir evento
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2.5">
      <span className="font-cond text-sm font-semibold uppercase tracking-[0.04em] text-brand-soft">
        Apagar este rascunho para sempre?
      </span>
      <form action={excluir} className="inline-flex">
        <BotaoConfirmar />
      </form>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="cursor-pointer font-cond text-sm font-semibold uppercase tracking-[0.04em] text-muted-2 hover:text-foreground"
      >
        cancelar
      </button>
    </span>
  );
}

"use client";

import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";

/**
 * Exclusão de evento em rascunho, com modal de confirmação.
 */
export function ExcluirEvento({
  excluir,
  nome,
}: {
  excluir: () => Promise<void>;
  nome?: string;
}) {
  return (
    <ConfirmarExclusao
      acao={excluir}
      titulo="Excluir evento?"
      descricao={
        <>
          {nome ? (
            <>
              O rascunho <b className="text-foreground">{nome}</b> será apagado
            </>
          ) : (
            "Este rascunho será apagado"
          )}{" "}
          para sempre. Esta ação não pode ser desfeita.
        </>
      }
      confirmarRotulo="Excluir definitivamente"
      rotulo="Excluir evento"
      title="Excluir evento"
      className="cursor-pointer font-cond text-sm font-semibold uppercase tracking-[0.04em] text-muted-3 transition-colors hover:text-brand"
    />
  );
}

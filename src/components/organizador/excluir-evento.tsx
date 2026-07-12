"use client";

import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";
import { useDic } from "@/lib/i18n/client";

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
  const ex = useDic().admin.excluirEvento;
  return (
    <ConfirmarExclusao
      acao={excluir}
      titulo={ex.titulo}
      descricao={
        nome ? (
          <>
            {ex.descNomePre} <b className="text-foreground">{nome}</b>{" "}
            {ex.descNomePos}
          </>
        ) : (
          ex.descSemNome
        )
      }
      confirmarRotulo={ex.confirmar}
      rotulo={ex.rotulo}
      title={ex.rotulo}
      className="cursor-pointer font-cond text-sm font-semibold uppercase tracking-[0.04em] text-muted-3 transition-colors hover:text-brand"
    />
  );
}

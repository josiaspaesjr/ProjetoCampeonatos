"use client";

import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";
import { useDic } from "@/lib/i18n/client";

/**
 * Exclusão do evento (soft delete), com modal de confirmação. Com atletas
 * confirmados, o modal avisa quantos perdem o acesso ao evento.
 */
export function ExcluirEvento({
  excluir,
  nome,
  confirmadas = 0,
}: {
  excluir: () => Promise<void>;
  nome?: string;
  confirmadas?: number;
}) {
  const ex = useDic().admin.excluirEvento;
  return (
    <ConfirmarExclusao
      acao={excluir}
      titulo={ex.titulo}
      descricao={
        <>
          {nome ? (
            <>
              {ex.descNomePre} <b className="text-foreground">{nome}</b>{" "}
              {ex.descNomePos}
            </>
          ) : (
            ex.descSemNome
          )}
          {confirmadas > 0 && (
            <span className="mt-3 block font-semibold text-brand">
              {confirmadas === 1
                ? ex.avisoConfirmada
                : ex.avisoConfirmadas.replace("{n}", String(confirmadas))}
            </span>
          )}
        </>
      }
      confirmarRotulo={ex.confirmar}
      rotulo={ex.rotulo}
      title={ex.rotulo}
      className="cursor-pointer font-cond text-sm font-semibold uppercase tracking-[0.04em] text-muted-3 transition-colors hover:text-brand"
    />
  );
}

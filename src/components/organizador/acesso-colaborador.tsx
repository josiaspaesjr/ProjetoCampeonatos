"use client";

import { useState } from "react";
import { BotaoAcao } from "@/components/ui/botao-acao";
import { SeletorPermissoes } from "@/components/organizador/seletor-permissoes";
import { papelDe, type Secao } from "@/lib/eventos/permissoes";
import { useDic } from "@/lib/i18n/client";

/** Papel ("Mesário") ou a lista de seções, quando é uma combinação própria. */
export function ResumoAcesso({ permissoes }: { permissoes: Secao[] }) {
  const t = useDic().admin.equipe;
  const papel = papelDe(permissoes);
  return (
    <span className="text-xs text-muted-2">
      {papel
        ? t.papeis[papel]
        : permissoes.map((s) => t.secoes[s]).join(" · ")}
    </span>
  );
}

/**
 * Resumo do acesso de um colaborador com edição embutida: o dono clica em
 * "Editar acesso" e troca as seções sem sair da lista.
 */
export function AcessoColaborador({
  permissoes,
  salvar,
}: {
  permissoes: Secao[];
  salvar: (formData: FormData) => Promise<void>;
}) {
  const t = useDic().admin.equipe;
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <ResumoAcesso permissoes={permissoes} />
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="cursor-pointer text-xs text-muted-3 underline-offset-2 hover:text-foreground hover:underline"
        >
          {t.editarAcesso}
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (fd) => {
        await salvar(fd);
        setEditando(false);
      }}
      className="mt-3 border-l-2 border-brand/40 pl-4"
    >
      <SeletorPermissoes inicial={permissoes} />
      <div className="mt-4 flex items-center gap-3">
        <BotaoAcao size="sm">{t.salvarAcesso}</BotaoAcao>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="cursor-pointer text-xs text-muted-2 hover:text-foreground"
        >
          {t.cancelar}
        </button>
      </div>
    </form>
  );
}

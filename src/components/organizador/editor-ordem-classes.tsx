"use client";

import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";
import { useDic } from "@/lib/i18n/client";
import { useReordenavel } from "@/lib/dnd/use-reordenavel";
import { corDaOnda } from "@/lib/categorias/distribuicao-areas";

/** uma classe de idade presente na grade */
export interface ClasseNaOrdem {
  id: string;
  nome: string;
}

/**
 * Ordem do dia editável: as classes de idade da grade numa lista arrastável.
 * A regra padrão (extremos → meio) é o ponto de partida; o organizador pode
 * mudar para o que quiser e voltar ao padrão num clique. A sequência salva vale
 * na próxima estruturação das áreas — a chave e o que já foi distribuído não
 * mudam sozinhos.
 */
export function EditorOrdemClasses({
  classes,
  ordemPadrao,
  personalizada,
  salvar,
}: {
  /** classes na ordem em vigor (padrão ou a salva pelo organizador) */
  classes: ClasseNaOrdem[];
  /** ids na ordem que a regra padrão produz (para o "restaurar padrão") */
  ordemPadrao: string[];
  /** true quando o evento já tem ordem própria salva */
  personalizada: boolean;
  salvar: (classeIds: string[]) => void | Promise<void>;
}) {
  const ta = useDic().admin.areas;
  const nomePorId = new Map(classes.map((c) => [c.id, c.nome]));
  const idsIniciais = classes.map((c) => c.id);
  const [sujo, setSujo] = useState(false);

  const { ordem, arrastandoId, alvoIndex, containerRef, iniciarArraste } =
    useReordenavel<HTMLUListElement>(idsIniciais, (nova) => {
      setSujo(true);
      salvar(nova);
    });

  const maior = Math.max(1, ordem.length - 1);

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl font-cond text-[13px] uppercase leading-relaxed tracking-[0.02em] text-muted-3">
        {ta.ordemClassesTexto}
      </p>

      <ul ref={containerRef} className="flex flex-col border border-white/10">
        {ordem.map((id, i) => (
          <Fragment key={id}>
            {arrastandoId && alvoIndex === i && <Indicador />}
            <li
              data-ordenavel-id={id}
              className={cn(
                "flex items-stretch gap-3 border-b border-white/6 bg-background/40 last:border-b-0",
                arrastandoId === id && "opacity-40",
              )}
            >
              <button
                type="button"
                aria-label={ta.reordenarAlca}
                onPointerDown={iniciarArraste(id)}
                style={{ touchAction: "none" }}
                className="flex w-9 shrink-0 cursor-grab items-center justify-center self-stretch text-muted-3 transition-colors hover:bg-white/[0.04] hover:text-brand-soft active:cursor-grabbing"
              >
                <span className="text-[15px] leading-none">⠿</span>
              </button>

              <span className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0"
                  style={{ background: corDaOnda(i, maior) }}
                />
                <span className="tnum font-cond text-[12px] uppercase tracking-[0.06em] text-muted-3">
                  {i + 1}º
                </span>
                <span className="truncate font-cond text-[14px] font-semibold uppercase tracking-[0.03em] text-foreground">
                  {nomePorId.get(id) ?? id}
                </span>
              </span>
            </li>
          </Fragment>
        ))}
        {arrastandoId && alvoIndex === ordem.length && <Indicador />}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-cond text-[12px] uppercase tracking-[0.05em] text-muted-3">
          {personalizada || sujo
            ? ta.ordemClassesPropria
            : ta.ordemClassesPadrao}
        </span>
        {(personalizada || sujo) && (
          <button
            type="button"
            onClick={() => {
              setSujo(false);
              salvar(ordemPadrao);
            }}
            className="inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:border-brand/50 hover:text-brand-soft"
          >
            <span className="inline-block skew-x-9">
              ↺ {ta.ordemClassesRestaurar}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

/** risco vermelho mostrando onde a classe cai ao soltar */
function Indicador() {
  return <li className="h-0.5 shrink-0 bg-brand" />;
}

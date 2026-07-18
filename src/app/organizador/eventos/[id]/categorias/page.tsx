import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { CLASSES_IDADE, FAIXAS } from "@/lib/categorias/cbjj";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { GRUPOS_PRECO_PRESETS } from "@/lib/lotes/preco";
import { GeradorGrade } from "@/components/organizador/gerador-grade";
import { SeletorGrupoPreco } from "@/components/organizador/seletor-grupo-preco";
import { ConfirmarExclusao } from "@/components/ui/confirmar-exclusao";
import {
  definirGrupoPreco,
  excluirCategoria,
  gerarCategoriasCbjj,
} from "../../actions";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ordens canônicas do gerador (classe → sexo → faixa → peso)
const ORDEM_CLASSE = new Map(CLASSES_IDADE.map((c, i) => [c.id, i]));
const ORDEM_FAIXA = new Map(FAIXAS.map((f, i) => [f as string, i]));
const CLASSE_POR_ID = new Map(CLASSES_IDADE.map((c) => [c.id, c]));

type Categoria = typeof categorias.$inferSelect;

/** peso vira número ordenável: leves→pesados, pesadíssimo, e absoluto por último */
function rankPeso(c: Categoria): number {
  if (c.tipo === "absoluto") return 1_000_000;
  if (c.limitePesoKg == null) return 999_999;
  return Number(c.limitePesoKg);
}

/** último trecho do nome ("… / Leve (até 76kg)" → "Leve · 76kg") */
function rotuloPeso(nome: string): string {
  return (nome.split(" / ").pop() ?? nome)
    .replace(" (até ", " · ")
    .replace("kg)", "kg");
}

/** agrupa uma lista já ordenada em blocos consecutivos por chave */
function agrupar<T>(itens: T[], chave: (t: T) => string): { chave: string; itens: T[] }[] {
  const grupos: { chave: string; itens: T[] }[] = [];
  for (const it of itens) {
    const ult = grupos.at(-1);
    const k = chave(it);
    if (ult && ult.chave === k) ult.itens.push(it);
    else grupos.push({ chave: k, itens: [it] });
  }
  return grupos;
}

export default async function CategoriasEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const dic = await getDicionario();
  const tc = dic.admin.categorias;
  const rotuloSexo: Record<string, string> = {
    masculino: dic.inscricao.masculino,
    feminino: dic.inscricao.feminino,
  };

  const evento = await eventoGerenciavel(db, id, usuario.id);
  if (!evento) notFound();

  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, id),
  });

  // grupos de preço: presets fixos (mesma lista do select de variação do lote)
  const grupos = [...GRUPOS_PRECO_PRESETS];

  // ordena na mesma sequência em que o gerador apresenta
  const ordenadas = [...cats].sort(
    (a, b) =>
      (ORDEM_CLASSE.get(a.classeIdade) ?? 999) -
        (ORDEM_CLASSE.get(b.classeIdade) ?? 999) ||
      (a.sexo === b.sexo ? 0 : a.sexo === "masculino" ? -1 : 1) ||
      (ORDEM_FAIXA.get(a.faixa ?? "") ?? 999) -
        (ORDEM_FAIXA.get(b.faixa ?? "") ?? 999) ||
      rankPeso(a) - rankPeso(b),
  );

  // nível 1: blocos por classe + sexo
  const blocos = agrupar(ordenadas, (c) => `${c.classeIdade}|${c.sexo}`);

  return (
    <>
      {erro && (
        <p className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      {/* GERADOR CBJJ */}
      <GeradorGrade
        modalidade={evento.modalidade}
        gerar={gerarCategoriasCbjj.bind(null, evento.id)}
      />

      {/* GRADE GERADA */}
      <div>
        <div className="mb-3.5 flex items-baseline gap-2.5">
          <span className="disp text-[22px]">{tc.gradeGerada}</span>
          {cats.length > 0 && (
            <span className="font-cond text-[13px] uppercase tracking-[0.06em] text-muted-3">
              {cats.length} {cats.length === 1 ? tc.categoria : tc.categorias}
            </span>
          )}
        </div>

        {cats.length === 0 ? (
          <div className="border border-white/10 bg-surface px-[22px] py-12 text-center font-cond text-[15px] uppercase text-muted-3">
            {tc.montePre}{" "}
            <strong className="text-muted-2">
              {dic.admin.gerador.gerarPre} {tc.categorias}
            </strong>
            .
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {blocos.map((bloco) => {
              const [classeId, sexo] = bloco.chave.split("|");
              const classe = CLASSE_POR_ID.get(classeId);
              const faixas = agrupar(bloco.itens, (c) => c.faixa ?? "");
              // grupo do bloco: uniforme entre as categorias, ou vazio se misto
              const gruposDoBloco = new Set(
                bloco.itens.map((c) => c.grupoPreco ?? ""),
              );
              const grupoDoBloco =
                gruposDoBloco.size === 1 ? [...gruposDoBloco][0] : "";
              return (
                <section
                  key={bloco.chave}
                  className="overflow-hidden border border-white/10 bg-surface"
                >
                  <header className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
                    <span className="font-cond text-[15px] font-semibold uppercase tracking-[0.04em]">
                      {dic.classesIdade[classeId] ?? classe?.nome ?? classeId} ·{" "}
                      {rotuloSexo[sexo] ?? sexo}
                    </span>
                    {classe && (
                      <span className="font-cond text-xs text-muted-3">
                        {classe.idadeMin}
                        {classe.idadeMax ? `–${classe.idadeMax}` : "+"} {tc.anos}
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-2.5">
                      {grupos.length > 0 && (
                        <SeletorGrupoPreco
                          classeIdade={classeId}
                          sexo={sexo}
                          grupoAtual={grupoDoBloco}
                          grupos={grupos}
                          definir={definirGrupoPreco.bind(null, evento.id)}
                        />
                      )}
                      <span className="font-cond text-xs tabular-nums text-muted-3">
                        {bloco.itens.length}
                      </span>
                    </div>
                  </header>

                  <div className="flex flex-col">
                    {faixas.map((fg) => (
                      <div
                        key={fg.chave}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/6 px-4 py-3 last:border-b-0"
                      >
                        <span className="flex w-[104px] shrink-0 items-center gap-2 font-cond text-sm font-semibold uppercase tracking-[0.03em]">
                          <span
                            className="h-2.5 w-2.5 shrink-0 -skew-x-9 border border-white/25"
                            style={{ background: corDaFaixa(fg.chave || null) }}
                          />
                          {fg.chave
                            ? (dic.evento.faixaNomes[
                                fg.chave as keyof typeof dic.evento.faixaNomes
                              ] ?? cap(fg.chave))
                            : "—"}
                        </span>
                        <div className="flex flex-1 flex-wrap gap-1.5">
                          {fg.itens.map((c) => (
                            <span
                              key={c.id}
                              className="group/chip inline-flex items-center gap-1.5 border border-white/12 bg-background py-1 pl-2.5 pr-1.5 font-cond text-xs uppercase tracking-[0.02em] text-text-2 transition-colors hover:border-brand/40"
                            >
                              {rotuloPeso(c.nome)}
                              <ConfirmarExclusao
                                acao={excluirCategoria.bind(
                                  null,
                                  evento.id,
                                  c.id,
                                )}
                                titulo={tc.excluirCat.titulo}
                                descricao={
                                  <>
                                    {tc.excluirCat.descPre}{" "}
                                    <b className="text-foreground">{c.nome}</b>{" "}
                                    {tc.excluirCat.descPos}
                                  </>
                                }
                                confirmarRotulo={tc.excluirCat.confirmar}
                                rotulo="×"
                                title={tc.excluirCat.confirmar}
                                className="flex h-4 w-4 cursor-pointer items-center justify-center text-sm leading-none text-muted-3 transition-colors hover:text-brand"
                              />
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

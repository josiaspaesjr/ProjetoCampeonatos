import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos } from "@/db/schema";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { getUsuarioAtual } from "@/lib/auth";
import { CLASSES_IDADE, FAIXAS } from "@/lib/categorias/cbjj";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { excluirCategoria, gerarCategoriasCbjj } from "../../actions";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const ROTULO_SEXO: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
};

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

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, id), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) notFound();

  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, id),
  });

  // ordena na mesma sequência em que o gerador apresenta acima
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

  const grupoCls =
    "mb-3.5 font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-3";
  const checkCls =
    "h-[18px] w-[18px] shrink-0 cursor-pointer appearance-none border border-white/28 bg-transparent align-middle checked:border-brand checked:bg-brand";

  return (
    <>
      {erro && (
        <p className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      {/* GERADOR CBJJ */}
      <div className="border border-white/10 bg-surface p-6">
        <div className="disp mb-1 text-[26px]">Gerador de grade CBJJ</div>
        <p className="mb-[22px] max-w-[820px] text-sm font-medium leading-normal text-muted-2">
          Marque classes, sexos e faixas — o produto cartesiano com a tabela de
          pesos vira a grade (cada classe só gera as faixas permitidas para
          ela). Confira os limites com o regulamento do seu evento — as
          categorias são editáveis.
        </p>

        <form action={gerarCategoriasCbjj.bind(null, evento.id)}>
          <div className="grid gap-8 text-sm md:grid-cols-3">
            <fieldset>
              <legend className={grupoCls}>Classes</legend>
              <div className="flex flex-col gap-[11px]">
                {CLASSES_IDADE.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2.5"
                  >
                    <input
                      type="checkbox"
                      name="classes"
                      value={c.id}
                      defaultChecked={c.id === "adulto"}
                      className={checkCls}
                    />
                    {c.nome}{" "}
                    <span className="text-muted-3">
                      ({c.idadeMin}
                      {c.idadeMax ? `–${c.idadeMax}` : "+"})
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={grupoCls}>Sexo</legend>
              <div className="flex flex-col gap-[11px]">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="sexos"
                    value="masculino"
                    defaultChecked
                    className={checkCls}
                  />
                  Masculino
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="sexos"
                    value="feminino"
                    defaultChecked
                    className={checkCls}
                  />
                  Feminino
                </label>
                <label className="mt-2 flex cursor-pointer items-center gap-2.5 font-medium">
                  <input
                    type="checkbox"
                    name="incluirAbsoluto"
                    className={checkCls}
                  />
                  Incluir absoluto
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend className={grupoCls}>Faixas</legend>
              <div className="flex flex-col gap-[11px]">
                {FAIXAS.map((f) => (
                  <label
                    key={f}
                    className="flex cursor-pointer items-center gap-2.5"
                  >
                    <input
                      type="checkbox"
                      name="faixas"
                      value={f}
                      defaultChecked={f === "branca" || f === "azul"}
                      className={checkCls}
                    />
                    <span className="flex items-center gap-2">
                      <span
                        className="h-[9px] w-[9px] -skew-x-9 border border-white/20"
                        style={{ background: corDaFaixa(f) }}
                      />
                      {cap(f)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <BotaoAcaoBruto className="mt-6 inline-flex h-[42px] cursor-pointer items-center bg-brand px-5 font-cond text-base font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]">
            Gerar categorias
          </BotaoAcaoBruto>
        </form>
      </div>

      {/* GRADE GERADA */}
      <div>
        <div className="mb-3.5 flex items-baseline gap-2.5">
          <span className="disp text-[22px]">Grade gerada</span>
          {cats.length > 0 && (
            <span className="font-cond text-[13px] uppercase tracking-[0.06em] text-muted-3">
              {cats.length} categoria{cats.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {cats.length === 0 ? (
          <div className="border border-white/10 bg-surface px-[22px] py-12 text-center font-cond text-[15px] uppercase text-muted-3">
            Marque classes, sexos e faixas e clique em{" "}
            <strong className="text-muted-2">Gerar categorias</strong>.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {blocos.map((bloco) => {
              const [classeId, sexo] = bloco.chave.split("|");
              const classe = CLASSE_POR_ID.get(classeId);
              const faixas = agrupar(bloco.itens, (c) => c.faixa ?? "");
              return (
                <section
                  key={bloco.chave}
                  className="overflow-hidden border border-white/10 bg-surface"
                >
                  <header className="flex items-baseline gap-2.5 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
                    <span className="font-cond text-[15px] font-semibold uppercase tracking-[0.04em]">
                      {classe?.nome ?? classeId} · {ROTULO_SEXO[sexo] ?? sexo}
                    </span>
                    {classe && (
                      <span className="font-cond text-xs text-muted-3">
                        {classe.idadeMin}
                        {classe.idadeMax ? `–${classe.idadeMax}` : "+"} anos
                      </span>
                    )}
                    <span className="ml-auto font-cond text-xs tabular-nums text-muted-3">
                      {bloco.itens.length}
                    </span>
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
                          {fg.chave ? cap(fg.chave) : "—"}
                        </span>
                        <div className="flex flex-1 flex-wrap gap-1.5">
                          {fg.itens.map((c) => (
                            <span
                              key={c.id}
                              className="group/chip inline-flex items-center gap-1.5 border border-white/12 bg-background py-1 pl-2.5 pr-1.5 font-cond text-xs uppercase tracking-[0.02em] text-text-2 transition-colors hover:border-brand/40"
                            >
                              {rotuloPeso(c.nome)}
                              <form
                                action={excluirCategoria.bind(
                                  null,
                                  evento.id,
                                  c.id,
                                )}
                                className="flex"
                              >
                                <button
                                  type="submit"
                                  title="Excluir categoria"
                                  className="flex h-4 w-4 cursor-pointer items-center justify-center text-sm leading-none text-muted-3 transition-colors hover:text-brand"
                                >
                                  ×
                                </button>
                              </form>
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

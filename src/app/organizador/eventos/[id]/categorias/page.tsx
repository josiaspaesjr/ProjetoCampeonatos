import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos } from "@/db/schema";
import { AcaoTexto, BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { getUsuarioAtual } from "@/lib/auth";
import { CLASSES_IDADE, FAIXAS } from "@/lib/categorias/cbjj";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import {
  configurarCategoria,
  excluirCategoria,
  gerarCategoriasCbjj,
} from "../../actions";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
    orderBy: asc(categorias.nome),
  });

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
      <div className="border border-white/10 bg-surface">
        {cats.length === 0 ? (
          <div className="px-[22px] py-12 text-center font-cond text-[15px] uppercase text-muted-3">
            Marque classes, sexos e faixas e clique em{" "}
            <strong className="text-muted-2">Gerar categorias</strong>.
          </div>
        ) : (
          <div className="grid md:grid-cols-2">
            {cats.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-3 border-b border-white/6 px-[22px] py-[11px] ${
                  i % 2 === 0 ? "md:border-r" : ""
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5 text-sm">
                  <span
                    className="h-2 w-2 shrink-0 -skew-x-9 border border-white/20"
                    style={{ background: corDaFaixa(c.faixa) }}
                  />
                  <span className="truncate">{c.nome}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <form
                    action={configurarCategoria.bind(null, evento.id, c.id)}
                    className="flex items-center gap-1"
                    title="Preço próprio (vazio = lote vigente) e minutos por luta (vazio = tabela CBJJ da faixa)"
                  >
                    <span className="text-xs text-muted-3">R$</span>
                    <Input
                      name="preco"
                      defaultValue={
                        c.precoCentavos != null
                          ? (c.precoCentavos / 100).toFixed(0)
                          : ""
                      }
                      placeholder="lote"
                      className="h-7 w-16 px-2 text-xs"
                    />
                    <Input
                      name="duracaoMin"
                      defaultValue={
                        c.duracaoLutaSegundos != null
                          ? String(Math.round(c.duracaoLutaSegundos / 60))
                          : ""
                      }
                      placeholder="min"
                      className="h-7 w-12 px-2 text-xs"
                    />
                    <AcaoTexto className="cursor-pointer text-xs text-muted-2 hover:text-foreground hover:underline">
                      ok
                    </AcaoTexto>
                  </form>
                  <form action={excluirCategoria.bind(null, evento.id, c.id)}>
                    <AcaoTexto className="cursor-pointer text-[13px] font-medium text-brand hover:underline">
                      excluir
                    </AcaoTexto>
                  </form>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

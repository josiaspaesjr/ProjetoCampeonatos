import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { eventos, lotes } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { getUsuarioAtual } from "@/lib/auth";
import { criarLote, excluirLote } from "../../actions";

export default async function LotesEvento({
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

  const lts = await db.query.lotes.findMany({
    where: eq(lotes.eventoId, id),
    orderBy: asc(lotes.inicio),
  });

  const agora = new Date();
  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: evento.moeda,
  });
  const fmtData = (d: Date) => d.toLocaleDateString("pt-BR");

  const labelCls =
    "font-cond text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-2";

  return (
    <>
      {erro && (
        <p className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* LISTA DE LOTES */}
        <div className="border border-white/10 bg-surface">
          {lts.length === 0 ? (
            <div className="px-[22px] py-10 text-center font-cond text-[15px] uppercase text-muted-3">
              Nenhum lote cadastrado.
            </div>
          ) : (
            lts.map((l) => {
              const vigente = l.inicio <= agora && agora <= l.fim;
              return (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-[22px] py-[17px] last:border-b-0"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-cond text-xl font-semibold uppercase">
                        {l.nome}
                      </span>
                      {vigente && (
                        <span className="inline-flex h-5 items-center border border-brand/50 bg-brand/14 px-2 font-cond text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-soft">
                          vigente
                        </span>
                      )}
                    </div>
                    <div className="tnum mt-0.5 font-cond text-sm uppercase tracking-[0.04em] text-muted-2">
                      {fmtData(l.inicio)} → {fmtData(l.fim)}
                      {l.precoSegundaInscricaoCentavos != null &&
                        ` · 2ª: ${fmt.format(l.precoSegundaInscricaoCentavos / 100)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-[18px]">
                    <span className="disp tnum text-[28px]">
                      {fmt.format(l.precoCentavos / 100)}
                    </span>
                    <form action={excluirLote.bind(null, evento.id, l.id)}>
                      <button className="cursor-pointer text-sm font-medium text-brand hover:underline">
                        excluir
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* NOVO LOTE */}
        <div className="border border-white/10 bg-surface p-[22px]">
          <div className="disp mb-4 text-[26px]">Novo lote</div>
          <form
            action={criarLote.bind(null, evento.id)}
            className="flex flex-col gap-[13px]"
          >
            <div className="flex flex-col gap-[7px]">
              <label className={labelCls} htmlFor="lote-nome">
                Nome
              </label>
              <Input
                id="lote-nome"
                name="nome"
                required
                placeholder="1º lote / Early bird"
                className="h-10 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[7px]">
                <label className={labelCls} htmlFor="lote-preco">
                  Preço ({evento.moeda})
                </label>
                <Input
                  id="lote-preco"
                  name="preco"
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="70,00"
                  className="h-10 text-sm"
                />
              </div>
              <div className="flex flex-col gap-[7px]">
                <label className={labelCls} htmlFor="lote-preco2">
                  2ª inscrição
                </label>
                <Input
                  id="lote-preco2"
                  name="precoSegunda"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="opcional"
                  className="h-10 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[7px]">
                <label className={labelCls} htmlFor="lote-inicio">
                  Início
                </label>
                <Input
                  id="lote-inicio"
                  name="inicio"
                  type="datetime-local"
                  required
                  className="h-10 text-sm"
                />
              </div>
              <div className="flex flex-col gap-[7px]">
                <label className={labelCls} htmlFor="lote-fim">
                  Fim
                </label>
                <Input
                  id="lote-fim"
                  name="fim"
                  type="datetime-local"
                  required
                  className="h-10 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-1 h-[42px] cursor-pointer bg-brand font-cond text-base font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
            >
              Adicionar lote
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { areas, categorias, inscricoes } from "@/db/schema";
import { corDaFaixa } from "@/lib/categorias/faixa-cores";
import { dataHora, diaMes } from "@/lib/datas";
import { secoesPreenchidas } from "@/lib/regulamento";
import { getEventoPublico, statusDoEvento } from "@/lib/evento-publico";

const MODALIDADE_ROTULO: Record<string, string> = {
  gi_nogi: "Gi + No-Gi",
  gi: "Gi",
  nogi: "No-Gi",
};

// ordem CBJJ das faixas, para exibir os swatches de cor "utilizados" no evento
const ORDEM_FAIXAS = [
  "branca",
  "cinza",
  "amarela",
  "laranja",
  "verde",
  "azul",
  "roxa",
  "marrom",
  "preta",
];

/** Faixas presentes no evento (cores usadas), em ordem CBJJ. */
function faixasPresentes(
  faixasCats: (string | null)[],
  evento: { faixaMin: string | null; faixaMax: string | null },
): string[] {
  const set = new Set(
    faixasCats.filter((f): f is string => !!f && ORDEM_FAIXAS.includes(f)),
  );
  // sem categorias ainda: cai no recorte de faixas do cadastro do evento
  if (set.size === 0 && (evento.faixaMin || evento.faixaMax)) {
    const min = ORDEM_FAIXAS.indexOf(evento.faixaMin ?? "branca");
    const max = ORDEM_FAIXAS.indexOf(evento.faixaMax ?? "preta");
    for (let i = min; i <= max; i++) set.add(ORDEM_FAIXAS[i]);
  }
  return ORDEM_FAIXAS.filter((f) => set.has(f));
}

const capFaixa = (f: string) => f.charAt(0).toUpperCase() + f.slice(1);

export default async function AbaInformacoes({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dados = await getEventoPublico(slug);
  if (!dados) notFound();
  const { evento, loteVigente, inscricoesAbertas } = dados;

  const db = await getDb();
  const [cats, confirmadas, areasDoEvento] = await Promise.all([
    // só as faixas — o resto das categorias vive na aba Categorias
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, evento.id),
      columns: { faixa: true },
    }),
    db.query.inscricoes.findMany({
      where: and(
        eq(inscricoes.eventoId, evento.id),
        eq(inscricoes.status, "confirmada"),
      ),
      columns: { academiaNome: true },
    }),
    db.query.areas.findMany({
      where: eq(areas.eventoId, evento.id),
      columns: { id: true },
    }),
  ]);

  // equipes confirmadas (sidebar)
  const porAcademia = new Map<string, number>();
  for (const i of confirmadas) {
    const nome = i.academiaNome ?? "Sem equipe";
    porAcademia.set(nome, (porAcademia.get(nome) ?? 0) + 1);
  }
  const equipes = [...porAcademia.entries()].sort((a, b) => b[1] - a[1]);

  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: evento.moeda,
    maximumFractionDigits: 0,
  });

  const status = statusDoEvento(evento.status, inscricoesAbertas);
  const regulamento = secoesPreenchidas(evento.regulamento);

  const faixas = faixasPresentes(cats.map((c) => c.faixa), evento);
  // "cadastrado no campeonato": áreas reais ou o nº planejado no cadastro
  const areasCount =
    areasDoEvento.length > 0 ? areasDoEvento.length : (evento.numAreas ?? 0);

  const fatos: { k: string; v: ReactNode; destaque?: boolean }[] = [
    { k: "Modalidade", v: MODALIDADE_ROTULO[evento.modalidade] ?? "Gi + No-Gi" },
    ...(areasCount > 0 ? [{ k: "Áreas", v: String(areasCount) }] : []),
    ...(faixas.length
      ? [
          {
            k: "Faixas",
            v: (
              <>
                {faixas.map((f) => (
                  <span
                    key={f}
                    title={capFaixa(f)}
                    className="h-6 w-6 shrink-0 -skew-x-9 border border-white/25 md:h-7 md:w-7"
                    style={{ background: corDaFaixa(f) }}
                  />
                ))}
              </>
            ),
          },
        ]
      : []),
    ...(evento.dataGeracaoChaves
      ? [{ k: "Chaves", v: diaMes(evento.dataGeracaoChaves) }]
      : []),
    evento.dataPesagem
      ? { k: "Pesagem", v: diaMes(evento.dataPesagem), destaque: true }
      : { k: "Data", v: diaMes(evento.dataInicio), destaque: true },
  ];

  // grade de colunas acompanha a quantidade de fatos (evita célula vazia)
  const colsMd =
    (
      {
        2: "md:grid-cols-2",
        3: "md:grid-cols-3",
        4: "md:grid-cols-4",
        5: "md:grid-cols-5",
      } as Record<number, string>
    )[Math.min(fatos.length, 5)] ?? "md:grid-cols-4";

  return (
    <div className="grid items-start gap-12 px-6 pb-20 pt-10 md:px-12 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* MAIN */}
      <main className="flex min-w-0 flex-col gap-14">
        {/* SOBRE */}
        <section>
          <div className="mb-3 font-cond text-[15px] font-semibold uppercase tracking-[0.14em] text-brand">
            Sobre o evento
          </div>
          {evento.descricao ? (
            <p className="max-w-[680px] whitespace-pre-line text-lg font-medium leading-relaxed text-text-2">
              {evento.descricao}
            </p>
          ) : (
            <p className="max-w-[680px] text-lg font-medium leading-relaxed text-muted-2">
              Campeonato de jiu-jitsu com inscrições, chaveamento e placar
              digital pela BJJArena.
            </p>
          )}
          <div
            className={`mt-[30px] grid grid-cols-2 gap-px border border-white/10 bg-white/10 ${colsMd}`}
          >
            {fatos.map((f) => (
              <div
                key={f.k}
                className="min-w-0 bg-background px-4 py-5 md:px-[22px] md:py-[22px]"
              >
                <div className="mb-2 font-cond text-[13px] uppercase tracking-[0.1em] text-muted-2">
                  {f.k}
                </div>
                {typeof f.v === "string" ? (
                  <div
                    className={`disp truncate text-[26px] md:text-[38px] ${f.destaque ? "text-brand" : ""}`}
                  >
                    {f.v}
                  </div>
                ) : (
                  <div className="flex min-h-[30px] flex-wrap items-center gap-1.5 md:min-h-[42px] md:gap-2">
                    {f.v}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* REGULAMENTO */}
        {regulamento.length > 0 && (
          <section>
            <div className="mb-5 font-cond text-[15px] font-semibold uppercase tracking-[0.14em] text-brand">
              Regulamento
            </div>
            <div className="flex flex-col gap-px border border-white/10 bg-white/10">
              {regulamento.map((s) => (
                <details
                  key={s.titulo}
                  className="group bg-background [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center gap-3 px-5 py-4 select-none">
                    <span className="h-2 w-2 shrink-0 -skew-x-9 bg-brand" />
                    <span className="flex-1 font-cond text-[19px] font-semibold uppercase tracking-[0.02em]">
                      {s.titulo}
                    </span>
                    <span className="font-cond text-xs text-muted-3 transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <p className="whitespace-pre-line border-t border-white/8 px-5 py-4 text-[15px] font-medium leading-relaxed text-text-2">
                    {s.texto}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* SIDEBAR */}
      <aside className="top-32 flex flex-col gap-[18px] lg:sticky">
        {/* CARD DE INSCRIÇÃO */}
        <div className="relative overflow-hidden border border-brand/40 bg-surface p-[26px]">
          <div className="absolute left-0 top-0 h-full w-[5px] bg-brand" />
          {inscricoesAbertas && loteVigente ? (
            <>
              <div className="mb-0.5 font-cond text-[13px] uppercase tracking-[0.1em] text-muted-2">
                Inscrição · {loteVigente.nome}
              </div>
              <div className="mb-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="disp text-[52px] leading-none text-brand md:text-[68px]">
                  {fmt.format(loteVigente.precoCentavos / 100)}
                </span>
                <span className="font-cond text-sm uppercase text-muted-2">
                  por categoria
                </span>
              </div>
              <Link
                href={`/evento/${evento.slug}/inscricao`}
                className="mb-2.5 block bg-brand py-[15px] text-center font-cond text-[19px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
              >
                Inscrever-se →
              </Link>
            </>
          ) : (
            <div className="mb-2.5 border border-white/14 p-4 text-center font-cond text-sm font-semibold uppercase tracking-[0.1em] text-muted-2">
              {status.rotulo}
            </div>
          )}
          <Link
            href={`/evento/${evento.slug}/cronograma`}
            className="block border border-white/16 py-3 text-center font-cond text-[15px] font-semibold uppercase tracking-[0.05em] text-foreground transition-colors hover:border-white/30"
          >
            Cronograma ao vivo
          </Link>
          <div className="mt-[22px] flex flex-col gap-3 border-t border-white/8 pt-5">
            {evento.inscricoesFecham && (
              <div className="flex items-center justify-between font-cond text-sm uppercase tracking-[0.04em]">
                <span className="text-muted-2">Inscrições fecham</span>
                <span className="text-brand-soft">
                  {dataHora(evento.inscricoesFecham)}
                </span>
              </div>
            )}
            {loteVigente?.precoSegundaInscricaoCentavos != null && (
              <div className="flex items-center justify-between font-cond text-sm uppercase tracking-[0.04em]">
                <span className="text-muted-2">Segunda categoria</span>
                <span className="text-text-2">
                  + {fmt.format(loteVigente.precoSegundaInscricaoCentavos / 100)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between font-cond text-sm uppercase tracking-[0.04em]">
              <span className="text-muted-2">Pagamento</span>
              <span className="text-text-2">
                {evento.moeda === "BRL" ? "Pix" : "Cartão"}
              </span>
            </div>
          </div>
        </div>

        {/* EQUIPES */}
        <div className="border border-white/10 bg-surface p-6">
          <div className="mb-3.5 flex items-baseline gap-2.5">
            <span className="disp text-[30px]">Equipes</span>
            <span className="font-cond text-[13px] uppercase text-muted-2">
              {porAcademia.size} confirmada{porAcademia.size === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-col">
            {equipes.map(([nome, qtd]) => (
              <div
                key={nome}
                className="flex items-center justify-between border-t border-white/6 py-2.5"
              >
                <span className="text-[15px] font-medium text-text-2">
                  {nome}
                </span>
                <span className="disp text-[26px] text-brand">{qtd}</span>
              </div>
            ))}
            {equipes.length === 0 && (
              <div className="border-t border-white/6 py-3 font-cond text-sm text-muted-3">
                Seja o primeiro a se inscrever!
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

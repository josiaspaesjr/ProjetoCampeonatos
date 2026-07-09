"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SkewTexto } from "@/components/marca";
import { cn } from "@/lib/utils";

export interface CardEvento {
  slug: string;
  nome: string;
  descricao: string | null;
  bannerUrl: string | null;
  dia: string;
  mesAno: string; // "MAR 2026"
  dataLonga: string; // "14 MAR 2026"
  cidade: string;
  meta: string; // "São Paulo/SP · Gi + No-Gi"
  modalidade: "gi_nogi" | "gi" | "nogi";
  status: string; // rótulo do badge
  aberto: boolean;
  aoVivo: boolean;
  emBreve: boolean;
  inscritos: number;
}

const FILTROS = [
  "Todos",
  "Inscrições abertas",
  "Gi",
  "No-Gi",
  "Em breve",
] as const;
type Filtro = (typeof FILTROS)[number];

export function CatalogoClient({ eventos }: { eventos: CardEvento[] }) {
  const [filtro, setFiltro] = useState<Filtro>("Todos");
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return eventos.filter((e) => {
      let ok = true;
      if (filtro === "Inscrições abertas") ok = e.aberto;
      else if (filtro === "Em breve") ok = e.emBreve;
      else if (filtro === "Gi") ok = e.modalidade !== "nogi";
      else if (filtro === "No-Gi") ok = e.modalidade !== "gi";
      if (ok && q) ok = `${e.nome} ${e.cidade}`.toLowerCase().includes(q);
      return ok;
    });
  }, [eventos, filtro, busca]);

  const mostrarDestaque = filtro === "Todos" && !busca.trim();
  const destaque = mostrarDestaque
    ? (visiveis.find((e) => e.aoVivo) ?? visiveis.find((e) => e.aberto))
    : undefined;
  const grade = destaque ? visiveis.filter((e) => e !== destaque) : visiveis;

  return (
    <>
      {/* BARRA DE FILTROS */}
      <div className="sticky top-[63px] z-40 flex flex-wrap items-center gap-4 border-b border-white/8 bg-ink/92 px-6 py-[18px] backdrop-blur-xl md:px-12">
        <div className="relative min-w-[220px] max-w-[360px] flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-muted-3">
            ⌕
          </span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar evento ou cidade"
            className="h-11 w-full border border-white/14 bg-raised pl-[34px] pr-3.5 text-[15px] placeholder:text-muted-3 focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                "h-11 -skew-x-9 border px-[18px] font-cond text-[15px] font-semibold uppercase tracking-[0.05em] transition-colors",
                filtro === f
                  ? "border-brand bg-brand text-white"
                  : "border-white/14 text-text-2 hover:border-white/30",
              )}
            >
              <SkewTexto>{f}</SkewTexto>
            </button>
          ))}
        </div>
        <span className="ml-auto font-cond text-[15px] uppercase tracking-[0.06em] text-muted-3">
          {visiveis.length} evento{visiveis.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* DESTAQUE */}
      {destaque && (
        <section className="px-6 pb-2 pt-11 md:px-12">
          <Link
            href={`/evento/${destaque.slug}`}
            className="relative block overflow-hidden border border-white/12 bg-surface"
          >
            <div className="grid lg:grid-cols-[1.3fr_1fr]">
              <div className="relative aspect-video bg-hover-row">
                {destaque.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={destaque.bannerUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-stripes-foto" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_40%,rgba(17,17,18,0.6))]" />
                <div className="absolute left-4 top-4 -skew-x-9 bg-brand px-3.5 py-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-white">
                  <SkewTexto>◆ {destaque.aoVivo ? "Ao vivo" : "Destaque"}</SkewTexto>
                </div>
              </div>
              <div className="flex flex-col justify-center p-9 px-[38px]">
                <div className="mb-2 font-cond text-[15px] uppercase tracking-[0.1em] text-brand">
                  {destaque.dataLonga} · {destaque.cidade}
                </div>
                <div className="disp mb-3 text-[64px] leading-[0.86]">
                  {destaque.nome}
                </div>
                {destaque.descricao && (
                  <p className="mb-[22px] max-w-[400px] text-base font-medium leading-normal text-muted-2">
                    {destaque.descricao}
                  </p>
                )}
                <div className="flex items-center gap-5">
                  <span className="-skew-x-9 bg-brand px-[26px] py-3 font-cond text-[17px] font-bold uppercase tracking-[0.04em] text-white">
                    <SkewTexto>Ver evento →</SkewTexto>
                  </span>
                  <span className="font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2">
                    {destaque.inscritos > 0
                      ? `${destaque.inscritos} atleta${destaque.inscritos === 1 ? "" : "s"} confirmado${destaque.inscritos === 1 ? "" : "s"}`
                      : "Inscrições abertas"}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* GRADE */}
      <section className="px-6 pb-[90px] pt-8 md:px-12">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {grade.map((e) => (
            <Link
              key={e.slug}
              href={`/evento/${e.slug}`}
              className="flex flex-col border border-white/10 bg-surface text-foreground transition-colors hover:border-brand/55"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-hover-row">
                {e.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.bannerUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-stripes-foto" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(12,12,13,0.85))]" />
                <div
                  className={cn(
                    "absolute left-3 top-3 -skew-x-9 px-[11px] py-1 font-cond text-xs font-semibold uppercase tracking-[0.08em]",
                    e.aberto || e.aoVivo
                      ? "bg-brand text-white"
                      : "bg-white/14 text-foreground",
                  )}
                >
                  <SkewTexto>{e.status}</SkewTexto>
                </div>
                <div className="pointer-events-none absolute bottom-3 left-3.5">
                  <div className="disp text-[52px] leading-[0.8] text-white">
                    {e.dia}
                  </div>
                  <div className="font-cond text-sm uppercase tracking-[0.14em] text-brand">
                    {e.mesAno}
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-[18px] px-5">
                <div>
                  <div className="disp text-[32px] leading-[0.9]">{e.nome}</div>
                  <div className="mt-1 font-cond text-sm uppercase tracking-[0.06em] text-muted-2">
                    {e.meta}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-white/8 pt-3.5">
                  <span className="text-sm font-medium text-muted-2">
                    {e.inscritos > 0
                      ? `${e.inscritos} inscrito${e.inscritos === 1 ? "" : "s"}`
                      : "Seja o primeiro"}
                  </span>
                  <span className="font-cond text-[15px] font-bold uppercase tracking-[0.06em] text-brand">
                    {e.aberto ? "Inscrever →" : "Ver evento →"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {visiveis.length === 0 && (
          <div className="px-5 py-[70px] text-center">
            <div className="disp text-[56px] text-white/14">Nenhum evento</div>
            <p className="mt-1.5 text-base text-muted-2">
              Nenhum evento corresponde a esses filtros. Tente outra busca.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

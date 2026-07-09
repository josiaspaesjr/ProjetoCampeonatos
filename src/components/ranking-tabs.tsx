"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { LinhaRanking, RankingGeral } from "@/lib/ranking";

const ABAS: { chave: keyof RankingGeral; rotulo: string }[] = [
  { chave: "adulto", rotulo: "Adulto" },
  { chave: "master", rotulo: "Master" },
  { chave: "feminino", rotulo: "Feminino" },
];

export function RankingTabs({ dados }: { dados: RankingGeral }) {
  const [aba, setAba] = useState<keyof RankingGeral>("adulto");
  const linhas: LinhaRanking[] = dados[aba];

  return (
    <div>
      <div className="mb-6 flex gap-2 disp text-sm font-bold uppercase tracking-[0.08em]">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            onClick={() => setAba(a.chave)}
            className={cn(
              "px-4 py-2 transition-colors",
              aba === a.chave
                ? "bg-brand text-ink"
                : "border border-white/15 text-muted-2 hover:text-foreground",
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className="border">
        <div className="grid grid-cols-[70px_1fr_1fr_120px_110px] bg-[#131315] px-6 py-3.5 font-cond text-[11px] uppercase tracking-[0.12em] text-muted-2 max-md:grid-cols-[50px_1fr_90px]">
          <span>#</span>
          <span>Atleta</span>
          <span className="max-md:hidden">Equipe</span>
          <span className="max-md:hidden">Faixa</span>
          <span className="text-right">Pontos</span>
        </div>
        {linhas.length === 0 ? (
          <div className="border-t px-6 py-8 font-cond text-sm text-muted-3">
            Sem resultados nesta divisão ainda — o ranking nasce quando as
            primeiras chaves forem concluídas.
          </div>
        ) : (
          linhas.map((r, i) => (
            <div
              key={`${r.nome}-${i}`}
              className={cn(
                "grid grid-cols-[70px_1fr_1fr_120px_110px] items-center border-t border-white/6 px-6 py-4 max-md:grid-cols-[50px_1fr_90px]",
                i === 0 && "bg-brand/5",
              )}
            >
              <span
                className={cn(
                  "disp text-[22px] font-extrabold",
                  i === 0 ? "text-brand" : i < 3 ? "text-foreground" : "text-muted-2",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="disp text-lg font-semibold uppercase">
                {r.nome}
              </span>
              <span className="text-sm text-muted-2 max-md:hidden">{r.equipe}</span>
              <span className="font-cond text-xs capitalize text-text-2 max-md:hidden">
                {r.faixa}
              </span>
              <span className="text-right font-cond text-base font-medium text-brand-soft">
                {r.pontos.toLocaleString("pt-BR")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

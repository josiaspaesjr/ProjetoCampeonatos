import type { lutas } from "@/db/schema";

type LutaRow = typeof lutas.$inferSelect;

export interface AtletaInfo {
  nome: string;
  academia: string | null;
}

interface Props {
  lutas: LutaRow[];
  atletas: Record<string, AtletaInfo>;
  /** quando presente, lutas prontas exibem formulário de resultado */
  acaoResultado?: (formData: FormData) => Promise<void>;
}

const rotuloRodada = (rodada: number, total: number): string => {
  const doFim = total - rodada;
  if (doFim === 0) return "Final";
  if (doFim === 1) return "Semifinal";
  if (doFim === 2) return "Quartas";
  return `${rodada}ª rodada`;
};

const metodos: [string, string][] = [
  ["pontos", "Pontos"],
  ["vantagens", "Vantagens"],
  ["finalizacao", "Finalização"],
  ["decisao", "Decisão"],
  ["wo", "W.O."],
  ["dq", "Desqualificação"],
];

function LinhaAtleta({
  inscricaoId,
  atletas,
  vencedor,
  slotLivre,
}: {
  inscricaoId: string | null;
  atletas: Record<string, AtletaInfo>;
  vencedor: string | null;
  slotLivre: string;
}) {
  if (!inscricaoId) {
    return <p className="truncate text-xs italic text-zinc-400">{slotLivre}</p>;
  }
  const info = atletas[inscricaoId];
  const ganhou = vencedor === inscricaoId;
  const perdeu = vencedor !== null && !ganhou;
  return (
    <p
      className={`truncate text-sm ${ganhou ? "font-bold text-emerald-700" : ""} ${perdeu ? "text-zinc-400 line-through" : ""}`}
    >
      {info?.nome ?? "?"}
      {info?.academia && (
        <span className="ml-1 text-xs font-normal text-zinc-400">
          · {info.academia}
        </span>
      )}
    </p>
  );
}

export function BracketView({ lutas: linhas, atletas, acaoResultado }: Props) {
  const totalRodadas = Math.max(...linhas.map((l) => l.rodada));
  const rodadas = Array.from({ length: totalRodadas }, (_, i) =>
    linhas
      .filter((l) => l.rodada === i + 1)
      .sort((a, b) => a.posicao - b.posicao),
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6">
        {rodadas.map((lutasDaRodada, i) => (
          <div key={i} className="w-64 shrink-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {rotuloRodada(i + 1, totalRodadas)}
            </p>
            <div className="flex h-full flex-col justify-around gap-4">
              {lutasDaRodada.map((luta) => {
                const bye =
                  luta.rodada === 1 &&
                  (luta.atleta1InscricaoId === null) !==
                    (luta.atleta2InscricaoId === null);
                const pronta =
                  !bye &&
                  luta.atleta1InscricaoId &&
                  luta.atleta2InscricaoId &&
                  !luta.vencedorInscricaoId;

                return (
                  <div
                    key={luta.id}
                    className="rounded-lg border border-zinc-200 bg-white p-3"
                  >
                    <LinhaAtleta
                      inscricaoId={luta.atleta1InscricaoId}
                      atletas={atletas}
                      vencedor={luta.vencedorInscricaoId}
                      slotLivre={bye ? "bye" : "aguardando"}
                    />
                    <div className="my-1 border-t border-zinc-100" />
                    <LinhaAtleta
                      inscricaoId={luta.atleta2InscricaoId}
                      atletas={atletas}
                      vencedor={luta.vencedorInscricaoId}
                      slotLivre={bye ? "bye" : "aguardando"}
                    />

                    {luta.vencedorInscricaoId && luta.metodo && (
                      <p className="mt-2 text-xs text-zinc-400">
                        {metodos.find(([m]) => m === luta.metodo)?.[1] ?? luta.metodo}
                        {luta.nomeFinalizacao ? ` — ${luta.nomeFinalizacao}` : ""}
                      </p>
                    )}

                    {pronta && acaoResultado && (
                      <form action={acaoResultado} className="mt-3 space-y-2 border-t border-zinc-100 pt-2">
                        <input type="hidden" name="lutaId" value={luta.id} />
                        <div className="flex flex-col gap-1 text-xs">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="vencedorId"
                              value={luta.atleta1InscricaoId!}
                              required
                            />
                            {atletas[luta.atleta1InscricaoId!]?.nome}
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="radio"
                              name="vencedorId"
                              value={luta.atleta2InscricaoId!}
                            />
                            {atletas[luta.atleta2InscricaoId!]?.nome}
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <select
                            name="metodo"
                            className="w-full rounded border border-zinc-200 px-1 py-1 text-xs"
                          >
                            {metodos.map(([valor, rotulo]) => (
                              <option key={valor} value={valor}>
                                {rotulo}
                              </option>
                            ))}
                          </select>
                          <button className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700">
                            OK
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

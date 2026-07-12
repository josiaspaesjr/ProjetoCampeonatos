import type { lutas } from "@/db/schema";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { NativeSelect } from "@/components/ui/native-select";
import { idsDeBye } from "@/lib/chaves/byes";

type LutaRow = typeof lutas.$inferSelect;

export interface AtletaInfo {
  nome: string;
  academia: string | null;
}

/** rótulos traduzíveis da chave; padrão pt quando não informados */
export interface BracketLabels {
  rodadaPre: string;
  rodadaPos: string;
  final: string;
  semifinal: string;
  quartas: string;
  aguardando: string;
  bye: string;
  metodos: Record<string, string>;
}

const LABELS_PT: BracketLabels = {
  rodadaPre: "",
  rodadaPos: "ª rodada",
  final: "Final",
  semifinal: "Semifinal",
  quartas: "Quartas",
  aguardando: "aguardando",
  bye: "bye",
  metodos: {
    pontos: "Pontos",
    vantagens: "Vantagens",
    finalizacao: "Finalização",
    decisao: "Decisão",
    wo: "W.O.",
    dq: "Desqualificação",
  },
};

interface Props {
  lutas: LutaRow[];
  atletas: Record<string, AtletaInfo>;
  /** formato da chave — round robin não tem "final", só rodadas */
  formato?: string;
  /** quando presente, lutas prontas exibem formulário de resultado */
  acaoResultado?: (formData: FormData) => Promise<void>;
  /** rótulos no idioma atual (padrão pt) */
  labels?: BracketLabels;
}

const rotuloRodada = (
  rodada: number,
  total: number,
  formato: string | undefined,
  L: BracketLabels,
): string => {
  const generico = `${L.rodadaPre}${rodada}${L.rodadaPos}`;
  if (formato === "round_robin") return generico;
  const doFim = total - rodada;
  if (doFim === 0) return L.final;
  if (doFim === 1) return L.semifinal;
  if (doFim === 2) return L.quartas;
  return generico;
};

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
    return <p className="truncate text-xs italic text-muted-foreground">{slotLivre}</p>;
  }
  const info = atletas[inscricaoId];
  const ganhou = vencedor === inscricaoId;
  const perdeu = vencedor !== null && !ganhou;
  return (
    <p
      className={`truncate text-sm ${ganhou ? "font-bold text-success" : ""} ${perdeu ? "text-muted-foreground line-through" : ""}`}
    >
      {info?.nome ?? "?"}
      {info?.academia && (
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          · {info.academia}
        </span>
      )}
    </p>
  );
}

export function BracketView({
  lutas: linhas,
  atletas,
  formato,
  acaoResultado,
  labels,
}: Props) {
  const L = labels ?? LABELS_PT;
  const totalRodadas = Math.max(...linhas.map((l) => l.rodada));
  const byes = idsDeBye(
    linhas,
    formato === "round_robin" ? "round_robin" : "eliminacao_simples",
  );
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
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {rotuloRodada(i + 1, totalRodadas, formato, L)}
            </p>
            <div className="flex h-full flex-col justify-around gap-4">
              {lutasDaRodada.map((luta) => {
                const bye = byes.has(luta.id);
                const pronta =
                  !bye &&
                  luta.atleta1InscricaoId &&
                  luta.atleta2InscricaoId &&
                  !luta.vencedorInscricaoId;

                return (
                  <div key={luta.id} className="rounded-lg border bg-card p-3">
                    <LinhaAtleta
                      inscricaoId={luta.atleta1InscricaoId}
                      atletas={atletas}
                      vencedor={luta.vencedorInscricaoId}
                      slotLivre={L.aguardando}
                    />
                    <div className="my-1 border-t" />
                    {/* o slot vazio do bye é sempre o atleta2 */}
                    <LinhaAtleta
                      inscricaoId={luta.atleta2InscricaoId}
                      atletas={atletas}
                      vencedor={luta.vencedorInscricaoId}
                      slotLivre={bye ? L.bye : L.aguardando}
                    />

                    {luta.vencedorInscricaoId && luta.metodo && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {L.metodos[luta.metodo] ?? luta.metodo}
                        {luta.nomeFinalizacao ? ` — ${luta.nomeFinalizacao}` : ""}
                      </p>
                    )}

                    {pronta && acaoResultado && (
                      <form
                        action={acaoResultado}
                        className="mt-3 space-y-2 border-t pt-2"
                      >
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
                          <NativeSelect name="metodo" className="h-7 px-1 py-0 text-xs">
                            {Object.entries(L.metodos).map(([valor, rotulo]) => (
                              <option key={valor} value={valor}>
                                {rotulo}
                              </option>
                            ))}
                          </NativeSelect>
                          <BotaoAcaoBruto className="bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                            OK
                          </BotaoAcaoBruto>
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

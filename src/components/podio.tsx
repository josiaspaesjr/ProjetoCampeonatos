import type { Podio as PodioResultado } from "@/lib/bracket/types";
import type { AtletaInfo } from "@/components/bracket-view";

type TipoMedalha = "ouro" | "prata" | "bronze";

interface EstiloMedalha {
  /** gradiente do disco (medalha) */
  disco: string;
  /** cor do anel/borda do disco */
  anel: string;
  /** cor da tinta (número/texto) sobre o metal */
  tinta: string;
  /** gradiente da plataforma (degrau) */
  degrau: string;
  /** highlight do tampo do degrau */
  topo: string;
  /** brilho suave da cor da medalha */
  glow: string;
  /** altura do degrau em px (1º > 2º > 3º) */
  altura: number;
}

const MEDALHAS: Record<TipoMedalha, EstiloMedalha> = {
  ouro: {
    disco: "radial-gradient(circle at 34% 28%, #fdeeb4 0%, #f1c85a 52%, #cd9a24 100%)",
    anel: "#f7db80",
    tinta: "#5b3f05",
    degrau: "linear-gradient(180deg, #e9cd6c 0%, #b98a1f 100%)",
    topo: "#f6dd85",
    glow: "rgba(241, 200, 90, 0.33)",
    altura: 132,
  },
  prata: {
    disco: "radial-gradient(circle at 34% 28%, #f7fafc 0%, #cfd7df 52%, #99a5b0 100%)",
    anel: "#e3e9ee",
    tinta: "#454e57",
    degrau: "linear-gradient(180deg, #ccd5dd 0%, #93a0ab 100%)",
    topo: "#e8edf1",
    glow: "rgba(205, 215, 223, 0.26)",
    altura: 104,
  },
  bronze: {
    disco: "radial-gradient(circle at 34% 28%, #f2c79e 0%, #d5894f 52%, #a75f2b 100%)",
    anel: "#e6ab7a",
    tinta: "#5d3312",
    degrau: "linear-gradient(180deg, #d1935a 0%, #9f6030 100%)",
    topo: "#e3ab79",
    glow: "rgba(213, 137, 79, 0.24)",
    altura: 84,
  },
};

interface Posto {
  id: string;
  tipo: TipoMedalha;
  posicao: number;
}

export interface PodioLabels {
  podio: string;
  campeao: string;
}

/**
 * Pódio de resultado de uma chave concluída — degraus escalonados com discos
 * de medalha. Trata 0/1/2 terceiros (artes marciais podem ter dois bronzes) e
 * a ausência de 2º. A ordem no DOM é a lógica (1º → 2º → 3º) para leitores de
 * tela; a ordem visual de pódio (2º | 1º | 3º) é feita via CSS `order`.
 */
export function Podio({
  podio,
  atletas,
  labels,
}: {
  podio: PodioResultado;
  atletas: Record<string, AtletaInfo>;
  labels: PodioLabels;
}) {
  const postos: Posto[] = [];
  if (podio.primeiro) postos.push({ id: podio.primeiro, tipo: "ouro", posicao: 1 });
  if (podio.segundo) postos.push({ id: podio.segundo, tipo: "prata", posicao: 2 });
  for (const t of podio.terceiros) postos.push({ id: t, tipo: "bronze", posicao: 3 });
  if (postos.length === 0) return null;

  // ordem visual: 2º à esquerda, 1º ao centro (o mais alto), 3º(s) emoldurando
  // nas laterais — um bronze em cada ponta quando há dois (eliminação simples).
  let nb = 0;
  const postosOrdenados = postos.map((p) => {
    let order: number;
    if (p.tipo === "ouro") order = 20;
    else if (p.tipo === "prata") order = 10;
    else {
      const i = nb++;
      order = i % 2 === 0 ? 30 + i : -1 - i;
    }
    return { p, order };
  });

  return (
    <div
      className="relative overflow-hidden border border-border bg-card px-4 pb-7 pt-5 sm:px-8"
      style={{
        backgroundImage:
          "radial-gradient(130% 90% at 50% -20%, rgba(241, 200, 90, 0.10), transparent 62%)",
      }}
    >
      <div className="mb-7 flex items-center gap-2.5">
        <span aria-hidden className="text-xl">
          🏆
        </span>
        <h2 className="disp text-2xl tracking-[0.04em]">{labels.podio}</h2>
      </div>

      <ol className="flex items-end justify-center gap-[3px]">
        {postosOrdenados.map(({ p, order }) => {
          const m = MEDALHAS[p.tipo];
          const info = atletas[p.id];
          const campeao = p.tipo === "ouro";
          const nome = info?.nome ?? "—";

          return (
            <li
              key={`${p.id}-${p.posicao}-${order}`}
              className="flex min-w-0 flex-1 flex-col items-center"
              style={{ order, maxWidth: 156 }}
              aria-label={`${p.posicao} — ${nome}`}
            >
              {/* atleta acima do degrau */}
              <div className="mb-3 flex w-full flex-col items-center px-1.5 text-center">
                <span
                  aria-hidden
                  className="disp flex items-center justify-center rounded-full leading-none"
                  style={{
                    width: campeao ? 62 : 52,
                    height: campeao ? 62 : 52,
                    background: m.disco,
                    color: m.tinta,
                    boxShadow: `0 0 0 2px ${m.anel}, 0 6px 20px ${m.glow}`,
                    fontSize: campeao ? 30 : 25,
                  }}
                >
                  {p.posicao}
                </span>
                <p
                  className={`mt-2 w-full break-words font-cond font-semibold leading-tight ${
                    campeao ? "text-base sm:text-lg" : "text-sm sm:text-base"
                  }`}
                  title={nome}
                >
                  {nome}
                </p>
                {info?.academia && (
                  <p className="mt-0.5 w-full break-words text-[11px] leading-tight text-muted-2">
                    {info.academia}
                  </p>
                )}
                {campeao && (
                  <span
                    className="mt-1.5 font-cond text-[10px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: m.anel }}
                  >
                    {labels.campeao}
                  </span>
                )}
              </div>

              {/* degrau / plataforma */}
              <div
                className="disp relative flex w-full items-start justify-center overflow-hidden"
                style={{
                  height: m.altura,
                  background: m.degrau,
                  borderTop: `3px solid ${m.topo}`,
                }}
              >
                <span
                  aria-hidden
                  className="mt-2 leading-none"
                  style={{ fontSize: 46, color: m.tinta, opacity: 0.26 }}
                >
                  {p.posicao}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

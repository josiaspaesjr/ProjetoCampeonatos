export type TipoMedalha = "ouro" | "prata" | "bronze";

export interface Metal {
  /** gradiente do disco (a medalha vista de frente) */
  disco: string;
  /** cor do anel/borda do disco */
  anel: string;
  /** cor da tinta (número) sobre o metal */
  tinta: string;
  /** gradiente da plataforma (degrau do pódio) */
  degrau: string;
  /** highlight do tampo do degrau */
  topo: string;
  /** brilho suave da cor da medalha */
  glow: string;
  /** altura do degrau em px (1º > 2º > 3º) */
  altura: number;
}

/**
 * Os três metais do pódio, num lugar só.
 *
 * Vivem aqui, e não dentro de um componente, porque duas telas os usam: o
 * pódio grande da chave e a tabela de resultados do evento. Metal diferente
 * entre as duas leria como coisa diferente.
 */
export const MEDALHAS: Record<TipoMedalha, Metal> = {
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

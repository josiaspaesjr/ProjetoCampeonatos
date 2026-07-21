import { describe, expect, it } from "vitest";
import type { BracketLabels } from "@/components/bracket-view";
import {
  montarHtmlChaves,
  type AtletaImpressao,
  type ChaveImpressao,
  type LutaImpressao,
} from "./print-chaves";

const L: BracketLabels = {
  rodadaPre: "",
  rodadaPos: "ª rodada",
  final: "Final",
  semifinal: "Semifinal",
  quartas: "Quartas",
  oitavas: "Oitavas",
  campeao: "Campeão",
  jogo: "Jogo",
  dispensado: "dispensado",
  chaveVencedores: "Chave de vencedores",
  repescagem: "Repescagem",
  grandeFinal: "Grande final",
  colocacaoFinal: "Colocação final",
  grupo: "Grupo",
  playoff: "Playoff",
  vitoriasAbrev: "V",
  aguardando: "aguardando",
  bye: "bye",
  metodos: {
    pontos: "Pontos",
    finalizacao: "Finalização",
    decisao: "Decisão",
    wo: "W.O.",
    dq: "Desqualificação",
  },
};

const atletas: Record<string, AtletaImpressao> = {
  a1: { nome: "Maria Oliveira Santos", academia: "Alpha Team" },
  a2: { nome: "Ana Souza Lima", academia: "Beta JJ" },
  a3: { nome: "Juliana Pereira Costa", academia: "Gamma" },
  a4: { nome: "Larissa Souza Rodrigues", academia: "Delta" },
  b1: { nome: "Felipe Nunes", academia: "Alpha Team" },
  b2: { nome: "Bruno Alves", academia: "Beta JJ" },
  b3: { nome: "Diego Ramos", academia: "Gamma" },
  b4: { nome: "Gustavo Rocha", academia: "Delta" },
  c1: { nome: "Beatriz Teixeira Oliveira", academia: "Omega" },
  c2: { nome: "Vanessa Souza Costa", academia: "Sigma" },
  c3: { nome: "Patrícia Oliveira Souza", academia: "Zeta" },
};

/** monta uma luta com defaults (só os campos relevantes por teste) */
function luta(o: Partial<LutaImpressao> & { id: string }): LutaImpressao {
  return {
    rodada: 1,
    posicao: 0,
    fase: null,
    atleta1InscricaoId: null,
    atleta2InscricaoId: null,
    vencedorInscricaoId: null,
    proximaLutaId: null,
    proximaLutaSlot: null,
    proximaLutaPerdedorId: null,
    proximaLutaPerdedorSlot: null,
    metodo: null,
    nomeFinalizacao: null,
    ...o,
  };
}

// A — chave de 4 totalmente decidida (campeão a1)
const chaveA: ChaveImpressao = {
  id: "A",
  categoriaNome: "Adulto / Feminino / Branca / Galo (até 48.5kg)",
  faixa: "branca",
  formato: "eliminacao_simples",
  lutas: [
    luta({ id: "A1", rodada: 1, posicao: 0, atleta1InscricaoId: "a1", atleta2InscricaoId: "a2", vencedorInscricaoId: "a1", metodo: "pontos", proximaLutaId: "A3", proximaLutaSlot: 1 }),
    luta({ id: "A2", rodada: 1, posicao: 1, atleta1InscricaoId: "a3", atleta2InscricaoId: "a4", vencedorInscricaoId: "a3", metodo: "finalizacao", nomeFinalizacao: "Armlock", proximaLutaId: "A3", proximaLutaSlot: 2 }),
    luta({ id: "A3", rodada: 2, posicao: 0, atleta1InscricaoId: "a1", atleta2InscricaoId: "a3", vencedorInscricaoId: "a1", metodo: "decisao" }),
  ],
};

// B — chave de 4 com a 1ª rodada parcial → final com um slot "aguardando"
const chaveB: ChaveImpressao = {
  id: "B",
  categoriaNome: "Adulto / Masculino / Azul / Leve (até 76kg)",
  faixa: "azul",
  formato: "eliminacao_simples",
  lutas: [
    luta({ id: "B1", rodada: 1, posicao: 0, atleta1InscricaoId: "b1", atleta2InscricaoId: "b2", vencedorInscricaoId: "b1", metodo: "pontos", proximaLutaId: "B3", proximaLutaSlot: 1 }),
    luta({ id: "B2", rodada: 1, posicao: 1, atleta1InscricaoId: "b3", atleta2InscricaoId: "b4", proximaLutaId: "B3", proximaLutaSlot: 2 }),
    luta({ id: "B3", rodada: 2, posicao: 0, atleta1InscricaoId: "b1", atleta2InscricaoId: null }),
  ],
};

// C — chave de 3: 1 bye (c3 avança direto), final pendente
const chaveC: ChaveImpressao = {
  id: "C",
  categoriaNome: "Adulto / Feminino / Azul / Pena (até 58.5kg)",
  faixa: "azul",
  formato: "eliminacao_simples",
  lutas: [
    luta({ id: "C1", rodada: 1, posicao: 0, atleta1InscricaoId: "c1", atleta2InscricaoId: "c2", vencedorInscricaoId: "c1", metodo: "pontos", proximaLutaId: "C3", proximaLutaSlot: 1 }),
    luta({ id: "C2", rodada: 1, posicao: 1, atleta1InscricaoId: "c3", atleta2InscricaoId: null, vencedorInscricaoId: "c3", proximaLutaId: "C3", proximaLutaSlot: 2 }),
    luta({ id: "C3", rodada: 2, posicao: 0, atleta1InscricaoId: "c1", atleta2InscricaoId: "c3" }),
  ],
};

const opts = {
  titulo: "Chaves",
  eventoNome: "Copa Teste",
  geradoEmRotulo: "Gerado em",
  geradoEm: "21/07/2026 16:30",
  formatoNome: (f: string) => f,
  L,
};

describe("montarHtmlChaves", () => {
  const html = montarHtmlChaves([chaveA, chaveB, chaveC], atletas, opts);

  it("gera uma seção por chave (uma por página)", () => {
    expect((html.match(/class="chave"/g) ?? []).length).toBe(3);
    expect(html).toContain("Copa Teste");
    expect(html).toContain("Chaves");
  });

  it("mostra os atletas (2 primeiros nomes) e o método da vitória", () => {
    expect(html).toContain("Maria Oliveira");
    expect(html).toContain("Ana Souza");
    expect(html).toContain("Finalização — Armlock");
  });

  it("destaca o campeão só quando a final está decidida", () => {
    // A decidida → campeão Maria; B e C pendentes → sem novo troféu
    expect(html).toContain("🏆");
    expect(html).toContain("Campeão");
    expect((html.match(/class="campeao"/g) ?? []).length).toBe(1);
  });

  it("rotula a 1ª rodada de uma chave de 4 como Semifinal e a última como Final", () => {
    expect(html).toContain("Semifinal");
    expect(html).toContain("Final");
  });

  it("oculta o bye: o rótulo 'bye' não aparece e o atleta avança direto", () => {
    expect(html).not.toContain(">bye<");
    // c3 (que ganhou o bye) aparece na final
    expect(html).toContain("Patrícia Oliveira");
  });

  it("mostra 'aguardando' num slot ainda indefinido da final", () => {
    expect(html).toContain("aguardando");
  });
});

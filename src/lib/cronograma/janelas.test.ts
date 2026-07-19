import { describe, expect, it } from "vitest";
import {
  encaixarComProgresso,
  encaixarItens,
  verificarCapacidade,
  type Ancora,
  type CatCapacidade,
  type ItemProgresso,
} from "./janelas";
import type { JanelaDia } from "./dias";

const dia = (data: string, inicio: number, fim: number): JanelaDia => ({
  data,
  inicioSegundos: inicio,
  fimSegundos: fim,
});

describe("encaixarItens", () => {
  it("encaixa tudo num dia quando cabe", () => {
    const r = encaixarItens([dia("d1", 0, 3600)], [1800, 1800]);
    expect(r.map((i) => [i.diaIndex, i.inicioSegundos, i.overflow])).toEqual([
      [0, 0, false],
      [0, 1800, false],
    ]);
  });

  it("rola para o próximo dia quando a janela do dia esgota", () => {
    const r = encaixarItens(
      [dia("d1", 0, 3600), dia("d2", 0, 3600)],
      [1800, 1800, 1800],
    );
    expect(r.map((i) => [i.diaIndex, i.inicioSegundos])).toEqual([
      [0, 0],
      [0, 1800],
      [1, 0], // 3ª luta não cabe no d1 → rola inteira para o d2
    ]);
    expect(r.every((i) => !i.overflow)).toBe(true);
  });

  it("luta é atômica: não cabendo no resto do dia, rola inteira", () => {
    const r = encaixarItens([dia("d1", 0, 3600), dia("d2", 0, 3600)], [3000, 1200]);
    expect(r[1]).toMatchObject({ diaIndex: 1, inicioSegundos: 0, overflow: false });
  });

  it("marca overflow quando não há mais dias", () => {
    const r = encaixarItens([dia("d1", 0, 3600)], [3000, 1200]);
    expect(r[1]).toMatchObject({ diaIndex: 0, inicioSegundos: 3000, overflow: true });
  });

  it("luta maior que um dia inteiro marca overflow", () => {
    const r = encaixarItens([dia("d1", 0, 3600), dia("d2", 0, 3600)], [7200]);
    expect(r[0].overflow).toBe(true);
  });

  it("lista de durações vazia devolve vazio", () => {
    expect(encaixarItens([dia("d1", 0, 3600)], [])).toEqual([]);
  });

  it("âncora de início: empacota a partir dela, não do início do dia", () => {
    const r = encaixarItens([dia("d1", 0, 36000)], [1800, 1800], {
      diaIndex: 0,
      segundos: 600,
    });
    expect(r.map((i) => i.inicioSegundos)).toEqual([600, 2400]);
  });

  it("âncora além do fim de um dia intermediário rola para o próximo", () => {
    const r = encaixarItens([dia("d1", 0, 3600), dia("d2", 0, 3600)], [1800], {
      diaIndex: 0,
      segundos: 3600,
    });
    expect(r[0]).toMatchObject({ diaIndex: 1, inicioSegundos: 0 });
  });

  it("piso do dia fixado: salta para o dia mesmo com a janela anterior sobrando", () => {
    // 2 dias de 1h; 2 lutas de 15min. A 2ª é fixada no dia 1 → salta para lá,
    // mesmo cabendo no resto do dia 0 (modo "Por dia").
    const r = encaixarItens(
      [dia("d1", 0, 3600), dia("d2", 0, 3600)],
      [900, 900],
      undefined,
      [null, { diaIndex: 1, segundos: 0 }],
    );
    expect(r.map((i) => [i.diaIndex, i.inicioSegundos])).toEqual([
      [0, 0], // dia 0
      [1, 0], // fixada no dia 1 → NÃO fica em [0, 900]
    ]);
  });

  it("piso nunca volta no tempo: cursor já adiante ignora o piso", () => {
    const r = encaixarItens(
      [dia("d1", 0, 3600)],
      [900, 900],
      undefined,
      [null, { diaIndex: 0, segundos: 0 }],
    );
    expect(r[1]).toMatchObject({ diaIndex: 0, inicioSegundos: 900 });
  });

  it("pula o intervalo entre duas janelas do mesmo dia (manhã/tarde)", () => {
    // manhã 09:00–12:00 e tarde 14:00–18:00, mesma data. Lutas de 1h: 3 cabem
    // na manhã; a 4ª rola para a tarde (14:00), nunca para o intervalo (12–14).
    const manha = dia("2026-10-24", 9 * 3600, 12 * 3600);
    const tarde = dia("2026-10-24", 14 * 3600, 18 * 3600);
    const r = encaixarItens([manha, tarde], Array(4).fill(3600));
    expect(r.map((i) => [i.diaIndex, i.inicioSegundos])).toEqual([
      [0, 9 * 3600], // 09:00
      [0, 10 * 3600], // 10:00
      [0, 11 * 3600], // 11:00
      [1, 14 * 3600], // NÃO 12:00 — salta o intervalo e retoma às 14:00
    ]);
    expect(r.every((i) => !i.overflow)).toBe(true);
  });
});

describe("encaixarComProgresso", () => {
  const prog = (
    duracao: number,
    fimReal: Ancora | null = null,
    pisoDia: Ancora | null = null,
  ): ItemProgresso => ({ duracao, fimReal, pisoDia });

  it("luta encerrada cedo adianta as pendentes seguintes", () => {
    // 3 lutas de 1800s; a 1ª terminou às 600s → as seguintes partem de 600
    const janelas = [dia("d1", 0, 36000)];
    const r = encaixarComProgresso(
      janelas,
      [prog(1800, { diaIndex: 0, segundos: 600 }), prog(1800), prog(1800)],
      { diaIndex: 0, segundos: 600 },
    );
    expect(r.map((s) => [s.inicioSegundos, s.real])).toEqual([
      [600, true], // encerrada: mostra o término real
      [600, false], // pendente reancorada (estático daria 1800)
      [2400, false], // (estático daria 3600)
    ]);
  });

  it("sem nada encerrado degrada exatamente para encaixarItens", () => {
    const janelas = [dia("d1", 0, 36000), dia("d2", 0, 36000)];
    const duracoes = [1800, 1800, 1800];
    const r = encaixarComProgresso(
      janelas,
      duracoes.map((d) => prog(d)),
      { diaIndex: 0, segundos: 0 },
    );
    const base = encaixarItens(janelas, duracoes);
    expect(r.map((s) => [s.diaIndex, s.inicioSegundos])).toEqual(
      base.map((b) => [b.diaIndex, b.inicioSegundos]),
    );
    expect(r.every((s) => !s.real)).toBe(true);
  });

  it("a 1ª pendente nunca fica no passado: agora empurra o piso", () => {
    const r = encaixarComProgresso(
      [dia("d1", 0, 36000)],
      [prog(1800, { diaIndex: 0, segundos: 60 }), prog(1800)],
      { diaIndex: 0, segundos: 7200 }, // já são 02:00 de janela
    );
    expect(r[1].inicioSegundos).toBe(7200); // não 60
  });

  it("encerradas fora de ordem: cada uma mostra seu término, piso pega o maior", () => {
    const r = encaixarComProgresso(
      [dia("d1", 0, 36000)],
      [
        prog(1800, { diaIndex: 0, segundos: 1000 }),
        prog(1800, { diaIndex: 0, segundos: 500 }),
        prog(1800),
      ],
      { diaIndex: 0, segundos: 1000 },
    );
    expect(r.map((s) => s.inicioSegundos)).toEqual([1000, 500, 1000]);
    expect(r.map((s) => s.real)).toEqual([true, true, false]);
  });

  it("reajuste ao vivo respeita o intervalo: pendente rola p/ a tarde", () => {
    // manhã 09–12 e tarde 14–18. A 1ª luta encerrou 10:30; restam 2 pendentes de
    // 1h. Uma cabe na manhã (10:30–11:30); a outra não cabe até 12:00 e rola para
    // 14:00 (tarde), nunca para o intervalo (12–14). "agora" = 10:30.
    const manha = dia("2026-10-24", 9 * 3600, 12 * 3600);
    const tarde = dia("2026-10-24", 14 * 3600, 18 * 3600);
    const dez30: Ancora = { diaIndex: 0, segundos: 10 * 3600 + 1800 };
    const r = encaixarComProgresso(
      [manha, tarde],
      [prog(3600, dez30), prog(3600), prog(3600)],
      dez30,
    );
    expect(r.map((s) => [s.diaIndex, s.inicioSegundos])).toEqual([
      [0, 10 * 3600 + 1800], // encerrada 10:30 (real)
      [0, 10 * 3600 + 1800], // pendente reancora 10:30 → termina 11:30 (cabe na manhã)
      [1, 14 * 3600], // não cabe até 12:00 → tarde às 14:00 (pula o intervalo)
    ]);
  });

  it("pisoDia: pendentes fixadas no dia 2 saltam, sem nada encerrado", () => {
    // dia0 e dia1 de 1h; 3 lutas de 15min. L0 livre (dia 0); L1 e L2 fixadas no
    // dia 1 → saltam para lá, mesmo sobrando tempo no dia 0.
    const d1: Ancora = { diaIndex: 1, segundos: 0 };
    const r = encaixarComProgresso(
      [dia("d1", 0, 3600), dia("d2", 0, 3600)],
      [prog(900), prog(900, null, d1), prog(900, null, d1)],
      null,
    );
    expect(r.map((s) => [s.diaIndex, s.inicioSegundos])).toEqual([
      [0, 0], // L0 no dia 0
      [1, 0], // L1 salta para o dia 1
      [1, 900], // L2 logo após, no dia 1
    ]);
  });

  it("multi-dia: pendente que estoura o dia corrente rola inteira para o próximo", () => {
    const r = encaixarComProgresso(
      [dia("d1", 0, 3600), dia("d2", 0, 3600)],
      [prog(1800, { diaIndex: 0, segundos: 3000 }), prog(1800), prog(1800)],
      { diaIndex: 0, segundos: 3000 },
    );
    expect(r.map((s) => [s.diaIndex, s.inicioSegundos])).toEqual([
      [0, 3000], // encerrada (real) no dia 0
      [1, 0], // não cabe no resto do d0 → rola para o d1
      [1, 1800],
    ]);
  });
});

const cat = (demandaReal: number, carga = Math.max(1, demandaReal)): CatCapacidade => ({
  classeIdade: "adulto",
  sexo: "masculino",
  faixa: "branca",
  tipo: "peso",
  limitePesoKg: 70,
  carga,
  demandaReal,
});

describe("verificarCapacidade", () => {
  it("cabe quando o gargalo ≤ capacidade da área", () => {
    const r = verificarCapacidade([cat(10000), cat(10000)], 1, [dia("d", 0, 36000)]);
    expect(r.cabe).toBe(true);
    expect(r.demandaMaxSegundos).toBe(20000);
    expect(r.capacidadeAreaSegundos).toBe(36000);
  });

  it("não cabe quando excede, e sugere o nº mínimo de áreas", () => {
    const r = verificarCapacidade([cat(10000), cat(10000)], 1, [dia("d", 0, 15000)]);
    expect(r.cabe).toBe(false);
    expect(r.soAdicionandoTempo).toBe(false);
    expect(r.areasSugeridas).toBe(2); // 1 categoria por área → 10000 ≤ 15000
  });

  it("uma categoria que excede a janela só se resolve com mais tempo/dias", () => {
    const r = verificarCapacidade([cat(20000)], 5, [dia("d", 0, 15000)]);
    expect(r.cabe).toBe(false);
    expect(r.soAdicionandoTempo).toBe(true);
    expect(r.areasSugeridas).toBeNull();
    expect(r.maiorCategoriaSegundos).toBe(20000);
  });

  it("demanda real ignora o piso: categoria sem inscritos soma 0", () => {
    // cat vazia entra com carga de balanceamento 1, mas demandaReal 0
    const r = verificarCapacidade([cat(10000), cat(0, 1)], 1, [dia("d", 0, 12000)]);
    expect(r.demandaTotalSegundos).toBe(10000);
    expect(r.cabe).toBe(true);
  });

  it("janela inválida (fim ≤ início) não cabe", () => {
    const r = verificarCapacidade([cat(1000)], 1, [dia("d", 36000, 0)]);
    expect(r.capacidadeAreaSegundos).toBe(0);
    expect(r.cabe).toBe(false);
  });
});

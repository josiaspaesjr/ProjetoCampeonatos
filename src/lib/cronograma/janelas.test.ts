import { describe, expect, it } from "vitest";
import {
  encaixarItens,
  verificarCapacidade,
  type CatCapacidade,
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

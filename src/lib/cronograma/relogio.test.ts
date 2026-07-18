import { describe, expect, it } from "vitest";
import { localizarNoEixo, paredeSegundos } from "./relogio";
import type { JanelaDia } from "./dias";

const dia = (data: string, inicio: number, fim: number): JanelaDia => ({
  data,
  inicioSegundos: inicio,
  fimSegundos: fim,
});

describe("paredeSegundos", () => {
  // America/Sao_Paulo é UTC-3 estável (sem horário de verão desde 2019). Usar o
  // nome da zona (não o offset do runtime) garante o mesmo resultado em UTC.
  it("converte um instante UTC para a hora de parede BR (-03)", () => {
    const p = paredeSegundos(new Date("2026-10-24T12:00:00Z"));
    expect(p.data).toBe("2026-10-24");
    expect(p.segundos).toBe(9 * 3600); // 12:00 UTC → 09:00 em -03
  });

  it("recua o dia quando a parede cai na véspera", () => {
    const p = paredeSegundos(new Date("2026-10-24T02:00:00Z"));
    expect(p.data).toBe("2026-10-23"); // 02:00 UTC → 23:00 do dia anterior
    expect(p.segundos).toBe(23 * 3600);
  });

  it("meia-noite de parede vira 00:00, não 24:00 (hourCycle h23)", () => {
    const p = paredeSegundos(new Date("2026-10-24T03:00:00Z"));
    expect(p.data).toBe("2026-10-24");
    expect(p.segundos).toBe(0);
  });
});

describe("localizarNoEixo", () => {
  const janelas = [dia("2026-10-24", 32400, 64800)];

  it("casa a data com o dia e mantém os segundos de parede", () => {
    expect(localizarNoEixo(janelas, { data: "2026-10-24", segundos: 40000 })).toEqual({
      diaIndex: 0,
      segundos: 40000,
    });
  });

  it("antes do 1º dia: clamp no início do período", () => {
    expect(localizarNoEixo(janelas, { data: "2026-10-23", segundos: 50000 })).toEqual({
      diaIndex: 0,
      segundos: 32400,
    });
  });

  it("depois do último dia: clamp no último dia", () => {
    const multi = [dia("2026-10-24", 32400, 64800), dia("2026-10-25", 32400, 64800)];
    expect(localizarNoEixo(multi, { data: "2026-10-26", segundos: 50000 })).toEqual({
      diaIndex: 1,
      segundos: 50000,
    });
  });
});

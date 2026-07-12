import { describe, expect, it } from "vitest";
import { dentroDoPrazoDePagamento, prazoDePagamento } from "./prazo";

const d = (iso: string) => new Date(iso);

describe("prazoDePagamento", () => {
  it("usa inscricoesFecham quando definido", () => {
    const prazo = prazoDePagamento(
      { inscricoesFecham: d("2026-10-20T23:59:00Z") },
      [{ fim: d("2026-09-01T00:00:00Z") }],
    );
    expect(prazo?.toISOString()).toBe("2026-10-20T23:59:00.000Z");
  });

  it("cai no fim do último lote quando não há inscricoesFecham", () => {
    const prazo = prazoDePagamento({ inscricoesFecham: null }, [
      { fim: d("2026-08-01T00:00:00Z") },
      { fim: d("2026-10-05T00:00:00Z") },
      { fim: d("2026-09-10T00:00:00Z") },
    ]);
    expect(prazo?.toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });

  it("retorna nulo sem limite conhecido", () => {
    expect(prazoDePagamento({ inscricoesFecham: null }, [])).toBeNull();
  });
});

describe("dentroDoPrazoDePagamento", () => {
  const evento = { inscricoesFecham: d("2026-10-20T23:59:00Z") };

  it("libera antes do prazo", () => {
    expect(
      dentroDoPrazoDePagamento(evento, [], d("2026-10-19T12:00:00Z")),
    ).toBe(true);
  });

  it("bloqueia depois do prazo", () => {
    expect(
      dentroDoPrazoDePagamento(evento, [], d("2026-10-21T00:00:00Z")),
    ).toBe(false);
  });

  it("sem prazo conhecido, sempre libera", () => {
    expect(
      dentroDoPrazoDePagamento({ inscricoesFecham: null }, [], d("2030-01-01T00:00:00Z")),
    ).toBe(true);
  });
});

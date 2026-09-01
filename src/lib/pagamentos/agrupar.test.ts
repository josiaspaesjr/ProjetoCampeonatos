import { describe, expect, it } from "vitest";
import { cobrancaQueCobre } from "./agrupar";

describe("cobrancaQueCobre", () => {
  it("reaproveita a cobrança que cobre exatamente as pendentes", () => {
    const vivas = [{ id: "pag-1", inscricaoIds: ["a", "b"] }];
    expect(cobrancaQueCobre(vivas, ["a", "b"])).toBe("pag-1");
    // ordem não importa
    expect(cobrancaQueCobre(vivas, ["b", "a"])).toBe("pag-1");
  });

  it("ignora a que cobre só parte — pagar deixaria dívida em aberto", () => {
    const vivas = [{ id: "pag-1", inscricaoIds: ["a"] }];
    expect(cobrancaQueCobre(vivas, ["a", "b"])).toBeNull();
  });

  it("ignora a que cobre mais do que está pendente", () => {
    // "b" já foi paga ou cancelada: essa cobrança tem item a mais
    const vivas = [{ id: "pag-1", inscricaoIds: ["a", "b"] }];
    expect(cobrancaQueCobre(vivas, ["a"])).toBeNull();
  });

  it("acha a certa no meio de várias", () => {
    const vivas = [
      { id: "parcial", inscricaoIds: ["a"] },
      { id: "certa", inscricaoIds: ["a", "b"] },
      { id: "outra", inscricaoIds: ["c"] },
    ];
    expect(cobrancaQueCobre(vivas, ["a", "b"])).toBe("certa");
  });

  it("sem cobrança viva ou sem pendente, não há o que reaproveitar", () => {
    expect(cobrancaQueCobre([], ["a"])).toBeNull();
    expect(cobrancaQueCobre([{ id: "p", inscricaoIds: [] }], [])).toBeNull();
  });
});

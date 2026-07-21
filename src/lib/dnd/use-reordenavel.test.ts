import { describe, expect, it } from "vitest";
import { moverParaAlvo } from "./use-reordenavel";

// `alvo` é o índice de inserção (0..n) medido ANTES de remover o item — a mesma
// semântica que o cálculo por ponteiro usa (posição do indicador de drop).
describe("moverParaAlvo", () => {
  const base = ["A", "B", "C", "D"];

  it("move para baixo (A entre C e D → alvo 3)", () => {
    expect(moverParaAlvo(base, "A", 3)).toEqual(["B", "C", "A", "D"]);
  });

  it("move para o fim (A → alvo 4)", () => {
    expect(moverParaAlvo(base, "A", 4)).toEqual(["B", "C", "D", "A"]);
  });

  it("move para cima (D entre A e B → alvo 1)", () => {
    expect(moverParaAlvo(base, "D", 1)).toEqual(["A", "D", "B", "C"]);
  });

  it("move para o topo (B → alvo 0)", () => {
    expect(moverParaAlvo(base, "B", 0)).toEqual(["B", "A", "C", "D"]);
  });

  it("soltar no mesmo lugar não muda (retorna a mesma referência)", () => {
    // B (índice 1): alvo 1 (antes de si) e alvo 2 (logo após si) são no-ops
    expect(moverParaAlvo(base, "B", 1)).toBe(base);
    expect(moverParaAlvo(base, "B", 2)).toBe(base);
  });

  it("id ausente não muda", () => {
    expect(moverParaAlvo(base, "X", 2)).toBe(base);
  });

  it("preserva o conjunto (só reordena)", () => {
    const r = moverParaAlvo(base, "A", 2);
    expect([...r].sort()).toEqual([...base].sort());
    expect(r).toHaveLength(base.length);
  });
});

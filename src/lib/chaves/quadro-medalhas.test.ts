import { describe, expect, it } from "vitest";
import { quadroDeMedalhas, type PodioResolvido } from "./quadro-medalhas";

const SEM = "Sem academia";
const atleta = (nome: string, academia: string | null) => ({ nome, academia });

function podio(
  ouro: string | null,
  prata: string | null,
  bronzes: string[] = [],
): PodioResolvido {
  return {
    ouro: ouro ? atleta("A", ouro) : null,
    prata: prata ? atleta("B", prata) : null,
    bronzes: bronzes.map((a) => atleta("C", a)),
  };
}

describe("quadroDeMedalhas", () => {
  it("soma as medalhas por academia", () => {
    const q = quadroDeMedalhas(
      [podio("Alliance", "Atos", ["Checkmat", "Alliance"])],
      SEM,
    );
    expect(q).toEqual([
      { academia: "Alliance", ouro: 1, prata: 0, bronze: 1, total: 2 },
      { academia: "Atos", ouro: 0, prata: 1, bronze: 0, total: 1 },
      { academia: "Checkmat", ouro: 0, prata: 0, bronze: 1, total: 1 },
    ]);
  });

  it("ouro vence: uma prata não compensa um ouro", () => {
    const q = quadroDeMedalhas(
      [
        podio("Alliance", "Atos"),
        podio("Atos", "Atos"),
        podio("Atos", null),
      ],
      SEM,
    );
    // Atos tem mais total (4) mas Alliance… não: Atos tem 2 ouros contra 1
    expect(q[0]).toMatchObject({ academia: "Atos", ouro: 2 });
    expect(q[1]).toMatchObject({ academia: "Alliance", ouro: 1 });
  });

  it("mais total não passa na frente de mais ouro", () => {
    const q = quadroDeMedalhas(
      [
        podio("Gracie", null, []),
        podio(null, "Atos", ["Atos", "Atos"]),
      ],
      SEM,
    );
    expect(q.map((l) => l.academia)).toEqual(["Gracie", "Atos"]);
    expect(q[1].total).toBe(3);
  });

  it("empate em tudo ordena pelo nome", () => {
    const q = quadroDeMedalhas([podio("Zenith", "Alliance")], SEM);
    const so1Ouro = quadroDeMedalhas(
      [podio("Zenith", null), podio("Alliance", null)],
      SEM,
    );
    expect(q).toHaveLength(2);
    expect(so1Ouro.map((l) => l.academia)).toEqual(["Alliance", "Zenith"]);
  });

  it("atleta sem academia entra num balde próprio", () => {
    // academia nula e string vazia caem no mesmo balde
    const q = quadroDeMedalhas(
      [
        { ouro: atleta("A", null), prata: null, bronzes: [] },
        { ouro: null, prata: atleta("B", "   "), bronzes: [] },
      ],
      SEM,
    );
    expect(q).toEqual([
      { academia: SEM, ouro: 1, prata: 1, bronze: 0, total: 2 },
    ]);
  });

  it("sem pódio, quadro vazio", () => {
    expect(quadroDeMedalhas([], SEM)).toEqual([]);
  });
});

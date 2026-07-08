import { describe, expect, it } from "vitest";
import { CLASSES_IDADE, FAIXAS, gerarGrade, tabelaPesos } from "./cbjj";
import { categoriaCompativel } from "./elegibilidade";

describe("classes infantis", () => {
  it("cobrem 4 a 15 anos sem buracos nem sobreposição", () => {
    const kids = ["pre_mirim", "mirim", "infantil", "infanto_juvenil"].map(
      (id) => CLASSES_IDADE.find((c) => c.id === id)!,
    );
    expect(kids.every(Boolean)).toBe(true);
    for (let idade = 4; idade <= 15; idade++) {
      const compativeis = kids.filter(
        (c) => idade >= c.idadeMin && idade <= (c.idadeMax ?? 999),
      );
      expect(compativeis).toHaveLength(1);
    }
  });

  it("progressão de faixas IBJJF por classe", () => {
    const faixasDe = (id: string) =>
      CLASSES_IDADE.find((c) => c.id === id)!.faixas;
    expect(faixasDe("pre_mirim")).toEqual(["branca", "cinza"]);
    expect(faixasDe("mirim")).toContain("amarela");
    expect(faixasDe("mirim")).not.toContain("laranja");
    expect(faixasDe("infantil")).toContain("laranja");
    expect(faixasDe("infantil")).not.toContain("verde");
    expect(faixasDe("infanto_juvenil")).toContain("verde");
    expect(faixasDe("infanto_juvenil")).not.toContain("azul");
  });

  it("tabelas de peso kids são crescentes e terminam sem limite", () => {
    for (const classe of ["pre_mirim", "mirim", "infantil", "infanto_juvenil"]) {
      const pesos = tabelaPesos(classe, "masculino");
      expect(pesos.length).toBeGreaterThanOrEqual(6);
      for (let i = 1; i < pesos.length - 1; i++) {
        expect(pesos[i].limiteKg!).toBeGreaterThan(pesos[i - 1].limiteKg!);
      }
      expect(pesos.at(-1)!.limiteKg).toBeNull();
      // kids: mesma tabela para ambos os sexos
      expect(tabelaPesos(classe, "feminino")).toEqual(pesos);
    }
  });
});

describe("gerarGrade com kids", () => {
  it("classe kids só gera as faixas permitidas para ela", () => {
    const grade = gerarGrade({
      classes: ["pre_mirim"],
      sexos: ["masculino"],
      faixas: FAIXAS, // todas marcadas — o filtro é da classe
      incluirAbsoluto: false,
    });
    const faixasGeradas = new Set(grade.map((c) => c.faixa));
    expect(faixasGeradas).toEqual(new Set(["branca", "cinza"]));
    // 2 faixas × 7 pesos do pré-mirim
    expect(grade).toHaveLength(14);
    expect(grade[0].idadeMin).toBe(4);
    expect(grade[0].idadeMax).toBe(6);
  });

  it("faixa adulta não vaza para classe kids nem o contrário", () => {
    const grade = gerarGrade({
      classes: ["mirim", "adulto"],
      sexos: ["masculino"],
      faixas: ["cinza", "roxa"],
      incluirAbsoluto: false,
    });
    for (const cat of grade) {
      if (cat.classeIdade === "mirim") expect(cat.faixa).toBe("cinza");
      if (cat.classeIdade === "adulto") expect(cat.faixa).toBe("roxa");
    }
    expect(grade.some((c) => c.classeIdade === "mirim")).toBe(true);
    expect(grade.some((c) => c.classeIdade === "adulto")).toBe(true);
  });

  it("elegibilidade: criança de 8 anos faixa cinza cai só na categoria mirim", () => {
    const grade = gerarGrade({
      classes: ["pre_mirim", "mirim", "infantil"],
      sexos: ["masculino"],
      faixas: ["cinza"],
      incluirAbsoluto: false,
    });
    const compativeis = grade.filter((c) =>
      categoriaCompativel(
        { sexo: c.sexo, faixa: c.faixa, idadeMin: c.idadeMin, idadeMax: c.idadeMax },
        { sexo: "masculino", faixa: "cinza", idade: 8 },
      ),
    );
    expect(compativeis.length).toBeGreaterThan(0);
    expect(new Set(compativeis.map((c) => c.classeIdade))).toEqual(new Set(["mirim"]));
  });
});

import { describe, expect, it } from "vitest";
import { blocosPorGrupo } from "./blocos";
import type { AreaCron, CategoriaCron } from "./cronograma-areas";

/** categoria mínima — só o que `blocosPorGrupo` lê */
function cat(over: Partial<CategoriaCron>): CategoriaCron {
  return {
    categoriaId: "c",
    grupoChave: "adulto|masculino|branca",
    grupoRotulo: "Adulto · Masculino · Branca",
    faixa: "branca",
    titulo: "",
    subtitulo: "",
    hora: "10:00",
    data: "2026-10-30",
    dataLabel: "30/10",
    diaIndex: 0,
    diaNumero: 1,
    nLutas: 3,
    chaveGerada: false,
    atletas: [],
    lutas: [],
    ...over,
  };
}

function area(nome: string, categorias: CategoriaCron[]): AreaCron {
  return {
    id: nome,
    nome,
    dataLabel: "30/10",
    inicio: "09:00",
    fim: "17:00",
    dias: [],
    totalCats: categorias.length,
    totalGrupos: new Set(categorias.map((c) => c.grupoChave)).size,
    categorias,
  };
}

const BRANCA = "adulto|masculino|branca";
const AZUL = "adulto|masculino|azul";

describe("blocosPorGrupo", () => {
  it("junta as categorias do mesmo grupo num bloco só", () => {
    const blocos = blocosPorGrupo([
      area("Área 01", [
        cat({ grupoChave: BRANCA, hora: "10:00" }),
        cat({ grupoChave: BRANCA, hora: "10:20" }),
      ]),
    ]);
    expect(blocos).toHaveLength(1);
    expect(blocos[0].hora).toBe("10:00");
  });

  it("o bloco herda a hora da categoria mais cedo, mesmo em outro tatame", () => {
    const blocos = blocosPorGrupo([
      area("Área 01", [cat({ grupoChave: BRANCA, hora: "11:00" })]),
      area("Área 02", [cat({ grupoChave: BRANCA, hora: "09:30" })]),
    ]);
    expect(blocos[0].hora).toBe("09:30");
    expect(blocos[0].areas).toEqual(["Área 01", "Área 02"]);
  });

  it("dia mais cedo vence hora menor de um dia posterior", () => {
    const blocos = blocosPorGrupo([
      area("Área 01", [
        cat({ grupoChave: BRANCA, data: "2026-10-31", hora: "08:00", dataLabel: "31/10" }),
      ]),
      area("Área 02", [
        cat({ grupoChave: BRANCA, data: "2026-10-30", hora: "16:00", dataLabel: "30/10" }),
      ]),
    ]);
    expect(blocos[0]).toMatchObject({ data: "2026-10-30", hora: "16:00" });
  });

  it("ordena por dia e hora", () => {
    const blocos = blocosPorGrupo([
      area("Área 01", [
        cat({ grupoChave: AZUL, hora: "11:00", grupoRotulo: "Adulto · Masculino · Azul" }),
        cat({ grupoChave: BRANCA, hora: "09:00" }),
      ]),
    ]);
    expect(blocos.map((b) => b.rotulo)).toEqual([
      "Adulto · Masculino · Branca",
      "Adulto · Masculino · Azul",
    ]);
  });

  it("não repete o mesmo tatame na lista de áreas", () => {
    const blocos = blocosPorGrupo([
      area("Área 01", [
        cat({ grupoChave: BRANCA, hora: "10:00" }),
        cat({ grupoChave: BRANCA, hora: "10:30" }),
      ]),
    ]);
    expect(blocos[0].areas).toEqual(["Área 01"]);
  });

  it("sem áreas, sem blocos", () => {
    expect(blocosPorGrupo([])).toEqual([]);
  });
});

describe("blocosPorGrupo — divisões vazias", () => {
  it("divisão sem luta fica de fora", () => {
    // o motor não encaixa categoria vazia: ela cai na abertura do dia e
    // apareceria marcando o horário de início junto com todo mundo
    const blocos = blocosPorGrupo([
      area("Área 01", [
        cat({ grupoChave: BRANCA, hora: "09:00", nLutas: 0 }),
        cat({ grupoChave: AZUL, hora: "10:00", nLutas: 4, grupoRotulo: "Adulto · Masculino · Azul" }),
      ]),
    ]);
    expect(blocos.map((b) => b.rotulo)).toEqual(["Adulto · Masculino · Azul"]);
  });

  it("soma as lutas do bloco espalhado em vários tatames", () => {
    const blocos = blocosPorGrupo([
      area("Área 01", [cat({ grupoChave: BRANCA, hora: "10:00", nLutas: 3 })]),
      area("Área 02", [cat({ grupoChave: BRANCA, hora: "09:30", nLutas: 5 })]),
    ]);
    expect(blocos[0].nLutas).toBe(8);
    expect(blocos[0].hora).toBe("09:30");
  });

  it("grade inteira vazia não gera bloco nenhum", () => {
    const blocos = blocosPorGrupo([
      area("Área 01", [
        cat({ grupoChave: BRANCA, nLutas: 0 }),
        cat({ grupoChave: AZUL, nLutas: 0 }),
      ]),
    ]);
    expect(blocos).toEqual([]);
  });
});

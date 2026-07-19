import { describe, expect, it } from "vitest";
import { linhasDoCronograma } from "./botao-imprimir-programa";
import type { AreaCron, CategoriaCron } from "@/lib/cronograma/cronograma-areas";

const cat = (o: Partial<CategoriaCron>): CategoriaCron =>
  ({
    grupoChave: "",
    faixa: null,
    titulo: "",
    subtitulo: "",
    hora: "09:00",
    data: "",
    dataLabel: "",
    diaIndex: 0,
    diaNumero: 1,
    nLutas: 0,
    chaveGerada: false,
    atletas: [],
    lutas: [],
    ...o,
  }) as CategoriaCron;

const area = (nome: string, cats: CategoriaCron[]): AreaCron =>
  ({
    id: nome,
    nome,
    dataLabel: "",
    inicio: "",
    fim: "",
    dias: [],
    totalCats: cats.length,
    totalGrupos: 0,
    categorias: cats,
  }) as AreaCron;

describe("linhasDoCronograma (programação imprimível)", () => {
  it("achata as áreas e ordena por (dia, hora, área)", () => {
    const crono: AreaCron[] = [
      area("Área 02", [
        cat({ diaNumero: 2, dataLabel: "25/10", hora: "09:00", titulo: "Marrom" }),
      ]),
      area("Área 01", [
        cat({ diaNumero: 1, dataLabel: "24/10", hora: "09:00", titulo: "Azul" }),
        cat({ diaNumero: 2, dataLabel: "25/10", hora: "09:00", titulo: "Roxa" }),
      ]),
    ];
    const linhas = linhasDoCronograma(crono);
    expect(linhas.map((l) => [l.diaNumero, l.hora, l.area, l.titulo])).toEqual([
      [1, "09:00", "Área 01", "Azul"], // dia 1 primeiro
      [2, "09:00", "Área 01", "Roxa"], // dia 2, mesma hora: Área 01 antes de Área 02
      [2, "09:00", "Área 02", "Marrom"],
    ]);
  });

  it("ordena por hora dentro do mesmo dia/área", () => {
    const crono: AreaCron[] = [
      area("Área 01", [
        cat({ diaNumero: 1, hora: "11:30", titulo: "B" }),
        cat({ diaNumero: 1, hora: "09:00", titulo: "A" }),
      ]),
    ];
    expect(linhasDoCronograma(crono).map((l) => l.titulo)).toEqual(["A", "B"]);
  });
});

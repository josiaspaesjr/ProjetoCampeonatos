import { describe, expect, it } from "vitest";
import { lerDiasDoForm, validarDias } from "./dias-form";

/** monta um FormData com arrays paralelos diaData/diaInicio/diaFim */
function form(linhas: [data: string, inicio: string, fim: string][]): FormData {
  const fd = new FormData();
  for (const [data, inicio, fim] of linhas) {
    fd.append("diaData", data);
    fd.append("diaInicio", inicio);
    fd.append("diaFim", fim);
  }
  return fd;
}

describe("lerDiasDoForm", () => {
  it("mantém duas janelas no mesmo dia (manhã/tarde) — não deduplica", () => {
    const dias = lerDiasDoForm(
      form([
        ["2026-07-23", "09:00", "12:00"],
        ["2026-07-23", "14:00", "18:00"],
      ]),
    );
    expect(dias).toEqual([
      { data: "2026-07-23", inicioMinutos: 540, fimMinutos: 720 },
      { data: "2026-07-23", inicioMinutos: 840, fimMinutos: 1080 },
    ]);
  });

  it("ordena por (data, início): manhã antes da tarde, dia 1 antes do dia 2", () => {
    const dias = lerDiasDoForm(
      form([
        ["2026-07-24", "14:00", "18:00"],
        ["2026-07-23", "14:00", "18:00"],
        ["2026-07-23", "09:00", "12:00"],
      ]),
    );
    expect(dias.map((d) => [d.data, d.inicioMinutos])).toEqual([
      ["2026-07-23", 540],
      ["2026-07-23", 840],
      ["2026-07-24", 840],
    ]);
  });

  it("ignora linhas em branco", () => {
    const dias = lerDiasDoForm(
      form([
        ["2026-07-23", "09:00", "12:00"],
        ["", "14:00", "18:00"],
      ]),
    );
    expect(dias).toHaveLength(1);
  });
});

describe("validarDias", () => {
  it("aceita duas janelas do mesmo dia com intervalo entre elas", () => {
    expect(
      validarDias([
        { data: "2026-07-23", inicioMinutos: 540, fimMinutos: 720 },
        { data: "2026-07-23", inicioMinutos: 840, fimMinutos: 1080 },
      ]),
    ).toBeNull();
  });

  it("rejeita janelas do mesmo dia que se sobrepõem", () => {
    expect(
      validarDias([
        { data: "2026-07-23", inicioMinutos: 540, fimMinutos: 780 }, // 09–13
        { data: "2026-07-23", inicioMinutos: 720, fimMinutos: 1080 }, // 12–18
      ]),
    ).toBe("diaJanelaSobreposta");
  });

  it("rejeita janela inválida (fim ≤ início)", () => {
    expect(
      validarDias([{ data: "2026-07-23", inicioMinutos: 720, fimMinutos: 540 }]),
    ).toBe("diaJanelaInvalida");
  });

  it("rejeita lista vazia", () => {
    expect(validarDias([])).toBe("diasObrigatorio");
  });
});

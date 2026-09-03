import { describe, expect, it } from "vitest";
import {
  PAPEIS,
  SECOES,
  normalizarPermissoes,
  papelDe,
  permissoesDoForm,
  primeiraSecao,
  temAcesso,
} from "./permissoes";

describe("normalizarPermissoes", () => {
  it("trata nulo como acesso total (convites anteriores às permissões)", () => {
    expect(normalizarPermissoes(null)).toEqual([...SECOES]);
    expect(normalizarPermissoes(undefined)).toEqual([...SECOES]);
  });

  it("descarta seções desconhecidas e repetidas", () => {
    expect(normalizarPermissoes(["chaves", "chaves", "hackear", 7])).toEqual([
      "chaves",
    ]);
  });

  it("devolve na ordem canônica, não na ordem recebida", () => {
    expect(normalizarPermissoes(["checkin", "evento", "chaves"])).toEqual([
      "evento",
      "chaves",
      "checkin",
    ]);
  });

  it("lista vazia é lista vazia — não vira acesso total", () => {
    expect(normalizarPermissoes([])).toEqual([]);
  });
});

describe("papelDe", () => {
  it("reconhece o papel pelo conjunto exato de seções, em qualquer ordem", () => {
    expect(papelDe(["areas", "chaves"])).toBe("mesario");
    expect(papelDe([...SECOES])).toBe("total");
  });

  it("combinação fora dos presets não tem papel", () => {
    expect(papelDe(["chaves"])).toBeNull();
    expect(papelDe(["chaves", "areas", "lotes"])).toBeNull();
  });
});

describe("temAcesso", () => {
  it("mesário abre chaves e áreas, mas não inscrições", () => {
    const mesario = [...PAPEIS.mesario];
    expect(temAcesso(mesario, "chaves")).toBe(true);
    expect(temAcesso(mesario, "areas")).toBe(true);
    expect(temAcesso(mesario, "inscricoes")).toBe(false);
    expect(temAcesso(mesario, "evento")).toBe(false);
  });
});

describe("primeiraSecao", () => {
  it("segue a ordem do menu, não a ordem da lista", () => {
    expect(primeiraSecao(["checkin", "chaves"])).toBe("chaves");
    expect(primeiraSecao([])).toBeUndefined();
  });
});

describe("permissoesDoForm", () => {
  it("lê as checkboxes marcadas", () => {
    const fd = new FormData();
    fd.append("permissoes", "chaves");
    fd.append("permissoes", "areas");
    expect(permissoesDoForm(fd)).toEqual(["chaves", "areas"]);
  });

  it("form sem nenhuma marcada não vira acesso total", () => {
    expect(permissoesDoForm(new FormData())).toEqual([]);
  });
});

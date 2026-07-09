import { describe, expect, it } from "vitest";
import {
  SECOES_REGULAMENTO,
  lerRegulamentoDoForm,
  secoesPreenchidas,
} from "./regulamento";

describe("regulamento", () => {
  it("tem exatamente as 16 seções esperadas, com texto padrão não vazio", () => {
    expect(SECOES_REGULAMENTO).toHaveLength(16);
    for (const s of SECOES_REGULAMENTO) {
      expect(s.chave).toBeTruthy();
      expect(s.titulo).toBeTruthy();
      expect(s.textoPadrao.trim().length).toBeGreaterThan(20);
    }
    // chaves únicas
    const chaves = new Set(SECOES_REGULAMENTO.map((s) => s.chave));
    expect(chaves.size).toBe(16);
  });

  it("lerRegulamentoDoForm guarda só as seções preenchidas (trim)", () => {
    const fd = new FormData();
    fd.set("reg_regrasInscricao", "  Inscrições até 3 dias antes.  ");
    fd.set("reg_pesagem", "   "); // só espaços → ignorado
    fd.set("reg_premiacao", "Medalhas para os 3 primeiros.");
    fd.set("outro_campo", "ignorar");

    const reg = lerRegulamentoDoForm(fd);
    expect(reg).toEqual({
      regrasInscricao: "Inscrições até 3 dias antes.",
      premiacao: "Medalhas para os 3 primeiros.",
    });
  });

  it("lerRegulamentoDoForm retorna null quando nada foi preenchido", () => {
    const fd = new FormData();
    fd.set("reg_pesagem", "");
    expect(lerRegulamentoDoForm(fd)).toBeNull();
  });

  it("secoesPreenchidas devolve título+texto na ordem canônica", () => {
    // premiacao vem depois de regrasInscricao na ordem das seções
    const reg = {
      premiacao: "Pódio e medalhas.",
      regrasInscricao: "Prazo e dados corretos.",
    };
    const lista = secoesPreenchidas(reg);
    expect(lista.map((s) => s.titulo)).toEqual([
      "Regras de inscrição",
      "Premiação",
    ]);
    expect(lista[0].texto).toBe("Prazo e dados corretos.");
  });

  it("secoesPreenchidas ignora nulo e seções vazias", () => {
    expect(secoesPreenchidas(null)).toEqual([]);
    expect(secoesPreenchidas({ pesagem: "   " })).toEqual([]);
  });
});

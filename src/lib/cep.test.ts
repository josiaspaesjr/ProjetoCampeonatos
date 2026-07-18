import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarCep } from "./cep";

function mockFetch(resposta: {
  ok?: boolean;
  status?: number;
  json?: unknown;
}) {
  const fn = vi.fn().mockResolvedValue({
    ok: resposta.ok ?? true,
    status: resposta.status ?? 200,
    json: async () => resposta.json,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("buscarCep", () => {
  it("mapeia a resposta do ViaCEP para o endereço", async () => {
    const fetchMock = mockFetch({
      json: {
        logradouro: "Praça da Sé",
        bairro: "Sé",
        localidade: "São Paulo",
        uf: "SP",
      },
    });
    const end = await buscarCep("01001-000");
    expect(end).toEqual({
      logradouro: "Praça da Sé",
      bairro: "Sé",
      cidade: "São Paulo",
      uf: "SP",
    });
    // consulta só os dígitos, sem máscara
    expect(fetchMock).toHaveBeenCalledWith(
      "https://viacep.com.br/ws/01001000/json/",
      expect.any(Object),
    );
  });

  it("retorna null quando o CEP não existe (erro do ViaCEP)", async () => {
    mockFetch({ json: { erro: true } });
    expect(await buscarCep("00000-000")).toBeNull();
  });

  it("não consulta e retorna null quando não há 8 dígitos", async () => {
    const fetchMock = mockFetch({ json: {} });
    expect(await buscarCep("0100")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CEP geral (sem logradouro/bairro) volta com esses campos vazios", async () => {
    mockFetch({ json: { localidade: "Brasília", uf: "DF" } });
    expect(await buscarCep("70000-000")).toEqual({
      logradouro: "",
      bairro: "",
      cidade: "Brasília",
      uf: "DF",
    });
  });

  it("lança quando a resposta HTTP não é ok", async () => {
    mockFetch({ ok: false, status: 500, json: {} });
    await expect(buscarCep("01001-000")).rejects.toThrow();
  });
});

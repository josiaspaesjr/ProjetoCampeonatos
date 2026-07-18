/**
 * Consulta de CEP (endereço brasileiro) via ViaCEP.
 * Sem chave, com CORS liberado — pode ser chamado direto do browser.
 */

import { soDigitos } from "./cpf";

export interface EnderecoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface ViaCepResposta {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

/**
 * Busca um CEP no ViaCEP e devolve o endereço.
 *
 * - Retorna `null` se o CEP não tiver 8 dígitos ou não existir.
 * - Lança em falha de rede / requisição abortada (o chamador deve tratar).
 *
 * CEPs "gerais" (um único CEP para a cidade toda) vêm sem logradouro/bairro:
 * nesses casos os campos voltam como string vazia, e cabe ao chamador não
 * sobrescrever o que o usuário já tiver digitado.
 */
export async function buscarCep(
  cep: string,
  signal?: AbortSignal,
): Promise<EnderecoCep | null> {
  const digitos = soDigitos(cep);
  if (digitos.length !== 8) return null;

  const resp = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
    signal,
  });
  if (!resp.ok) throw new Error(`ViaCEP respondeu ${resp.status}`);

  const data = (await resp.json()) as ViaCepResposta;
  if (!data || data.erro) return null;

  return {
    logradouro: data.logradouro ?? "",
    bairro: data.bairro ?? "",
    cidade: data.localidade ?? "",
    uf: data.uf ?? "",
  };
}

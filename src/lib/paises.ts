/**
 * Lista de países para inscrição/filtro (código ISO 3166-1 alpha-2 + nome PT-BR).
 * O código é o que fica gravado em `inscricoes.pais` (snapshot); o padrão é BR.
 * Cobre as nações mais comuns no jiu-jitsu; dá para estender à vontade.
 */
export interface Pais {
  codigo: string;
  nome: string;
}

export const PAISES: Pais[] = [
  { codigo: "BR", nome: "Brasil" },
  { codigo: "US", nome: "Estados Unidos" },
  { codigo: "PT", nome: "Portugal" },
  { codigo: "AR", nome: "Argentina" },
  { codigo: "GB", nome: "Reino Unido" },
  { codigo: "IE", nome: "Irlanda" },
  { codigo: "ES", nome: "Espanha" },
  { codigo: "FR", nome: "França" },
  { codigo: "DE", nome: "Alemanha" },
  { codigo: "IT", nome: "Itália" },
  { codigo: "NL", nome: "Países Baixos" },
  { codigo: "BE", nome: "Bélgica" },
  { codigo: "CH", nome: "Suíça" },
  { codigo: "AT", nome: "Áustria" },
  { codigo: "SE", nome: "Suécia" },
  { codigo: "NO", nome: "Noruega" },
  { codigo: "FI", nome: "Finlândia" },
  { codigo: "DK", nome: "Dinamarca" },
  { codigo: "PL", nome: "Polônia" },
  { codigo: "CZ", nome: "Chéquia" },
  { codigo: "GR", nome: "Grécia" },
  { codigo: "RU", nome: "Rússia" },
  { codigo: "UA", nome: "Ucrânia" },
  { codigo: "CA", nome: "Canadá" },
  { codigo: "MX", nome: "México" },
  { codigo: "CO", nome: "Colômbia" },
  { codigo: "CL", nome: "Chile" },
  { codigo: "PE", nome: "Peru" },
  { codigo: "UY", nome: "Uruguai" },
  { codigo: "PY", nome: "Paraguai" },
  { codigo: "VE", nome: "Venezuela" },
  { codigo: "EC", nome: "Equador" },
  { codigo: "BO", nome: "Bolívia" },
  { codigo: "CR", nome: "Costa Rica" },
  { codigo: "PA", nome: "Panamá" },
  { codigo: "DO", nome: "República Dominicana" },
  { codigo: "GT", nome: "Guatemala" },
  { codigo: "AU", nome: "Austrália" },
  { codigo: "NZ", nome: "Nova Zelândia" },
  { codigo: "JP", nome: "Japão" },
  { codigo: "KR", nome: "Coreia do Sul" },
  { codigo: "CN", nome: "China" },
  { codigo: "TH", nome: "Tailândia" },
  { codigo: "PH", nome: "Filipinas" },
  { codigo: "ID", nome: "Indonésia" },
  { codigo: "IN", nome: "Índia" },
  { codigo: "AE", nome: "Emirados Árabes Unidos" },
  { codigo: "SA", nome: "Arábia Saudita" },
  { codigo: "QA", nome: "Catar" },
  { codigo: "IL", nome: "Israel" },
  { codigo: "TR", nome: "Turquia" },
  { codigo: "EG", nome: "Egito" },
  { codigo: "MA", nome: "Marrocos" },
  { codigo: "ZA", nome: "África do Sul" },
  { codigo: "AO", nome: "Angola" },
  { codigo: "MZ", nome: "Moçambique" },
  { codigo: "CV", nome: "Cabo Verde" },
];

const POR_CODIGO = new Map(PAISES.map((p) => [p.codigo, p]));

/** código válido? (existe na lista) */
export const paisValido = (codigo: string) => POR_CODIGO.has(codigo);

/** normaliza um código recebido: maiúsculo e válido, senão BR (padrão) */
export function normalizarPais(codigo: string | null | undefined): string {
  const c = (codigo ?? "").trim().toUpperCase();
  return POR_CODIGO.has(c) ? c : "BR";
}

/** nome PT-BR do país (ou o próprio código se desconhecido) */
export const nomePais = (codigo: string) =>
  POR_CODIGO.get(codigo)?.nome ?? codigo;

/** bandeira emoji a partir do código ISO alpha-2 */
export function bandeiraPais(codigo: string): string {
  if (!/^[A-Za-z]{2}$/.test(codigo)) return "";
  const base = 0x1f1e6;
  const cc = codigo.toUpperCase();
  return String.fromCodePoint(
    base + cc.charCodeAt(0) - 65,
    base + cc.charCodeAt(1) - 65,
  );
}

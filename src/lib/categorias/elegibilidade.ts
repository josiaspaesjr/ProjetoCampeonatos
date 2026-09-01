/**
 * Regra CBJJ: a idade do atleta é a que ele completa no ano do evento
 * (ano do evento menos ano de nascimento), não a idade na data da luta.
 */
export function idadeNoAnoDoEvento(
  dataNascimento: string,
  dataEvento: string,
): number {
  return (
    new Date(`${dataEvento}T12:00:00`).getFullYear() -
    new Date(`${dataNascimento}T12:00:00`).getFullYear()
  );
}

interface CategoriaElegivel {
  sexo: string;
  faixa: string | null;
  idadeMin: number | null;
  idadeMax: number | null;
}

interface PerfilAtleta {
  sexo: string;
  faixa: string;
  idade: number;
}

/**
 * Masters aninham para baixo por escolha do atleta (um Master 3 pode lutar
 * no Adulto), então só o limite mínimo de idade é eliminatório junto com o
 * máximo. Faixa precisa bater exatamente; categoria sem faixa (custom) aceita
 * qualquer uma.
 */
export function categoriaCompativel(
  cat: CategoriaElegivel,
  atleta: PerfilAtleta,
): boolean {
  if (cat.sexo !== atleta.sexo) return false;
  if (cat.faixa && cat.faixa !== atleta.faixa) return false;
  if (cat.idadeMin != null && atleta.idade < cat.idadeMin) return false;
  if (cat.idadeMax != null && atleta.idade > cat.idadeMax) return false;
  return true;
}

interface CategoriaAbsoluto {
  classeIdade: string;
}

/**
 * Qual absoluto acompanha a categoria de peso escolhida.
 *
 * Masters aninham para baixo (um master 1 pode lutar o adulto), então o atleta
 * pode ter mais de um absoluto compatível — e o certo é o da mesma classe da
 * categoria que ele escolheu. Sem um da classe, devolve o primeiro compatível:
 * o atleta pediu absoluto, então dar algum é melhor do que engolir o pedido.
 */
export function absolutoDaCategoria<T extends CategoriaAbsoluto>(
  absolutos: T[],
  classeIdadeEscolhida: string,
): T | null {
  if (absolutos.length === 0) return null;
  return (
    absolutos.find((a) => a.classeIdade === classeIdadeEscolhida) ?? absolutos[0]
  );
}

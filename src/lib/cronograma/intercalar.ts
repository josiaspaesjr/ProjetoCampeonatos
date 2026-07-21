/**
 * Intercalação das lutas de uma área para dar descanso aos atletas — função
 * pura, sem banco.
 *
 * Por padrão cada categoria correria inteira (todas as suas lutas em sequência).
 * Em chaves pequenas/com bye (o caso clássico é a chave de 3: L1 = A×B → V; L2 =
 * V × C) e nas fases finais, isso faz o vencedor de uma luta cair imediatamente
 * na seguinte, sem descanso.
 *
 * O "lutar seguido" é estrutural: as lutas de fase ≥ 2 nascem sem atletas
 * (`atleta*InscricaoId = null`, "A definir") até o resultado anterior avançar.
 * Logo, todo o risco de repetição mora nas lutas **indefinidas** — quando uma
 * delas roda logo após uma luta da própria categoria, o vencedor emenda.
 *
 * INVARIANTE: toda luta **indefinida** deve vir logo após uma luta **definida de
 * OUTRA categoria**. Esse separador envolve atletas distintos → garante ≥ 1 luta
 * de descanso. Mantém as categorias compactas (só puxa um separador quando
 * precisa) — diferente do "intercalar por camada", que jogava até a final de uma
 * chave minúscula lá pro fim.
 */

/** o mínimo que o motor precisa saber de cada luta para intercalar */
export interface UnidadeIntercalavel {
  /** identidade da categoria — lutas da MESMA categoria não se separam entre si */
  catId: string;
  /** dia fixado (modo "Por dia"); dias diferentes NÃO se misturam (null = auto) */
  dataFixada: string | null;
  /** tem slot "A definir" (fase ≥ 2): não pode emendar uma luta que a alimenta */
  indefinida: boolean;
  /** pode servir de separador: luta real com os dois atletas definidos. Lutas
   *  estimadas (categoria sem chave) são inertes — nem separam nem são separadas */
  separadora: boolean;
}

/**
 * Reordena as unidades de uma área dando descanso: mantém a ordem-base (categoria
 * a categoria, ordem da chave dentro de cada) e só insere um separador antes de
 * uma luta indefinida que cairia logo após outra indefinida OU após uma luta da
 * própria categoria. Respeita os dias: unidades de `dataFixada` diferentes não se
 * misturam (cada dia é intercalado à parte, na ordem em que os dias aparecem — a
 * ordem do dia, já refletida em `ordemNaArea`). É o ponto de entrada usado pelos
 * dois motores (cronograma e fila) → mesma ordem nos dois.
 */
export function intercalarComDescanso<T extends UnidadeIntercalavel>(
  unidades: T[],
): T[] {
  const ordemDias: (string | null)[] = [];
  const porDia = new Map<string | null, T[]>();
  for (const u of unidades) {
    let grupo = porDia.get(u.dataFixada);
    if (!grupo) {
      grupo = [];
      porDia.set(u.dataFixada, grupo);
      ordemDias.push(u.dataFixada);
    }
    grupo.push(u);
  }
  return ordemDias.flatMap((d) => mesclarComDescanso(porDia.get(d) ?? []));
}

/**
 * Merge greedy de um único dia. Emite as unidades na ordem-base; antes de uma
 * indefinida que violaria o descanso, puxa a próxima definida de outra categoria
 * como separador. Sem separador disponível (só resta uma categoria), emite mesmo
 * assim — o back-to-back é inevitável ali. O(n²) no tamanho da área (dezenas de
 * lutas), custo desprezível.
 */
function mesclarComDescanso<T extends UnidadeIntercalavel>(base: T[]): T[] {
  const restante = base.slice();
  const saida: T[] = [];
  let anterior: T | null = null;
  while (restante.length > 0) {
    const proxima = restante[0];
    // a luta anterior já dá descanso? (separadora real de OUTRA categoria →
    // atletas distintos). Se der, a indefinida pode entrar sem novo separador.
    const anteriorDescansa =
      anterior !== null &&
      anterior.separadora &&
      anterior.catId !== proxima.catId;
    if (proxima.indefinida && anterior !== null && !anteriorDescansa) {
      const idxSep = restante.findIndex(
        (u) => u.separadora && u.catId !== proxima.catId,
      );
      if (idxSep >= 0) {
        const [separador] = restante.splice(idxSep, 1);
        saida.push(separador);
        anterior = separador;
        continue;
      }
      // sem separadora de outra categoria sobrando → inevitável, emite abaixo
    }
    saida.push(proxima);
    restante.shift();
    anterior = proxima;
  }
  return saida;
}

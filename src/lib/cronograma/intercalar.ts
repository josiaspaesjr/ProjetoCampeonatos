/**
 * Intercalação das lutas de uma área para dar descanso aos atletas — funções
 * puras, sem banco.
 *
 * Por padrão cada categoria correria inteira (todas as suas lutas em sequência).
 * Em chaves pequenas/com bye (o caso clássico é a chave de 3: L1 = A×B → V; L2 =
 * V × C) e em toda a eliminação dupla, isso faz o vencedor de uma luta cair
 * imediatamente na seguinte, sem descanso. Intercalando as CAMADAS (fases de
 * disputa) de categorias diferentes, entre duas fases da mesma categoria sempre
 * correm lutas de outras — o atleta não luta duas vezes seguidas.
 *
 * O "lutar seguido" é estrutural: as lutas de rodada ≥ 2 nascem sem atletas
 * (`atleta*InscricaoId = null`) até o resultado anterior avançar, então o
 * back-to-back nunca é entre categorias (atletas distintos) — é sempre entre uma
 * luta e a luta seguinte do vencedor, na MESMA chave. Separar as camadas resolve.
 */

import { idsDeBye } from "@/lib/chaves/byes";
import {
  classificarEliminacaoDupla,
  nivelDisputaEliminacaoDupla,
  prioridadeFaseDupla,
} from "@/lib/chaves/eliminacao-dupla";

/** campos de uma luta usados para agrupar em camadas topológicas */
export interface LutaEmCamada {
  id: string;
  rodada: number;
  posicao: number;
  fase: string | null;
  vencedorInscricaoId: string | null;
  atleta1InscricaoId: string | null;
  atleta2InscricaoId: string | null;
  proximaLutaId: string | null;
  proximaLutaSlot: number | null;
  proximaLutaPerdedorId: string | null;
  proximaLutaPerdedorSlot: number | null;
}

/**
 * Agrupa as lutas de UMA chave em camadas topológicas (fases de disputa), na
 * ordem em que correm. A camada de cada luta é a rodada (eliminação simples) ou
 * o nível de disputa topológico (eliminação dupla, onde a rodada crua não serve —
 * a grande final é guardada como "rodada 1"). Byes e, na dupla, lutas
 * mortas/walkover são descartados (não são lutas de fato). Dentro de cada camada
 * as lutas ficam em ordem (fase, rodada, posição), a mesma dos dois motores.
 *
 * O array é COMPACTADO: cada elemento é uma camada que TEM lutas, em ordem
 * crescente — sem buracos quando uma camada inteira foi decidida e excluída
 * (`incluirDecididas: false`), para a fila ao vivo não deixar a categoria "presa"
 * numa camada alta. `incluirDecididas`: a fila do telão só quer as pendentes; o
 * cronograma completo mostra também as encerradas (com placar).
 */
export function agruparEmCamadas<T extends LutaEmCamada>(
  linhas: T[],
  formato: string,
  { incluirDecididas }: { incluirDecididas: boolean },
): T[][] {
  const dupla = formato === "eliminacao_dupla";
  const reais = dupla ? classificarEliminacaoDupla(linhas).reais : null;
  const byes = dupla ? new Set<string>() : idsDeBye(linhas, formato);
  const nivel = dupla ? nivelDisputaEliminacaoDupla(linhas) : null;

  const camadas = new Map<number, T[]>();
  for (const luta of linhas) {
    if (byes.has(luta.id)) continue;
    if (reais && !reais.has(luta.id)) continue; // dupla: pula bye/walkover/morta
    if (!incluirDecididas && luta.vencedorInscricaoId) continue;
    const c = nivel ? (nivel.get(luta.id) ?? 0) : luta.rodada;
    const grupo = camadas.get(c) ?? [];
    grupo.push(luta);
    camadas.set(c, grupo);
  }

  const chaveOrdem = (l: T): number[] =>
    dupla
      ? [prioridadeFaseDupla(l.fase), l.rodada, l.posicao]
      : [l.rodada, l.posicao];

  return [...camadas.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, g]) =>
      g.sort((p, q) => {
        const kp = chaveOrdem(p);
        const kq = chaveOrdem(q);
        for (let i = 0; i < kp.length; i++)
          if (kp[i] !== kq[i]) return kp[i] - kq[i];
        return 0;
      }),
    );
}

/**
 * Intercala as lutas de várias categorias de uma área para dar descanso: em vez
 * de correr cada categoria inteira, alterna as CAMADAS (fases topológicas) — a
 * 1ª fase de todas as categorias, depois a 2ª de todas, etc. Assim, entre duas
 * fases da mesma categoria (onde o vencedor de uma luta cai na seguinte) correm
 * lutas de outras categorias, e o atleta não luta duas vezes seguidas.
 * Generaliza o antigo `intercalarPorRodada` ("slice" do telão): tamanhos iguais
 * casam perfeitamente e tamanhos/faixas diferentes também funcionam.
 *
 * `gruposPorCategoria[i][k]` = lutas da camada k da categoria i, na ordem de
 * disputa (ver `agruparEmCamadas`). As categorias vêm na ordem do dia
 * (`ordemNaArea`), que serve de desempate e mantém a intenção das ondas. A
 * topologia é respeitada: a camada k+1 de uma categoria só entra depois da k
 * dela. Com a ordem fixa das categorias por camada, a última luta de uma camada
 * e a primeira da seguinte nunca são da mesma categoria enquanto houver ≥ 2
 * categorias vivas — então nenhum back-to-back evitável é introduzido.
 *
 * Limite: quando só uma categoria ainda tem lutas (as outras terminaram —
 * tipicamente as fases finais da maior chave da área), não há como intercalar e
 * as lutas restantes dela correm em sequência. É inerente: sem outra categoria
 * de tamanho comparável rodando junto, a semi→final não tem como descansar.
 */
export function intercalarComDescanso<T>(gruposPorCategoria: T[][][]): T[] {
  const resultado: T[] = [];
  const maisCamadas = Math.max(0, ...gruposPorCategoria.map((g) => g.length));
  for (let camada = 0; camada < maisCamadas; camada++) {
    for (const grupos of gruposPorCategoria) {
      if (grupos[camada]) resultado.push(...grupos[camada]);
    }
  }
  return resultado;
}

/**
 * Intercala as categorias de uma área respeitando os dias: categorias fixadas em
 * dias diferentes (`dataFixada`, modo "Por dia") NÃO se misturam — cada dia é
 * intercalado à parte, na ordem em que os dias aparecem (a ordem do dia, já
 * refletida em `ordemNaArea`). No modo automático (`dataFixada` nula) tudo cai
 * num único grupo e intercala junto. É o ponto de entrada usado pelos dois
 * motores (cronograma e fila) — mesma ordem nos dois.
 */
export function intercalarCategorias<T>(
  categorias: { dataFixada: string | null; camadas: T[][] }[],
): T[] {
  const ordemDias: (string | null)[] = [];
  const porDia = new Map<string | null, T[][][]>();
  for (const c of categorias) {
    let grupos = porDia.get(c.dataFixada);
    if (!grupos) {
      grupos = [];
      porDia.set(c.dataFixada, grupos);
      ordemDias.push(c.dataFixada);
    }
    grupos.push(c.camadas);
  }
  return ordemDias.flatMap((d) => intercalarComDescanso(porDia.get(d) ?? []));
}

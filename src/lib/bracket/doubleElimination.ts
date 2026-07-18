import { agruparPorChave, criarRng, embaralhar } from "./rng";
import type {
  Chave,
  Inscrito,
  Luta,
  MetodoVitoria,
  OpcoesGeracao,
  Podio,
} from "./types";

/**
 * Eliminação dupla — chave de vencedores (WB) + chave de perdedores (LB) +
 * grande final (GF). Quem perde na WB cai na LB; só está fora quem perde duas
 * vezes. Sem "bracket reset": a GF é uma única luta (WB champ × LB champ).
 * Pódio: 1º campeão da GF, 2º vice da GF, 3º perdedor da final da LB.
 *
 * Usa seeding padrão em potência de 2 (byes só na 1ª rodada da WB), então toda
 * a cascata de byes é determinada pelo sorteio e resolvida por ponto-fixo na
 * geração; nas rodadas seguintes só há avanço de 1 salto (vencedor + perdedor),
 * exceto quando um perdedor cai numa luta cujo outro lado está "morto" (vazio),
 * virando um walkover — o mesmo ponto-fixo reaproveitado cobre esse caso.
 */

/** ordem de seeds num bracket de tamanho `size` (potência de 2): 1, size, ... */
export function ordemSeeds(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const n = seeds.length * 2;
    const prox: number[] = [];
    for (const s of seeds) prox.push(s, n + 1 - s);
    seeds = prox;
  }
  return seeds;
}

const chaveSlot = (id: string, slot: 1 | 2) => `${id}#${slot}`;

function slotsAlimentados(lutas: Luta[]): Set<string> {
  const s = new Set<string>();
  for (const l of lutas) {
    if (l.proximaLutaId && l.proximaLutaSlot)
      s.add(chaveSlot(l.proximaLutaId, l.proximaLutaSlot));
    if (l.proximaLutaPerdedorId && l.proximaLutaPerdedorSlot)
      s.add(chaveSlot(l.proximaLutaPerdedorId, l.proximaLutaPerdedorSlot));
  }
  return s;
}

/**
 * Resolve byes/vazios por ponto-fixo. Idempotente e função pura do estado
 * atual: recomputa quais slots estão "mortos" (nunca receberão atleta) e avança
 * os byes (walkovers), marcando bye=true. Reaproveitado na geração e a cada
 * resultado registrado.
 */
export function resolverByes(lutas: Luta[]): void {
  const porId = new Map(lutas.map((l) => [l.id, l]));
  const alimentado = slotsAlimentados(lutas);
  const morto = new Set<string>();
  const atletaEm = (l: Luta, slot: 1 | 2) => (slot === 1 ? l.atleta1 : l.atleta2);
  const setAtleta = (id: string, slot: 1 | 2, atleta: string) => {
    const l = porId.get(id);
    if (!l) return;
    if (slot === 1) l.atleta1 = atleta;
    else l.atleta2 = atleta;
  };

  for (const l of lutas) {
    for (const slot of [1, 2] as const) {
      if (!atletaEm(l, slot) && !alimentado.has(chaveSlot(l.id, slot))) {
        morto.add(chaveSlot(l.id, slot));
      }
    }
  }
  // byes JÁ resolvidos (de chamadas anteriores) não entregam perdedor: o slot
  // de destino do perdedor deles segue morto. Sem isto, uma chamada nova (estado
  // reconstruído) perderia essa informação e travaria a cascata da LB.
  for (const l of lutas) {
    const umAtleta = (l.atleta1 === null) !== (l.atleta2 === null);
    if (l.vencedor && umAtleta && l.proximaLutaPerdedorId && l.proximaLutaPerdedorSlot) {
      morto.add(chaveSlot(l.proximaLutaPerdedorId, l.proximaLutaPerdedorSlot));
    }
  }
  const ehMorto = (l: Luta, slot: 1 | 2) =>
    !atletaEm(l, slot) && morto.has(chaveSlot(l.id, slot));

  const resolvidas = new Set<string>();
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const l of lutas) {
      if (l.vencedor || resolvidas.has(l.id)) continue;
      const a1 = l.atleta1;
      const a2 = l.atleta2;
      if (a1 && a2) continue; // luta real pendente
      const d1 = ehMorto(l, 1);
      const d2 = ehMorto(l, 2);
      const matarPerdedor = () => {
        if (l.proximaLutaPerdedorId && l.proximaLutaPerdedorSlot)
          morto.add(chaveSlot(l.proximaLutaPerdedorId, l.proximaLutaPerdedorSlot));
      };
      if (a1 && d2) {
        l.vencedor = a1;
        l.bye = true;
        if (l.proximaLutaId && l.proximaLutaSlot)
          setAtleta(l.proximaLutaId, l.proximaLutaSlot, a1);
        matarPerdedor();
        mudou = true;
      } else if (a2 && d1) {
        l.vencedor = a2;
        l.bye = true;
        if (l.proximaLutaId && l.proximaLutaSlot)
          setAtleta(l.proximaLutaId, l.proximaLutaSlot, a2);
        matarPerdedor();
        mudou = true;
      } else if (d1 && d2) {
        // luta vazia (nunca terá atletas): propaga "morto" aos destinos
        resolvidas.add(l.id);
        if (l.proximaLutaId && l.proximaLutaSlot)
          morto.add(chaveSlot(l.proximaLutaId, l.proximaLutaSlot));
        matarPerdedor();
        mudou = true;
      }
    }
  }
}

export function gerarEliminacaoDupla(
  inscritos: Inscrito[],
  opcoes: OpcoesGeracao,
): Chave {
  if (inscritos.length < 3) {
    throw new Error("Eliminação dupla exige ao menos 3 atletas");
  }
  if (new Set(inscritos.map((i) => i.id)).size !== inscritos.length) {
    throw new Error("Inscritos com id duplicado");
  }

  const rng = criarRng(opcoes.seed);
  const N = inscritos.length;
  let k = 1;
  while (1 << k < N) k++;
  const size = 1 << k;

  const ordem = ordemSeeds(size);
  // agrupa por academia → seeds consecutivos → seeding padrão espalha por quartas
  const sorteados =
    opcoes.separarAcademias ?? true
      ? agruparPorChave(inscritos, rng, (a, i) => a.academiaId ?? `_${i}`)
      : embaralhar(inscritos, rng);
  const slots = ordem.map((s) => (s <= N ? sorteados[s - 1].id : null));

  const lutas: Luta[] = [];
  const nova = (id: string, rodada: number, posicao: number, fase: string): Luta => {
    const l: Luta = {
      id,
      rodada,
      posicao,
      atleta1: null,
      atleta2: null,
      proximaLutaId: null,
      proximaLutaSlot: null,
      proximaLutaPerdedorId: null,
      proximaLutaPerdedorSlot: null,
      fase,
      vencedor: null,
      metodo: null,
      bye: false,
    };
    lutas.push(l);
    return l;
  };

  // --- WB: rodadas 1..k ---
  const wb: Luta[][] = [];
  for (let r = 1; r <= k; r++) {
    const col: Luta[] = [];
    for (let p = 0; p < size >> r; p++) col.push(nova(`wb-${r}-${p}`, r, p, "wb"));
    wb.push(col);
  }
  for (let p = 0; p < wb[0].length; p++) {
    wb[0][p].atleta1 = slots[2 * p];
    wb[0][p].atleta2 = slots[2 * p + 1];
  }
  for (let r = 1; r < k; r++) {
    for (let p = 0; p < wb[r - 1].length; p++) {
      wb[r - 1][p].proximaLutaId = wb[r][p >> 1].id;
      wb[r - 1][p].proximaLutaSlot = ((p % 2) + 1) as 1 | 2;
    }
  }

  // --- LB: rodadas 1..2(k-1) ---
  const lbRounds = 2 * (k - 1);
  const lb: Luta[][] = [];
  for (let lr = 1; lr <= lbRounds; lr++) {
    const j = Math.ceil(lr / 2);
    const col: Luta[] = [];
    for (let p = 0; p < 1 << (k - 1 - j); p++)
      col.push(nova(`lb-${lr}-${p}`, lr, p, "lb"));
    lb.push(col);
  }
  // WB R1 → LB R1 (dois perdedores por luta da LB)
  for (let m = 0; m < lb[0].length; m++) {
    wb[0][2 * m].proximaLutaPerdedorId = lb[0][m].id;
    wb[0][2 * m].proximaLutaPerdedorSlot = 1;
    wb[0][2 * m + 1].proximaLutaPerdedorId = lb[0][m].id;
    wb[0][2 * m + 1].proximaLutaPerdedorSlot = 2;
  }
  // pares (minor 2j-1, major 2j) para j=1..k-1
  for (let j = 1; j <= k - 1; j++) {
    const minor = lb[2 * j - 2]; // rodada 2j-1
    const major = lb[2 * j - 1]; // rodada 2j
    // vencedor do minor → major slot1 (sobrevivente)
    for (let m = 0; m < minor.length; m++) {
      minor[m].proximaLutaId = major[m].id;
      minor[m].proximaLutaSlot = 1;
    }
    // perdedores da WB R(j+1) → major slot2 (invertidos, p/ adiar revanche)
    const wbCol = wb[j];
    for (let i = 0; i < wbCol.length; i++) {
      wbCol[i].proximaLutaPerdedorId = major[major.length - 1 - i].id;
      wbCol[i].proximaLutaPerdedorSlot = 2;
    }
    // vencedor do major → próximo minor (ou GF, tratado abaixo)
    if (2 * j < lbRounds) {
      const proxMinor = lb[2 * j]; // rodada 2j+1
      for (let m = 0; m < major.length; m++) {
        major[m].proximaLutaId = proxMinor[m >> 1].id;
        major[m].proximaLutaSlot = ((m % 2) + 1) as 1 | 2;
      }
    }
  }

  // --- Grande final ---
  const gf = nova("gf", 1, 0, "gf");
  wb[k - 1][0].proximaLutaId = gf.id;
  wb[k - 1][0].proximaLutaSlot = 1;
  const lbFinal = lb[lbRounds - 1][0];
  lbFinal.proximaLutaId = gf.id;
  lbFinal.proximaLutaSlot = 2;

  resolverByes(lutas);

  const rodadas = Math.max(...lutas.map((l) => l.rodada));
  return { formato: "eliminacao_dupla", seed: opcoes.seed, rodadas, lutas };
}

const acharGF = (chave: Chave): Luta | undefined =>
  chave.lutas.find((l) => l.fase === "gf");
const acharLbFinal = (chave: Chave, gfId: string | undefined): Luta | undefined =>
  chave.lutas.find((l) => l.fase === "lb" && l.proximaLutaId === gfId);

/**
 * Registra o resultado de uma luta: avança o vencedor e o perdedor, e resolve
 * eventuais walkovers criados (perdedor que cai num slot "morto"). Correção
 * permitida só enquanto os destinos (vencedor/perdedor) ainda não decidiram.
 */
export function registrarResultadoEliminacaoDupla(
  chave: Chave,
  lutaId: string,
  vencedorId: string,
  metodo: MetodoVitoria,
): Chave {
  const nova: Chave = structuredClone(chave);
  const porId = new Map(nova.lutas.map((l) => [l.id, l]));
  const luta = porId.get(lutaId);
  if (!luta) throw new Error(`Luta não encontrada: ${lutaId}`);
  if (luta.bye) throw new Error("Luta decidida por bye não recebe resultado");
  if (!luta.atleta1 || !luta.atleta2) {
    throw new Error("A luta ainda não tem os dois atletas definidos");
  }
  if (vencedorId !== luta.atleta1 && vencedorId !== luta.atleta2) {
    throw new Error("O vencedor precisa ser um dos atletas da luta");
  }
  // correção: bloqueia se algum destino (vencedor/perdedor) já decidiu
  if (luta.vencedor) {
    const destinos = [luta.proximaLutaId, luta.proximaLutaPerdedorId]
      .map((id) => (id ? porId.get(id) : undefined))
      .filter((l): l is Luta => !!l);
    if (destinos.some((d) => d.vencedor)) {
      throw new Error(
        "Resultado não pode ser corrigido: uma luta seguinte já foi decidida",
      );
    }
  }

  luta.vencedor = vencedorId;
  luta.metodo = metodo;
  const perdedor = vencedorId === luta.atleta1 ? luta.atleta2! : luta.atleta1!;
  const set = (id: string | null | undefined, slot: 1 | 2 | null | undefined, at: string) => {
    if (!id || !slot) return;
    const alvo = porId.get(id);
    if (!alvo) return;
    if (slot === 1) alvo.atleta1 = at;
    else alvo.atleta2 = at;
  };
  set(luta.proximaLutaId, luta.proximaLutaSlot, vencedorId);
  set(luta.proximaLutaPerdedorId, luta.proximaLutaPerdedorSlot, perdedor);

  resolverByes(nova.lutas);
  return nova;
}

/** true quando a grande final foi decidida. */
export function eliminacaoDuplaConcluida(chave: Chave): boolean {
  return acharGF(chave)?.vencedor != null;
}

/** Pódio: 1º campeão da GF, 2º vice da GF, 3º perdedor da final da LB. */
export function podioEliminacaoDupla(chave: Chave): Podio {
  const gf = acharGF(chave);
  const lbFinal = acharLbFinal(chave, gf?.id);
  const perdedorDe = (l: Luta | undefined): string | null =>
    !l || l.vencedor === null || l.bye
      ? null
      : l.vencedor === l.atleta1
        ? l.atleta2
        : l.atleta1;
  const terceiro = perdedorDe(lbFinal);
  return {
    primeiro: gf?.vencedor ?? null,
    segundo: perdedorDe(gf),
    terceiros: terceiro ? [terceiro] : [],
  };
}

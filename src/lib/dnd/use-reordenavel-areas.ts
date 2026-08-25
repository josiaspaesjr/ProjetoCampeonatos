"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { moverParaAlvo } from "./use-reordenavel";

/** posição de destino durante o arraste: coluna + índice de inserção */
export interface AlvoArraste {
  colunaId: string;
  index: number;
}

/** o que aconteceu ao soltar */
export interface Soltura {
  itemId: string;
  origemId: string;
  destinoId: string;
  /** ordem final da coluna de destino (já com o item no lugar) */
  ordemDestino: string[];
}

/**
 * Reordenação por arraste entre **várias colunas** (Pointer Events: mouse e
 * toque). Cada coluna registra seu container e suas linhas
 * (`data-ordenavel-id`); ao arrastar, a coluna sob o ponteiro vira o destino e
 * o índice sai do Y, igual à versão de lista única.
 *
 * Mantém a ordem otimista de todas as colunas e chama `aoSoltar` com o item, a
 * coluna de origem, a de destino e a ordem final do destino — soltar na mesma
 * coluna é só uma reordenação (origem === destino).
 */
export function useReordenavelAreas(
  colunasIniciais: Record<string, string[]>,
  aoSoltar: (s: Soltura) => void,
) {
  const [ordens, setOrdens] = useState<Record<string, string[]>>(colunasIniciais);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [alvo, setAlvoEstado] = useState<AlvoArraste | null>(null);

  const containers = useRef(new Map<string, HTMLElement>());
  const ordensRef = useRef(ordens);
  const alvoRef = useRef<AlvoArraste | null>(null);
  const arrastando = useRef<string | null>(null);
  const handlers = useRef<{ move?: (e: PointerEvent) => void; up?: () => void }>({});

  useEffect(() => {
    ordensRef.current = ordens;
  }, [ordens]);

  // ressincroniza com o servidor quando o CONJUNTO de lutas muda (nova chave,
  // luta encerrada, troca de área feita em outra tela) — nunca por reordenação,
  // que já está aplicada localmente antes da revalidação chegar.
  const assinatura = Object.entries(colunasIniciais)
    .map(([id, ids]) => `${id}:${[...ids].sort().join(",")}`)
    .sort()
    .join("|");
  const assinaturaRef = useRef(assinatura);
  useEffect(() => {
    if (arrastandoId) return;
    if (assinaturaRef.current !== assinatura) {
      assinaturaRef.current = assinatura;
      setOrdens(colunasIniciais);
    }
  }, [assinatura, colunasIniciais, arrastandoId]);

  useEffect(
    () => () => {
      const { move, up } = handlers.current;
      if (move) window.removeEventListener("pointermove", move);
      if (up) {
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      }
    },
    [],
  );

  /** registra (ou remove) o container de uma coluna */
  const registrarColuna = useCallback(
    (colunaId: string) => (el: HTMLElement | null) => {
      if (el) containers.current.set(colunaId, el);
      else containers.current.delete(colunaId);
    },
    [],
  );

  const setAlvo = (a: AlvoArraste | null) => {
    alvoRef.current = a;
    setAlvoEstado(a);
  };

  /** coluna sob o ponteiro (por X, com folga vertical) — null fora de todas */
  function colunaEm(x: number, y: number): string | null {
    let candidato: string | null = null;
    for (const [id, el] of containers.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right) {
        candidato = id;
        // dentro na vertical também: escolha exata
        if (y >= r.top - 80 && y <= r.bottom + 80) return id;
      }
    }
    return candidato;
  }

  /** índice de inserção dentro da coluna, a partir do Y do ponteiro */
  function indiceEm(colunaId: string, clientY: number): number {
    const el = containers.current.get(colunaId);
    if (!el) return 0;
    const linhas = Array.from(
      el.querySelectorAll<HTMLElement>("[data-ordenavel-id]"),
    );
    for (let i = 0; i < linhas.length; i++) {
      const r = linhas[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return linhas.length;
  }

  function calcularAlvo(x: number, y: number, origemId: string): AlvoArraste {
    const colunaId = colunaEm(x, y) ?? origemId;
    return { colunaId, index: indiceEm(colunaId, y) };
  }

  const iniciarArraste = (id: string, origemId: string) => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    arrastando.current = id;
    setArrastandoId(id);
    setAlvo(calcularAlvo(e.clientX, e.clientY, origemId));

    const move = (ev: PointerEvent) => {
      if (!arrastando.current) return;
      setAlvo(calcularAlvo(ev.clientX, ev.clientY, origemId));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      handlers.current = {};
      const itemId = arrastando.current;
      const destino = alvoRef.current;
      arrastando.current = null;
      setArrastandoId(null);
      setAlvo(null);
      if (!itemId || !destino) return;

      const atual = ordensRef.current;
      // mesma coluna: reordenação simples
      if (destino.colunaId === origemId) {
        const nova = moverParaAlvo(atual[origemId] ?? [], itemId, destino.index);
        if (nova === (atual[origemId] ?? [])) return; // soltou no mesmo lugar
        const proximo = { ...atual, [origemId]: nova };
        ordensRef.current = proximo;
        setOrdens(proximo);
        aoSoltar({ itemId, origemId, destinoId: origemId, ordemDestino: nova });
        return;
      }

      // outra coluna: sai da origem e entra na posição indicada do destino
      const origem = (atual[origemId] ?? []).filter((v) => v !== itemId);
      const alvoLista = [...(atual[destino.colunaId] ?? [])];
      const at = Math.max(0, Math.min(destino.index, alvoLista.length));
      alvoLista.splice(at, 0, itemId);
      const proximo = { ...atual, [origemId]: origem, [destino.colunaId]: alvoLista };
      ordensRef.current = proximo;
      setOrdens(proximo);
      aoSoltar({
        itemId,
        origemId,
        destinoId: destino.colunaId,
        ordemDestino: alvoLista,
      });
    };

    handlers.current = { move, up };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return { ordens, arrastandoId, alvo, registrarColuna, iniciarArraste };
}

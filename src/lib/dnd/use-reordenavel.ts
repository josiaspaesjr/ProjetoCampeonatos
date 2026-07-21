"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Move `id` para o índice de inserção `alvo` (0..n), medido ANTES de remover o
 * item da lista. Retorna a MESMA referência quando nada muda (soltar no lugar).
 */
export function moverParaAlvo(
  ordem: string[],
  id: string,
  alvo: number,
): string[] {
  const de = ordem.indexOf(id);
  if (de === -1) return ordem;
  // remover o item desloca em -1 tudo o que vem depois dele
  const para = de < alvo ? alvo - 1 : alvo;
  if (para === de) return ordem;
  const nova = [...ordem];
  nova.splice(de, 1);
  nova.splice(para, 0, id);
  return nova;
}

/**
 * Lista vertical reordenável por arraste, com **Pointer Events** (mouse e toque
 * de forma uniforme — sem dependência externa nem HTML5 drag, que não pega em
 * toque). Mantém a ordem otimista localmente e chama `aoSoltar(novaOrdem)`
 * quando o usuário solta numa posição diferente.
 *
 * Uso: espalhe `containerRef` no elemento que embrulha as linhas; cada linha
 * deve ter `data-ordenavel-id={id}`. Ligue `iniciarArraste(id)` ao
 * `onPointerDown` da alça (a alça deve ter `touch-action: none`). Renderize a
 * ordem em `ordem`, o indicador de destino em `alvoIndex` e o realce da linha
 * arrastada em `arrastandoId`.
 */
export function useReordenavel<E extends HTMLElement = HTMLElement>(
  idsIniciais: string[],
  aoSoltar: (novaOrdem: string[]) => void,
) {
  const [ordem, setOrdem] = useState<string[]>(idsIniciais);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [alvoIndex, setAlvoIndex] = useState<number | null>(null);

  const containerRef = useRef<E | null>(null);
  const ordemRef = useRef(ordem);
  const alvoRef = useRef<number | null>(null);
  const arrastando = useRef<string | null>(null);
  const handlers = useRef<{ move?: (e: PointerEvent) => void; up?: () => void }>({});

  // espelha a ordem num ref para o handler de soltar ler o valor corrente
  useEffect(() => {
    ordemRef.current = ordem;
  }, [ordem]);

  // re-sincroniza com o servidor só quando o CONJUNTO de lutas muda (lutas
  // criadas/removidas, troca de área…) — NUNCA por causa da reordenação em si.
  // Enquanto edita, a ordem local é a fonte da verdade: sincronizar pela ordem
  // faria a luta "voltar" ao soltar, porque os props revalidados chegam depois
  // do update otimista (assinatura por ordem ficaria momentaneamente diferente).
  const conjunto = [...idsIniciais].sort().join(",");
  const conjuntoRef = useRef(conjunto);
  useEffect(() => {
    if (arrastandoId) return;
    if (conjuntoRef.current !== conjunto) {
      conjuntoRef.current = conjunto;
      setOrdem(idsIniciais);
    }
  }, [conjunto, idsIniciais, arrastandoId]);

  // remove listeners pendentes ao desmontar
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

  const setAlvo = (n: number | null) => {
    alvoRef.current = n;
    setAlvoIndex(n);
  };

  /** índice de inserção a partir do Y do ponteiro (antes da 1ª linha cujo meio
   *  fica abaixo do ponteiro; senão, no fim) */
  function calcularAlvo(clientY: number): number {
    const container = containerRef.current;
    if (!container) return 0;
    const linhas = Array.from(
      container.querySelectorAll<HTMLElement>("[data-ordenavel-id]"),
    );
    for (let i = 0; i < linhas.length; i++) {
      const r = linhas[i].getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return linhas.length;
  }

  const iniciarArraste = (id: string) => (e: React.PointerEvent) => {
    // só botão principal do mouse; toque/caneta sempre
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    arrastando.current = id;
    setArrastandoId(id);
    setAlvo(calcularAlvo(e.clientY));

    const move = (ev: PointerEvent) => {
      if (!arrastando.current) return;
      setAlvo(calcularAlvo(ev.clientY));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      handlers.current = {};
      const arrastadoId = arrastando.current;
      const alvo = alvoRef.current;
      arrastando.current = null;
      setArrastandoId(null);
      setAlvo(null);
      if (!arrastadoId || alvo == null) return;

      const nova = moverParaAlvo(ordemRef.current, arrastadoId, alvo);
      if (nova === ordemRef.current) return; // soltou no mesmo lugar
      ordemRef.current = nova;
      setOrdem(nova);
      aoSoltar(nova);
    };

    handlers.current = { move, up };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return { ordem, arrastandoId, alvoIndex, containerRef, iniciarArraste };
}

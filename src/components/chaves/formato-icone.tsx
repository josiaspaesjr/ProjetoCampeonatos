import type { ReactNode } from "react";
import type { FormatoChaveId, FormatoSelecionavel } from "@/lib/bracket";
import { cn } from "@/lib/utils";

/**
 * Ícones esquemáticos dos formatos de chave (silhuetas no espírito da referência
 * Smoothcomp). Traço em `currentColor` — a cor vem do card que os hospeda.
 */

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-full w-full"
    >
      {children}
    </svg>
  );
}

const DESENHOS: Record<FormatoSelecionavel, ReactNode> = {
  // "Automático": faísca de decisão inteligente
  auto: (
    <Svg>
      <path d="M32 6 L35 17 L46 20 L35 23 L32 34 L29 23 L18 20 L29 17 Z" />
      <path d="M50 8 L51.5 12 L55.5 13.5 L51.5 15 L50 19 L48.5 15 L44.5 13.5 L48.5 12 Z" />
    </Svg>
  ),
  // Eliminação simples: 4 → 2 → 1
  eliminacao_simples: (
    <Svg>
      <path d="M6 6H15M6 14H15M6 26H15M6 34H15" />
      <path d="M15 6V14M15 10H24M24 10H33M15 26V34M15 30H24M24 30H33" />
      <path d="M33 10V30M33 20H42M42 20H51M51 20H58" />
    </Svg>
  ),
  // Eliminação dupla: duas chaves (vencedores/perdedores) → final
  eliminacao_dupla: (
    <Svg>
      <path d="M6 5H15M6 13H15M15 5V13M15 9H26M26 9H35" />
      <path d="M6 27H15M6 35H15M15 27V35M15 31H26M26 31H35" />
      <path d="M35 9V31M35 20H46M46 20H55M55 20H60" />
    </Svg>
  ),
  // Round robin: todos ligados a todos
  round_robin: (
    <Svg>
      <circle cx="14" cy="10" r="5" />
      <circle cx="50" cy="10" r="5" />
      <circle cx="14" cy="30" r="5" />
      <circle cx="50" cy="30" r="5" />
      <path d="M19 10H45M19 30H45M14 15V25M50 15V25M18 14 46 26M46 14 18 26" />
    </Svg>
  ),
  // 3 com repescagem: 3 entram, 1 sai
  tres_repescagem: (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <circle cx="12" cy="20" r="4" />
      <circle cx="12" cy="32" r="4" />
      <path d="M16 8Q30 8 39 17M16 20H35M16 32Q30 32 39 23" />
      <circle cx="45" cy="20" r="5" />
      <path d="M50 20H58" />
    </Svg>
  ),
  // Multistage: dois grupos → playoff → final
  multistage: (
    <Svg>
      <circle cx="9" cy="8" r="2.2" />
      <circle cx="16" cy="8" r="2.2" />
      <circle cx="9" cy="14" r="2.2" />
      <circle cx="16" cy="14" r="2.2" />
      <circle cx="9" cy="27" r="2.2" />
      <circle cx="16" cy="27" r="2.2" />
      <circle cx="9" cy="33" r="2.2" />
      <circle cx="16" cy="33" r="2.2" />
      <path d="M22 11H31M22 30H31M31 11H39M31 30H39M39 11V30M39 20H48M48 20H57" />
    </Svg>
  ),
  // Votação por jurados: três cartões de nota
  votacao_jurados: (
    <Svg>
      <rect x="8" y="12" width="12" height="16" rx="1.5" />
      <rect x="26" y="12" width="12" height="16" rx="1.5" />
      <rect x="44" y="12" width="12" height="16" rx="1.5" />
      <path d="M11 18H17M11 22H15M29 18H35M29 22H33M47 18H53M47 22H51" />
    </Svg>
  ),
  // Colocação: ranking em degraus
  colocacao: (
    <Svg>
      <path d="M6 34H58" />
      <path d="M12 34V9M25 34V15M38 34V21M51 34V27" strokeWidth={3} />
    </Svg>
  ),
  // Melhor de 3: dois atletas, três jogos
  melhor_de_tres: (
    <Svg>
      <circle cx="13" cy="20" r="6" />
      <circle cx="51" cy="20" r="6" />
      <path d="M19 20H45" />
      <circle cx="26" cy="20" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="32" cy="20" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="38" cy="20" r="1.8" fill="currentColor" stroke="none" />
    </Svg>
  ),
};

export function IconeFormato({
  id,
  className,
}: {
  id: FormatoChaveId | "auto";
  className?: string;
}) {
  return <span className={cn("block", className)}>{DESENHOS[id]}</span>;
}

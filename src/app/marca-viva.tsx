"use client";

import { cn } from "@/lib/utils";

/**
 * Marca em movimento do topo da home.
 *
 * Parada, ela respira devagar e solta ondas concêntricas — é o que puxa o olho
 * para o topo da página. A respiração roda em 4,5s em vez dos 1,8s do token
 * `marca-breathe`: o ritmo curto é da tela de carregamento, onde serve para
 * dizer "estou trabalhando"; aqui o clima é de calma.
 *
 * No hover ela dá uma volta completa e assenta 45° à frente:
 * o losango vira quadrado, as camadas giram em sentidos opostos, o miolo
 * acende em vermelho e quatro losangos menores saltam nas diagonais. Tudo em
 * transform/opacity, então não causa reflow; quem pediu menos movimento no
 * sistema (prefers-reduced-motion) não vê os loops.
 */

/** Diagonais das faíscas: [classe de deslocamento, atraso]. */
const FAISCAS: [string, string][] = [
  ["group-hover:-translate-x-[78px] group-hover:-translate-y-[78px]", "0ms"],
  ["group-hover:translate-x-[78px] group-hover:-translate-y-[78px]", "60ms"],
  ["group-hover:-translate-x-[78px] group-hover:translate-y-[78px]", "120ms"],
  ["group-hover:translate-x-[78px] group-hover:translate-y-[78px]", "180ms"],
];

/** Mola curta — dá o "pop" no giro e nas faíscas. */
const MOLA = "cubic-bezier(0.34,1.56,0.64,1)";

/**
 * Ritmo do topo da home. Respiração e ondas dividem o mesmo ciclo, com a
 * segunda onda meio ciclo atrás — assim sai uma onda a cada 2,25s em vez das
 * duas por segundo do token `marca-ripple` (1,8s), que é o ritmo apressado da
 * tela de carregamento. No hover a terceira onda entra em ritmo dobrado.
 */
const CICLO = 4.5;

export function MarcaViva({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      style={{ "--ciclo": `${CICLO}s` } as React.CSSProperties}
      className={cn(
        "group relative grid aspect-square w-[150px] place-items-center sm:w-[190px] lg:w-[230px]",
        className,
      )}
    >
      {/* ondas concêntricas — a terceira só entra no hover, e mais rápida */}
      <Onda duracao={CICLO} atraso={0} />
      <Onda duracao={CICLO} atraso={CICLO / 2} />
      <Onda
        duracao={CICLO / 2}
        atraso={CICLO / 4}
        className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* faíscas: losangos pequenos que saltam nas diagonais */}
      {FAISCAS.map(([saida, atraso]) => (
        <span
          key={saida}
          style={{ transitionDelay: atraso, transitionTimingFunction: MOLA }}
          className={cn(
            "absolute h-3 w-3 rotate-45 bg-brand opacity-0 transition-all duration-500",
            "group-hover:opacity-90",
            saida,
          )}
        />
      ))}

      {/* o losango: respiração por fora, giro do hover por dentro */}
      <div className="relative h-[46%] w-[46%] animate-marca-breathe [animation-duration:var(--ciclo)] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        <div
          style={{ transitionTimingFunction: MOLA }}
          className="relative h-full w-full transition-transform duration-700 group-hover:rotate-[405deg] group-hover:scale-110"
        >
          <Camada pontos="50,2 98,50 50,98 2,50" className="text-foreground" />
          <Camada
            pontos="50,13 87,50 50,87 13,50"
            className="text-muted-3 transition-transform duration-500 group-hover:-rotate-90"
          />
          <Camada
            pontos="50,30 70,50 50,70 30,50"
            className="text-foreground transition-[transform,color] duration-500 group-hover:rotate-90 group-hover:text-brand"
          />
        </div>
      </div>
    </div>
  );
}

/** Uma das três camadas do losango, isolada para girar por conta própria. */
function Camada({ pontos, className }: { pontos: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("absolute inset-0 h-full w-full", className)}
    >
      <polygon points={pontos} fill="currentColor" />
    </svg>
  );
}

/** Contorno de losango que expande e some — a onda. Ritmo em segundos. */
function Onda({
  duracao,
  atraso,
  className,
}: {
  duracao: number;
  atraso: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ animationDuration: `${duracao}s`, animationDelay: `${atraso}s` }}
      className={cn(
        "absolute h-[52%] w-[52%] text-brand",
        "animate-marca-ripple motion-reduce:animate-none",
        className,
      )}
    >
      <polygon
        points="50,6 94,50 50,94 6,50"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
      />
    </svg>
  );
}

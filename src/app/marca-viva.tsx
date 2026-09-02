"use client";

import { cn } from "@/lib/utils";

/**
 * Marca em movimento do topo da home.
 *
 * A marca já é, geometricamente, um tatame visto de cima: quadrados
 * concêntricos — área de segurança, borda, área de combate. A animação parte
 * daí.
 *
 * Parada, ela é UM tatame: os seis quadrados estão empilhados no centro,
 * girados 45° e ampliados, então se sobrepõem exatamente e leem como o losango
 * da marca. Ele respira devagar e solta ondas concêntricas, que é o que puxa o
 * olho para o topo da página.
 *
 * No hover o ginásio abre: os seis se desempilham para uma grade 3×2, cada um
 * assentando reto no seu lugar, como os tatames lado a lado de uma competição.
 * Saem escalonados, um atrás do outro, e as ondas somem para não competir.
 *
 * Tudo em transform/opacity — nada disso causa reflow. Quem pediu menos
 * movimento no sistema (prefers-reduced-motion) não vê os loops; a abertura no
 * hover continua, porque é resposta a uma ação, não movimento ambiente.
 */

/** Mola curta — dá o "pop" na hora de assentar. */
const MOLA = "cubic-bezier(0.34,1.56,0.64,1)";

/**
 * Ritmo do topo da home. Respiração e ondas dividem o mesmo ciclo, com a
 * segunda onda meio ciclo atrás — assim sai uma onda a cada 2,25s em vez das
 * duas por segundo do token `marca-ripple` (1,8s), que é o ritmo apressado da
 * tela de carregamento.
 */
const CICLO = 4.5;

/* Geometria da grade, em % do container. Um tatame ocupa TAM; entre eles cai
   um respiro de FOLGA. Empilhados no centro eles precisam voltar ao tamanho do
   losango de antes (46%), daí a ampliação. */
const TAM = 28;
const FOLGA = 3.2;
/** deslocamento de uma célula, em % do próprio tatame (inclui a folga) */
const PASSO = ((TAM + FOLGA) / TAM) * 100;
const AMPLIACAO = 46 / TAM;

/** os seis tatames, em grade 3×2, deslocados a partir do centro */
const TATAMES = [0, 1, 2, 3, 4, 5].map((i) => {
  const coluna = i % 3;
  const linha = Math.floor(i / 3);
  return {
    i,
    dx: `${((coluna - 1) * PASSO).toFixed(2)}%`,
    dy: `${((linha - 0.5) * PASSO).toFixed(2)}%`,
  };
});

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
      {/* ondas concêntricas: só enquanto é um tatame só. Quem desvanece é o
          container — a opacidade das ondas é dirigida pelos keyframes, e
          animação vence transição, então apagá-las uma a uma não funciona. */}
      <div className="absolute inset-0 grid place-items-center opacity-100 transition-opacity duration-300 group-hover:opacity-0">
        <Onda duracao={CICLO} atraso={0} />
        <Onda duracao={CICLO} atraso={CICLO / 2} />
      </div>

      {/* a respiração fica por fora; a abertura, por dentro de cada tatame */}
      <div className="absolute inset-0 animate-marca-breathe [animation-duration:var(--ciclo)] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {TATAMES.map(({ i, dx, dy }) => (
          <div
            key={i}
            style={
              {
                "--tx": dx,
                "--ty": dy,
                "--ampliacao": AMPLIACAO,
                width: `${TAM}%`,
                height: `${TAM}%`,
                transitionTimingFunction: MOLA,
                transitionDelay: `${i * 55}ms`,
              } as React.CSSProperties
            }
            className={cn(
              "absolute inset-0 m-auto transition-transform duration-700",
              // empilhados no centro: um losango só
              "[transform:translate(0,0)_rotate(45deg)_scale(var(--ampliacao))]",
              // abertos: seis tatames retos, lado a lado
              "group-hover:[transform:translate(var(--tx),var(--ty))_rotate(0deg)_scale(1)]",
            )}
          >
            <Tatame />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Um tatame visto de cima, nas três faixas que a marca já tinha: a área toda,
 * a borda de segurança e a área de combate no meio — que acende em vermelho
 * quando o ginásio abre.
 */
function Tatame() {
  return (
    <>
      <Camada pontos="2,2 98,2 98,98 2,98" className="text-foreground" />
      <Camada pontos="13,13 87,13 87,87 13,87" className="text-muted-3" />
      <Camada
        pontos="30,30 70,30 70,70 30,70"
        className="text-foreground transition-colors duration-500 group-hover:text-brand"
      />
    </>
  );
}

/** Uma das três faixas do tatame. */
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

/** Contorno que expande e some — a onda. Ritmo em segundos. */
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

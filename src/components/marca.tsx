import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Marca gráfica do LeagueMat: losango concêntrico (moldura · faixa · miolo).
 * A "tinta" usa currentColor, então acompanha o texto ao redor (claro no chrome
 * escuro do app); a faixa é um cinza neutro. Reto, sem cantos arredondados.
 */
export function MarcaBloco({ tamanho = 34 }: { tamanho?: number }) {
  return (
    <svg
      aria-hidden
      width={tamanho}
      height={tamanho}
      viewBox="0 0 100 100"
      style={{ display: "block" }}
    >
      <polygon points="50,2 98,50 50,98 2,50" fill="currentColor" />
      <polygon points="50,13 87,50 50,87 13,50" fill="#6b6a64" />
      <polygon points="50,30 70,50 50,70 30,50" fill="currentColor" />
    </svg>
  );
}

/** Compat: alias histórico do losango da marca. */
export function MarcaDiamante({ tamanho = 34 }: { tamanho?: number }) {
  return <MarcaBloco tamanho={tamanho} />;
}

/** Logo completa (bloco + wordmark). */
export function Logo({
  href = "/",
  tamanho = 34,
  className,
}: {
  href?: string;
  tamanho?: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 text-foreground", className)}
    >
      <MarcaBloco tamanho={tamanho} />
      <span
        className="disp tracking-[0.01em]"
        style={{ fontSize: Math.round(tamanho * 0.88) }}
      >
        League<span className="text-brand">Mat</span>
      </span>
    </Link>
  );
}

/** Rótulo "eyebrow" condensado em vermelho. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "font-cond text-[15px] font-semibold uppercase tracking-[0.1em] text-brand",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Ponto pulsante de status ao vivo. */
export function PontoVivo({ cor = "bg-brand" }: { cor?: string }) {
  return (
    <span className={cn("h-2 w-2 rounded-full animate-pulse-dot", cor)} />
  );
}

/**
 * Par skew/unskew — assinatura visual do v3: o container inclina −9° e o
 * conteúdo desinclina +9°. Use em botões, badges e chips.
 */
export function SkewTexto({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex skew-x-9 items-center gap-2", className)}>
      {children}
    </span>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Diamante da marca: quadrado rotacionado com miolo dourado. */
export function MarcaDiamante({ tamanho = 30 }: { tamanho?: number }) {
  return (
    <span
      aria-hidden
      className="flex rotate-45 items-center justify-center border-2 border-gold"
      style={{ width: tamanho, height: tamanho }}
    >
      <span
        className="block bg-gold"
        style={{ width: Math.round(tamanho * 0.27), height: Math.round(tamanho * 0.27) }}
      />
    </span>
  );
}

/** Logo completa (diamante + wordmark). */
export function Logo({
  href = "/",
  tamanho = 30,
  className,
}: {
  href?: string;
  tamanho?: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-3 text-foreground", className)}
    >
      <MarcaDiamante tamanho={tamanho} />
      <span
        className="font-display font-extrabold uppercase tracking-[0.14em]"
        style={{ fontSize: Math.round(tamanho * 0.73) }}
      >
        BJJ<span className="text-gold">Arena</span>
      </span>
    </Link>
  );
}

/** Rótulo "eyebrow" em mono dourado: "// Texto". */
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
        "font-mono text-xs uppercase tracking-[0.2em] text-gold",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Ponto pulsante de status ao vivo. */
export function PontoVivo({ cor = "bg-gold" }: { cor?: string }) {
  return (
    <span
      className={cn("h-[7px] w-[7px] rounded-full animate-pulse-dot", cor)}
    />
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Bloco da marca: "B" branco sobre quadrado vermelho com skew de −9°. */
export function MarcaBloco({ tamanho = 34 }: { tamanho?: number }) {
  return (
    <span
      aria-hidden
      className="flex -skew-x-9 items-center justify-center bg-brand"
      style={{ width: tamanho, height: tamanho }}
    >
      <span
        className="disp block skew-x-9 leading-none text-white"
        style={{ fontSize: Math.round(tamanho * 0.76) }}
      >
        B
      </span>
    </span>
  );
}

/** Compat: alias do antigo diamante — hoje renderiza o bloco v3. */
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
        BJJ<span className="text-brand">ARENA</span>
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

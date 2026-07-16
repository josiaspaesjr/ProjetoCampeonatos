import { cn } from "@/lib/utils";
import { MarcaBloco } from "@/components/marca";

/**
 * Tela de carregamento — a marca (losango) respira enquanto emite ondas
 * concêntricas em vermelho, ecoando a geometria do logo.
 * Sem hooks: renderiza no servidor (usada pelos loading.tsx das rotas).
 */
export function TelaCarregando({
  rotulo = "Carregando",
  className,
}: {
  rotulo?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] w-full flex-col items-center justify-center gap-6",
        className,
      )}
    >
      <span className="relative flex h-14 w-14 items-center justify-center text-foreground">
        {/* ondas concêntricas emanando da marca */}
        <OndaLosango className="animate-marca-ripple" />
        <OndaLosango className="animate-marca-ripple [animation-delay:0.9s]" />
        {/* marca com respiração sutil */}
        <span className="relative flex animate-marca-breathe">
          <MarcaBloco tamanho={44} />
        </span>
      </span>
      <span className="font-cond text-[15px] font-semibold uppercase tracking-[0.14em] text-muted-2">
        {rotulo}…
      </span>
    </div>
  );
}

/** Contorno de losango (só stroke) usado como onda pulsante. */
function OndaLosango({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={cn("absolute inset-0 h-full w-full text-brand", className)}
    >
      <polygon
        points="50,6 94,50 50,94 6,50"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
      />
    </svg>
  );
}

import { cn } from "@/lib/utils";

/**
 * Tela de carregamento v3 — bloco da marca pulsando + rótulo condensado.
 * Usada pelos loading.tsx das rotas (sem hooks: renderiza no servidor).
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
        "flex min-h-[60vh] w-full flex-col items-center justify-center gap-5",
        className,
      )}
    >
      <span className="flex h-12 w-12 -skew-x-9 items-center justify-center bg-brand animate-pulse-dot">
        <span className="disp skew-x-9 text-4xl leading-none text-white">B</span>
      </span>
      <span className="font-cond text-[15px] font-semibold uppercase tracking-[0.14em] text-muted-2">
        {rotulo}…
      </span>
    </div>
  );
}

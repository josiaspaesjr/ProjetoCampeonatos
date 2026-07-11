import { cn } from "@/lib/utils";

const PASSOS = [
  { num: 1, rotulo: "Dados" },
  { num: 2, rotulo: "Pagamento" },
  { num: 3, rotulo: "Confirmação" },
];

/** Indicador de progresso do fluxo de inscrição (nós skewados 1/2/3). */
export function PassosInscricao({ atual }: { atual: 1 | 2 | 3 }) {
  return (
    <div className="mb-10 flex max-w-[560px] items-center">
      {PASSOS.map((p, i) => {
        const ativo = p.num === atual;
        const feito = p.num < atual;
        return (
          <div key={p.num} className="flex flex-1 items-center">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "disp flex h-[34px] w-[34px] -skew-x-9 items-center justify-center border text-[22px]",
                  ativo
                    ? "border-brand bg-brand text-white"
                    : feito
                      ? "border-brand bg-brand/15 text-brand"
                      : "border-white/20 text-muted-3",
                )}
              >
                <span className="skew-x-9 pt-[3px]">{feito ? "✓" : p.num}</span>
              </div>
              <span
                className={cn(
                  "whitespace-nowrap font-cond text-sm font-semibold uppercase tracking-[0.06em] max-sm:hidden",
                  ativo ? "text-foreground" : "text-muted-2",
                )}
              >
                {p.rotulo}
              </span>
            </div>
            {i < PASSOS.length - 1 && (
              <div className="mx-3.5 h-px min-w-4 flex-1 bg-white/14" />
            )}
          </div>
        );
      })}
    </div>
  );
}

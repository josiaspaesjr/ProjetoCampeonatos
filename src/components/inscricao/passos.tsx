import { cn } from "@/lib/utils";

const PASSOS = [
  { num: 1, rotulo: "Dados" },
  { num: 2, rotulo: "Pagamento" },
  { num: 3, rotulo: "Confirmação" },
];

/** Indicador de progresso do fluxo de inscrição (losangos 1/2/3). */
export function PassosInscricao({ atual }: { atual: 1 | 2 | 3 }) {
  return (
    <div className="mb-11 flex max-w-[560px] items-center">
      {PASSOS.map((p, i) => {
        const ativo = p.num === atual;
        const feito = p.num < atual;
        return (
          <div key={p.num} className="flex flex-1 items-center">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-8 w-8 rotate-45 items-center justify-center border font-display text-sm font-bold",
                  ativo
                    ? "border-gold bg-gold text-ink"
                    : feito
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-white/18 text-muted-3",
                )}
              >
                <span className="-rotate-45">{feito ? "✓" : p.num}</span>
              </div>
              <span
                className={cn(
                  "whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.08em]",
                  ativo ? "text-foreground" : "text-muted-2",
                )}
              >
                {p.rotulo}
              </span>
            </div>
            {i < PASSOS.length - 1 && (
              <div className="mx-3.5 h-px min-w-4 flex-1 bg-white/12" />
            )}
          </div>
        );
      })}
    </div>
  );
}

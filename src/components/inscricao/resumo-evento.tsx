export interface LinhaResumo {
  k: string;
  v: string | null;
  /** valor preenchido em dourado (faixa, categoria) */
  dourado?: boolean;
}

/**
 * Sidebar de resumo do fluxo de inscrição — presente em todos os passos.
 * Componente puro: recebe tudo por props para funcionar em client e server.
 */
export function ResumoEvento({
  nomeEvento,
  meta,
  badge,
  bannerUrl,
  linhas,
  precoRotulo,
  precoValor,
  notaRodape,
}: {
  nomeEvento: string;
  meta: string;
  badge?: string;
  bannerUrl?: string | null;
  linhas: LinhaResumo[];
  precoRotulo: string;
  precoValor: string;
  notaRodape?: string;
}) {
  return (
    <aside className="flex flex-col border-white/7 bg-surface px-6 py-10 max-lg:border-t lg:border-l lg:px-10 lg:py-12">
      <div className="relative mb-6 flex aspect-[16/10] items-center justify-center overflow-hidden bg-stripes-foto">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="font-mono text-[11px] text-[#4A473F]">
            [ imagem do evento ]
          </span>
        )}
        {badge && (
          <div className="absolute left-3 top-3 border border-white/12 bg-ink px-2.5 py-[5px] font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
            {badge}
          </div>
        )}
      </div>

      <div className="mb-1.5 font-display text-[26px] font-bold uppercase leading-[1.05]">
        {nomeEvento}
      </div>
      <div className="mb-7 font-mono text-xs text-muted-2">{meta}</div>

      <div className="flex flex-col border-t border-white/8">
        {linhas.map((linha) => (
          <div
            key={linha.k}
            className="flex items-center justify-between gap-4 border-b border-white/6 py-3.5"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-2">
              {linha.k}
            </span>
            <span
              className={`max-w-[210px] truncate text-right font-display text-[17px] font-semibold uppercase ${
                linha.v ? (linha.dourado ? "text-gold" : "text-foreground") : "text-muted-3"
              }`}
            >
              {linha.v ?? "—"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-8">
        <div className="mb-1.5 flex items-end justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
            {precoRotulo}
          </span>
          <span className="font-display text-[38px] font-extrabold leading-none text-gold">
            {precoValor}
          </span>
        </div>
        {notaRodape && (
          <div className="font-mono text-[11px] text-muted-3">{notaRodape}</div>
        )}
      </div>
    </aside>
  );
}

/**
 * Placeholder das abas ainda não construídas (Atletas, Lutas, Resultados).
 * Mantém o padrão dark/dourado e descreve o que a aba vai conter.
 */
export function EmBreve({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-white/10 bg-surface px-6 py-20 text-center">
      <span className="mb-4 inline-flex -skew-x-9 items-center bg-brand/15 px-3.5 py-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-brand">
        <span className="inline-block skew-x-9">Em breve</span>
      </span>
      <h2 className="disp text-[40px]">{titulo}</h2>
      <p className="mt-3 max-w-[440px] text-[15px] font-medium leading-relaxed text-muted-2">
        {descricao}
      </p>
    </div>
  );
}

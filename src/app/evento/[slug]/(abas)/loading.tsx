import { TelaCarregando } from "@/components/carregando";

/**
 * Loading escopado ao conteúdo da aba — fica DENTRO do layout `(abas)`, então
 * o hero e a barra de abas continuam visíveis enquanto a aba carrega.
 */
export default function Loading() {
  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <TelaCarregando />
    </div>
  );
}

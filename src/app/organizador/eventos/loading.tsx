import { TelaCarregando } from "@/components/carregando";

/**
 * Boundary de carregamento ACIMA de `[id]/layout.tsx`.
 *
 * O `loading.tsx` de `[id]` fica dentro daquele layout, e é justamente o layout
 * que refaz todas as consultas ao trocar de evento — então ele não cobre a
 * troca. Sem este arquivo, o console fica parado no evento anterior (com o
 * seletor já mostrando o novo) até a próxima tela chegar inteira.
 */
export default function Loading() {
  return <TelaCarregando />;
}

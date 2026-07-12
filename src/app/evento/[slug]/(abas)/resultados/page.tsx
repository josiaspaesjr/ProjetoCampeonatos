import { EmBreve } from "@/components/evento/em-breve";
import { getDicionario } from "@/lib/i18n/server";

export default async function AbaResultados() {
  const dr = (await getDicionario()).resultadosTab;
  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <EmBreve selo={dr.emBreve} titulo={dr.titulo} descricao={dr.descricao} />
    </div>
  );
}

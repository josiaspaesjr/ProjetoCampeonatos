import { EmBreve } from "@/components/evento/em-breve";

export default function AbaAtletas() {
  return (
    <div className="px-6 pb-20 pt-10 md:px-12">
      <EmBreve
        titulo="Atletas"
        descricao="Todos os inscritos agrupados por divisão, com card por atleta, busca, filtro por país e atalho para a chave de cada categoria."
      />
    </div>
  );
}

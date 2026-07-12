/**
 * Seções do regulamento do evento. Cada uma é opcional: o organizador
 * preenche o que quiser, podendo partir de um texto padrão editável.
 * A ordem aqui é a ordem exibida na tela de criação e na página pública.
 */

export interface SecaoRegulamento {
  chave: string;
  titulo: string;
  textoPadrao: string;
}

export const SECOES_REGULAMENTO: SecaoRegulamento[] = [
  {
    chave: "regrasInscricao",
    titulo: "Regras de inscrição",
    textoPadrao:
      "As inscrições são feitas exclusivamente pela plataforma, dentro do prazo divulgado. É responsabilidade do atleta informar corretamente nome, data de nascimento, sexo, faixa e equipe — dados incorretos podem levar à desclassificação. Cada atleta pode se inscrever em uma categoria de peso da sua faixa/idade e, quando houver, no absoluto. A inscrição só é confirmada após a aprovação do pagamento.",
  },
  {
    chave: "pesagem",
    titulo: "Pesagem",
    textoPadrao:
      "A pesagem é única e ocorre no dia do evento, momentos antes das lutas da categoria, com o atleta usando o kimono (Gi) ou o uniforme oficial (No-Gi). O peso divulgado é o limite máximo da categoria — não há tolerância. O atleta que não bater o peso é desclassificado da categoria de peso, sem reembolso, permanecendo apto ao absoluto se inscrito.",
  },
  {
    chave: "regrasLuta",
    titulo: "Regras de luta",
    textoPadrao:
      "As lutas seguem o regulamento técnico da CBJJ/IBJJF vigente. A pontuação considera quedas, passagens de guarda, montada, pegada nas costas, joelho na barriga e raspagens, além de vantagens e punições. Vence quem finalizar, somar mais pontos ou, em caso de empate, obtiver mais vantagens; persistindo o empate, a decisão é do árbitro.",
  },
  {
    chave: "temposLuta",
    titulo: "Tempos de luta",
    textoPadrao:
      "Tempo de combate por faixa (adulto): Branca 5 min · Azul 6 min · Roxa 7 min · Marrom 8 min · Preta 10 min. Categorias infantis e master podem ter tempos reduzidos, conforme a tabela CBJJ. O tempo é corrido e controlado pela mesa de cada área.",
  },
  {
    chave: "chaveamento",
    titulo: "Chaveamento",
    textoPadrao:
      "As chaves são geradas automaticamente após o encerramento das inscrições e a confirmação dos pagamentos. Categorias com até 3 atletas correm em formato de todos-contra-todos (rodízio); com 4 ou mais, em eliminatória simples. O sorteio é reproduzível e auditável. As chaves ficam disponíveis para consulta antes do início do evento.",
  },
  {
    chave: "woChamada",
    titulo: "WO e chamada dos atletas",
    textoPadrao:
      "O atleta deve estar na área de aquecimento quando sua categoria for chamada. Serão feitas três chamadas; o atleta que não se apresentar após a terceira chamada perde por W.O. É responsabilidade do competidor acompanhar o cronograma, que pode adiantar ou atrasar conforme o andamento das lutas.",
  },
  {
    chave: "uniforme",
    titulo: "Uniforme",
    textoPadrao:
      "No Gi, o kimono deve estar limpo, sem rasgos, nas cores branca, azul ou preta, dentro das medidas da CBJJ; a faixa deve corresponder à graduação do atleta. No No-Gi, é obrigatório o uso de rashguard e shorts adequados. A inspeção de uniforme e a medição do gi podem ser feitas antes da luta, e a reprovação pode levar à desclassificação.",
  },
  {
    chave: "arbitragem",
    titulo: "Arbitragem",
    textoPadrao:
      "As lutas são conduzidas por árbitros certificados. A decisão do árbitro sobre a luta é soberana e não cabe recurso quanto ao mérito técnico. Reclamações de conduta ou erro administrativo devem ser feitas imediatamente à coordenação da área, de forma respeitosa.",
  },
  {
    chave: "segurancaMedico",
    titulo: "Segurança e atendimento médico",
    textoPadrao:
      "O evento conta com equipe de primeiros socorros e ambulância de plantão durante toda a competição. Em caso de lesão que impeça a continuidade, o atendimento médico é priorizado e a decisão da equipe de saúde sobre a interrupção da luta é definitiva. O atleta declara estar em condições físicas de competir.",
  },
  {
    chave: "conduta",
    titulo: "Conduta e disciplina",
    textoPadrao:
      "Espera-se respeito entre atletas, treinadores, árbitros e staff. Condutas antidesportivas, agressões, desrespeito à arbitragem ou uso de linguagem ofensiva podem resultar em advertência, desclassificação e banimento de etapas futuras. O atleta e sua equipe são responsáveis pela conduta de seus acompanhantes.",
  },
  {
    chave: "premiacao",
    titulo: "Premiação",
    textoPadrao:
      "São premiados os três primeiros colocados de cada categoria (1º, 2º e dois 3º lugares, quando houver). Categorias com apenas um atleta inscrito podem ser fundidas ou canceladas, a critério da organização. A premiação por equipes, quando houver, segue a pontuação divulgada pela organização.",
  },
  {
    chave: "absoluto",
    titulo: "Absoluto",
    textoPadrao:
      "O absoluto (peso livre) é opcional e exige inscrição específica. Reúne atletas da mesma faixa e categoria de idade, independentemente do peso. Vagas e formato podem ser ajustados conforme o número de inscritos. O atleta deve ter batido o peso na sua categoria ou cumprir o critério definido pela organização.",
  },
  {
    chave: "criancas",
    titulo: "Regras para crianças",
    textoPadrao:
      "Nas categorias infantis, o foco é pedagógico e a segurança é prioridade. Golpes de finalização e técnicas consideradas de risco são restritos conforme a faixa etária, seguindo a tabela CBJJ. A presença de um responsável é obrigatória, e a organização pode ajustar tempos e regras para o bem-estar das crianças.",
  },
  {
    chave: "estrutura",
    titulo: "Estrutura do evento",
    textoPadrao:
      "O evento acontece em áreas de luta simultâneas, com mesa de controle, arbitragem e cronograma estimado por área. Haverá área de aquecimento, espaço para equipes e sinalização das categorias. O cronograma é uma estimativa e pode variar conforme o andamento das lutas.",
  },
  {
    chave: "alteracaoCancelamento",
    titulo: "Política de alteração e cancelamento",
    textoPadrao:
      "Alterações de categoria e cancelamentos são aceitos até a data-limite divulgada. Após o fechamento das inscrições ou a geração das chaves, não há troca de categoria nem reembolso. Em caso de cancelamento do evento por parte da organização, os valores pagos são reembolsados conforme a política informada.",
  },
  {
    chave: "termosObrigatorios",
    titulo: "Termos obrigatórios",
    textoPadrao:
      "Ao se inscrever, o atleta (ou seu responsável legal, no caso de menores) declara estar apto a competir, aceita o regulamento na íntegra e assume os riscos inerentes à prática do jiu-jitsu. Autoriza também o uso de sua imagem em fotos e vídeos do evento para fins de divulgação, sem ônus para a organização.",
  },
];

export type Regulamento = Record<string, string>;

/** Extrai do FormData apenas as seções preenchidas (chave `reg_<chave>`). */
export function lerRegulamentoDoForm(formData: FormData): Regulamento | null {
  const reg: Regulamento = {};
  for (const secao of SECOES_REGULAMENTO) {
    const valor = String(formData.get(`reg_${secao.chave}`) ?? "").trim();
    if (valor) reg[secao.chave] = valor;
  }
  return Object.keys(reg).length ? reg : null;
}

/** Seções preenchidas, na ordem canônica — para exibir na página pública. */
export function secoesPreenchidas(
  regulamento: Regulamento | null | undefined,
): { chave: string; titulo: string; texto: string }[] {
  if (!regulamento) return [];
  return SECOES_REGULAMENTO.filter((s) => regulamento[s.chave]?.trim()).map(
    (s) => ({ chave: s.chave, titulo: s.titulo, texto: regulamento[s.chave] }),
  );
}

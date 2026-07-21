import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { LoteVariacao } from "@/lib/lotes/preco";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const sexoEnum = pgEnum("sexo", ["masculino", "feminino"]);

export const faixaEnum = pgEnum("faixa", [
  "branca",
  "cinza",
  "amarela",
  "laranja",
  "verde",
  "azul",
  "roxa",
  "marrom",
  "preta",
]);

export const eventoStatusEnum = pgEnum("evento_status", [
  "rascunho",
  "publicado",
  "inscricoes_encerradas",
  "em_andamento",
  "finalizado",
]);

export const modalidadeEnum = pgEnum("modalidade", ["gi_nogi", "gi", "nogi"]);

export const categoriaTipoEnum = pgEnum("categoria_tipo", [
  "peso",
  "absoluto",
  "custom",
]);

export const categoriaStatusEnum = pgEnum("categoria_status", [
  "aberta",
  "fechada",
  "fundida",
]);

export const inscricaoStatusEnum = pgEnum("inscricao_status", [
  "pendente_pagamento",
  "confirmada",
  "cancelada",
  "reembolsada",
]);

// convite de colaborador: pendente (aguarda aceite pelo link) → ativo (aceitou)
export const colaboradorStatusEnum = pgEnum("colaborador_status", [
  "pendente",
  "ativo",
]);

export const pagamentoMetodoEnum = pgEnum("pagamento_metodo", [
  "pix",
  "cartao",
]);

export const pagamentoStatusEnum = pgEnum("pagamento_status", [
  "criado",
  "pago",
  "expirado",
  "estornado",
]);

export const cupomTipoEnum = pgEnum("cupom_tipo", ["percentual", "valor_fixo"]);

export const chaveFormatoEnum = pgEnum("chave_formato", [
  "eliminacao_simples",
  "eliminacao_dupla",
  "round_robin",
  "melhor_de_tres",
  "tres_repescagem",
  "colocacao",
  "multistage",
  "votacao_jurados",
]);

export const chaveStatusEnum = pgEnum("chave_status", [
  "rascunho",
  "publicada",
  "em_andamento",
  "concluida",
]);

export const lutaMetodoEnum = pgEnum("luta_metodo", [
  "pontos",
  "vantagens",
  "finalizacao",
  "decisao",
  "wo",
  "dq",
]);

// ---------------------------------------------------------------------------
// Tabelas
// ---------------------------------------------------------------------------

// catálogo fechado de academias/equipes (base IBJJF). O atleta seleciona uma
// na inscrição — não há cadastro manual, então `nome` é único.
export const academias = pgTable("academias", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull().unique(),
  cidade: text("cidade"),
  uf: text("uf"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  // id do provedor de auth (Supabase Auth); nulo para contas criadas manualmente
  authId: text("auth_id").unique(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  telefone: text("telefone"),
  dataNascimento: date("data_nascimento"),
  sexo: sexoEnum("sexo"),
  faixaAtual: faixaEnum("faixa_atual"),
  academiaId: uuid("academia_id").references(() => academias.id),
  // documento e endereço, coletados na inscrição (CPF só para atletas do Brasil).
  // guardados no perfil para reaproveitar nas próximas inscrições.
  cpf: text("cpf"),
  enderecoCep: text("endereco_cep"),
  enderecoLogradouro: text("endereco_logradouro"),
  enderecoNumero: text("endereco_numero"),
  enderecoComplemento: text("endereco_complemento"),
  enderecoBairro: text("endereco_bairro"),
  enderecoCidade: text("endereco_cidade"),
  enderecoUf: text("endereco_uf"),
  ehOrganizador: boolean("eh_organizador").notNull().default(false),
  ehAdmin: boolean("eh_admin").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const eventos = pgTable("eventos", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizadorId: uuid("organizador_id")
    .notNull()
    .references(() => usuarios.id),
  nome: text("nome").notNull(),
  slug: text("slug").notNull().unique(),
  bannerUrl: text("banner_url"),
  descricao: text("descricao"),
  endereco: text("endereco"),
  cidade: text("cidade"),
  uf: text("uf"),
  // circuito/temporada a que a etapa pertence (ex.: "Circuito Paulista 2026")
  circuito: text("circuito"),
  modalidade: modalidadeEnum("modalidade").notNull().default("gi_nogi"),
  // nº de áreas planejado no cadastro; as áreas reais vivem na tabela `areas`
  numAreas: integer("num_areas"),
  dataPesagem: date("data_pesagem"),
  // data prevista para gerar as chaves — informativa (planejamento); não
  // dispara geração automática
  dataGeracaoChaves: date("data_geracao_chaves"),
  // recorte de faixas aceito nas inscrições (ordem do faixaEnum)
  faixaMin: faixaEnum("faixa_min"),
  faixaMax: faixaEnum("faixa_max"),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  inscricoesAbrem: timestamp("inscricoes_abrem", { withTimezone: true }),
  inscricoesFecham: timestamp("inscricoes_fecham", { withTimezone: true }),
  // data-limite para o atleta trocar de categoria ou cancelar
  limiteAlteracoes: timestamp("limite_alteracoes", { withTimezone: true }),
  status: eventoStatusEnum("status").notNull().default("rascunho"),
  // define a trilha de pagamento: BRL → gateway nacional (Pix), demais → internacional
  moeda: text("moeda").notNull().default("BRL"),
  politicaReembolso: text("politica_reembolso"),
  // seções do regulamento (chave → texto); só as preenchidas ficam salvas
  regulamento: jsonb("regulamento").$type<Record<string, string>>(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

// dias do evento: cada linha é uma **janela** de horário (início/fim em minutos
// desde a meia-noite). Um dia de calendário pode ter VÁRIAS janelas (ex.: manhã
// 09:00–12:00 e tarde 14:00–18:00) — o intervalo entre elas fica livre de lutas.
// O período disponível = soma das janelas × nº de áreas; o gerador de áreas só
// estrutura se as lutas couberem, e o cronograma encaixa as lutas janela a
// janela, rolando ao próximo dia quando esgota. Sem linhas → evento de um dia
// (retrocompat: ver diasDoEventoOuDefault em src/lib/cronograma/dias.ts).
export const eventoDias = pgTable(
  "evento_dias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventoId: uuid("evento_id")
      .notNull()
      .references(() => eventos.id),
    data: date("data").notNull(),
    // janela do dia em minutos desde a meia-noite (540 = 09:00, 1080 = 18:00)
    inicioMinutos: integer("inicio_minutos").notNull().default(540),
    fimMinutos: integer("fim_minutos").notNull().default(1080),
    ordem: integer("ordem").notNull().default(0),
  },
  // NÃO é único: a mesma data pode ter mais de uma janela (manhã/tarde). Índice
  // só para acelerar a busca das janelas de um evento, na ordem do dia.
  (t) => [index("evento_dias_evento_data_idx").on(t.eventoId, t.data)],
);

// colaboradores do evento: co-organizadores convidados por link. O dono do
// evento (eventos.organizadorId) não vira linha aqui — é sempre dono.
export const eventoColaboradores = pgTable("evento_colaboradores", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventoId: uuid("evento_id")
    .notNull()
    .references(() => eventos.id),
  // e-mail convidado (só referência p/ o dono; o vínculo real é usuarioId)
  email: text("email"),
  // usuário que aceitou o convite (nulo enquanto pendente)
  usuarioId: uuid("usuario_id").references(() => usuarios.id),
  // token secreto do link de convite
  token: text("token").notNull().unique(),
  status: colaboradorStatusEnum("status").notNull().default("pendente"),
  convidadoPor: uuid("convidado_por")
    .notNull()
    .references(() => usuarios.id),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  aceitoEm: timestamp("aceito_em", { withTimezone: true }),
});

export const lotes = pgTable("lotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventoId: uuid("evento_id")
    .notNull()
    .references(() => eventos.id),
  nome: text("nome").notNull(),
  // preço base (fallback): vale para categorias sem grupo de preço
  precoCentavos: integer("preco_centavos").notNull(),
  // preço da 2ª inscrição do mesmo atleta (ex.: absoluto); nulo = mesmo preço
  precoSegundaInscricaoCentavos: integer("preco_segunda_inscricao_centavos"),
  // pacotes de preço nomeados deste lote (ex.: kids/adulto/feminino). O nome
  // liga à categoria via `categorias.grupoPreco`; nulo/vazio = só preço base
  variacoes: jsonb("variacoes").$type<LoteVariacao[]>(),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
  fim: timestamp("fim", { withTimezone: true }).notNull(),
});

export const cupons = pgTable(
  "cupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventoId: uuid("evento_id")
      .notNull()
      .references(() => eventos.id),
    codigo: text("codigo").notNull(),
    tipo: cupomTipoEnum("tipo").notNull(),
    // percentual: 0–100; valor_fixo: centavos
    valor: integer("valor").notNull(),
    limiteUsos: integer("limite_usos"),
    usos: integer("usos").notNull().default(0),
    validade: timestamp("validade", { withTimezone: true }),
  },
  (t) => [uniqueIndex("cupons_evento_codigo_idx").on(t.eventoId, t.codigo)],
);

export const areas = pgTable("areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventoId: uuid("evento_id")
    .notNull()
    .references(() => eventos.id),
  nome: text("nome").notNull(),
  ordem: integer("ordem").notNull().default(0),
  // âncora do cronograma estimado da área
  horaInicio: timestamp("hora_inicio", { withTimezone: true }),
  // OBSOLETO: a intercalação p/ descanso hoje é sempre ligada no motor
  // (src/lib/cronograma/intercalar.ts), não depende mais desta flag. Coluna
  // mantida por retrocompat (dropar exigiria migração); nenhum código a lê.
  intercalarRodadas: boolean("intercalar_rodadas").notNull().default(false),
});

export const categorias = pgTable("categorias", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventoId: uuid("evento_id")
    .notNull()
    .references(() => eventos.id),
  nome: text("nome").notNull(),
  tipo: categoriaTipoEnum("tipo").notNull().default("peso"),
  sexo: sexoEnum("sexo").notNull(),
  faixa: faixaEnum("faixa"),
  // classe de idade CBJJ: kids1..kids3, juvenil, adulto, master1..master7
  classeIdade: text("classe_idade").notNull(),
  idadeMin: integer("idade_min"),
  idadeMax: integer("idade_max"),
  limitePesoKg: numeric("limite_peso_kg", { precision: 5, scale: 2 }),
  // preço específico desta categoria (ex.: absoluto); nulo = preço do lote vigente
  precoCentavos: integer("preco_centavos"),
  // grupo de preço: casa com o `nome` de uma variação do lote (kids/adulto/…);
  // nulo = usa o preço base do lote vigente
  grupoPreco: text("grupo_preco"),
  // duração estimada por luta (com transição); nulo = tabela CBJJ da faixa
  duracaoLutaSegundos: integer("duracao_luta_segundos"),
  minInscritos: integer("min_inscritos").notNull().default(2),
  status: categoriaStatusEnum("status").notNull().default("aberta"),
  fundidaEmId: uuid("fundida_em_id"),
  // dia do evento: categorias correm em sequência dentro de uma área
  areaId: uuid("area_id"),
  ordemNaArea: integer("ordem_na_area"),
  // dia fixado manualmente ("YYYY-MM-DD") no modo "Por dia" — a categoria só
  // começa a partir da 1ª janela desse dia. Nulo = modo automático (o encaixe
  // decide o dia). Ver src/lib/cronograma e a action estruturarPorDia.
  dataFixada: date("data_fixada"),
});

export const inscricoes = pgTable(
  "inscricoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    eventoId: uuid("evento_id")
      .notNull()
      .references(() => eventos.id),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categorias.id),
    status: inscricaoStatusEnum("status").notNull().default("pendente_pagamento"),
    // preço travado no ato da inscrição (centavos) — vale mesmo pagando depois,
    // preservando o desconto de 2ª inscrição da ocasião; nulo só em linhas legadas
    precoCentavos: integer("preco_centavos"),
    // snapshot no momento da inscrição — histórico imune a edição de perfil
    nomeAtleta: text("nome_atleta").notNull(),
    faixa: faixaEnum("faixa").notNull(),
    dataNascimento: date("data_nascimento").notNull(),
    academiaId: uuid("academia_id").references(() => academias.id),
    academiaNome: text("academia_nome"),
    // país do atleta (ISO alpha-2, snapshot); padrão BR
    pais: text("pais").notNull().default("BR"),
    // check-in / pesagem no dia do evento
    checkinEm: timestamp("checkin_em", { withTimezone: true }),
    pesoAferidoKg: numeric("peso_aferido_kg", { precision: 5, scale: 2 }),
    foraDoPeso: boolean("fora_do_peso").notNull().default(false),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // um atleta não se inscreve duas vezes na mesma categoria
    uniqueIndex("inscricoes_usuario_categoria_idx").on(t.usuarioId, t.categoriaId),
  ],
);

export const pagamentos = pgTable("pagamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventoId: uuid("evento_id")
    .notNull()
    .references(() => eventos.id),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  gateway: text("gateway").notNull(),
  gatewayCobrancaId: text("gateway_cobranca_id"),
  metodo: pagamentoMetodoEnum("metodo").notNull(),
  cupomId: uuid("cupom_id").references(() => cupons.id),
  valorBrutoCentavos: integer("valor_bruto_centavos").notNull(),
  descontoCentavos: integer("desconto_centavos").notNull().default(0),
  taxaPlataformaCentavos: integer("taxa_plataforma_centavos").notNull().default(0),
  taxaGatewayCentavos: integer("taxa_gateway_centavos").notNull().default(0),
  valorLiquidoOrganizadorCentavos: integer(
    "valor_liquido_organizador_centavos",
  ).notNull(),
  status: pagamentoStatusEnum("status").notNull().default("criado"),
  expiraEm: timestamp("expira_em", { withTimezone: true }),
  pagoEm: timestamp("pago_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

// um checkout pode conter várias inscrições do mesmo atleta (peso + absoluto)
export const pagamentoInscricoes = pgTable(
  "pagamento_inscricoes",
  {
    pagamentoId: uuid("pagamento_id")
      .notNull()
      .references(() => pagamentos.id),
    inscricaoId: uuid("inscricao_id")
      .notNull()
      .references(() => inscricoes.id),
  },
  (t) => [primaryKey({ columns: [t.pagamentoId, t.inscricaoId] })],
);

export const chaves = pgTable("chaves", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoriaId: uuid("categoria_id")
    .notNull()
    .unique()
    .references(() => categorias.id),
  formato: chaveFormatoEnum("formato").notNull().default("eliminacao_simples"),
  status: chaveStatusEnum("status").notNull().default("rascunho"),
  // config específica do formato (ex.: { numJurados } na votação por jurados)
  config: jsonb("config").$type<{ numJurados?: number }>(),
  // seed do sorteio — torna a geração reproduzível e auditável
  seedSorteio: text("seed_sorteio").notNull(),
  geradaEm: timestamp("gerada_em", { withTimezone: true }).notNull().defaultNow(),
  publicadaEm: timestamp("publicada_em", { withTimezone: true }),
  // cerimônia: quando as medalhas do pódio foram entregues (nulo = pendente).
  // Só faz sentido em chave concluída (com pódio). Ver marcarMedalhasEntregues.
  medalhasEntreguesEm: timestamp("medalhas_entregues_em", { withTimezone: true }),
});

export const lutas = pgTable("lutas", {
  id: uuid("id").primaryKey().defaultRandom(),
  chaveId: uuid("chave_id")
    .notNull()
    .references(() => chaves.id),
  rodada: integer("rodada").notNull(),
  posicao: integer("posicao").notNull(),
  atleta1InscricaoId: uuid("atleta1_inscricao_id").references(() => inscricoes.id),
  atleta2InscricaoId: uuid("atleta2_inscricao_id").references(() => inscricoes.id),
  proximaLutaId: uuid("proxima_luta_id"),
  // em qual slot da próxima luta o vencedor entra: 1 ou 2
  proximaLutaSlot: integer("proxima_luta_slot"),
  // rota do perdedor (eliminação dupla): para onde o perdedor cai e em qual slot
  proximaLutaPerdedorId: uuid("proxima_luta_perdedor_id"),
  proximaLutaPerdedorSlot: integer("proxima_luta_perdedor_slot"),
  // fase da chave (eliminação dupla): "wb" (vencedores), "lb" (perdedores), "gf" (grande final)
  fase: text("fase"),
  vencedorInscricaoId: uuid("vencedor_inscricao_id").references(() => inscricoes.id),
  metodo: lutaMetodoEnum("metodo"),
  pontos1: integer("pontos1").notNull().default(0),
  vantagens1: integer("vantagens1").notNull().default(0),
  punicoes1: integer("punicoes1").notNull().default(0),
  pontos2: integer("pontos2").notNull().default(0),
  vantagens2: integer("vantagens2").notNull().default(0),
  punicoes2: integer("punicoes2").notNull().default(0),
  nomeFinalizacao: text("nome_finalizacao"),
  // notas dos jurados (votação por jurados): uma nota por jurado, ex.: [8.5, 9, 7.5]
  notas: jsonb("notas").$type<number[]>(),
  encerradaEm: timestamp("encerrada_em", { withTimezone: true }),
  // estado do cronômetro da luta corrente — só o tablet do organizador escreve
  // (em iniciar/pausar/zerar/encerrar); o placar/telão espelha. Pode ser negativo
  // (overtime). Nulo = relógio ainda não iniciado nesta luta.
  cronometroRestanteSeg: integer("cronometro_restante_seg"),
  cronometroRodando: boolean("cronometro_rodando").notNull().default(false),
  cronometroAtualizadoEm: timestamp("cronometro_atualizado_em", {
    withTimezone: true,
  }),
  // ordem manual da luta na fila da ÁREA (drag-and-drop do cronograma). Nulo =
  // sem override → usa a ordem calculada (ordemNaArea + rodada/posicao). NÃO
  // altera a topologia da chave (rodada/posicao/proximaLutaId ficam intactos):
  // só reordena a exibição e a fila do telão/placar. Zerada ao reestruturar as
  // áreas. Ver montarCronogramaDoEvento e montarFilaDaArea.
  ordemCronograma: integer("ordem_cronograma"),
});

// toda mutação sensível (troca de categoria, correção de resultado,
// regeneração de chave) fica registrada aqui
export const auditoria = pgTable("auditoria", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id),
  entidade: text("entidade").notNull(),
  entidadeId: uuid("entidade_id").notNull(),
  acao: text("acao").notNull(),
  dadosAnteriores: jsonb("dados_anteriores"),
  dadosNovos: jsonb("dados_novos"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

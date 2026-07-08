CREATE TYPE "public"."categoria_status" AS ENUM('aberta', 'fechada', 'fundida');--> statement-breakpoint
CREATE TYPE "public"."categoria_tipo" AS ENUM('peso', 'absoluto', 'custom');--> statement-breakpoint
CREATE TYPE "public"."chave_formato" AS ENUM('eliminacao_simples', 'eliminacao_dupla', 'round_robin');--> statement-breakpoint
CREATE TYPE "public"."chave_status" AS ENUM('rascunho', 'publicada', 'em_andamento', 'concluida');--> statement-breakpoint
CREATE TYPE "public"."cupom_tipo" AS ENUM('percentual', 'valor_fixo');--> statement-breakpoint
CREATE TYPE "public"."evento_status" AS ENUM('rascunho', 'publicado', 'inscricoes_encerradas', 'em_andamento', 'finalizado');--> statement-breakpoint
CREATE TYPE "public"."faixa" AS ENUM('branca', 'cinza', 'amarela', 'laranja', 'verde', 'azul', 'roxa', 'marrom', 'preta');--> statement-breakpoint
CREATE TYPE "public"."inscricao_status" AS ENUM('pendente_pagamento', 'confirmada', 'cancelada', 'reembolsada');--> statement-breakpoint
CREATE TYPE "public"."luta_metodo" AS ENUM('pontos', 'vantagens', 'finalizacao', 'decisao', 'wo', 'dq');--> statement-breakpoint
CREATE TYPE "public"."pagamento_metodo" AS ENUM('pix', 'cartao');--> statement-breakpoint
CREATE TYPE "public"."pagamento_status" AS ENUM('criado', 'pago', 'expirado', 'estornado');--> statement-breakpoint
CREATE TYPE "public"."sexo" AS ENUM('masculino', 'feminino');--> statement-breakpoint
CREATE TABLE "academias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"cidade" text,
	"uf" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"entidade" text NOT NULL,
	"entidade_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"dados_anteriores" jsonb,
	"dados_novos" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"tipo" "categoria_tipo" DEFAULT 'peso' NOT NULL,
	"sexo" "sexo" NOT NULL,
	"faixa" "faixa",
	"classe_idade" text NOT NULL,
	"idade_min" integer,
	"idade_max" integer,
	"limite_peso_kg" numeric(5, 2),
	"min_inscritos" integer DEFAULT 2 NOT NULL,
	"status" "categoria_status" DEFAULT 'aberta' NOT NULL,
	"fundida_em_id" uuid
);
--> statement-breakpoint
CREATE TABLE "chaves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria_id" uuid NOT NULL,
	"formato" "chave_formato" DEFAULT 'eliminacao_simples' NOT NULL,
	"status" "chave_status" DEFAULT 'rascunho' NOT NULL,
	"seed_sorteio" text NOT NULL,
	"gerada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"publicada_em" timestamp with time zone,
	CONSTRAINT "chaves_categoria_id_unique" UNIQUE("categoria_id")
);
--> statement-breakpoint
CREATE TABLE "cupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"tipo" "cupom_tipo" NOT NULL,
	"valor" integer NOT NULL,
	"limite_usos" integer,
	"usos" integer DEFAULT 0 NOT NULL,
	"validade" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizador_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"banner_url" text,
	"descricao" text,
	"endereco" text,
	"cidade" text,
	"uf" text,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"inscricoes_abrem" timestamp with time zone,
	"inscricoes_fecham" timestamp with time zone,
	"limite_alteracoes" timestamp with time zone,
	"status" "evento_status" DEFAULT 'rascunho' NOT NULL,
	"moeda" text DEFAULT 'BRL' NOT NULL,
	"politica_reembolso" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eventos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "inscricoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"evento_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"status" "inscricao_status" DEFAULT 'pendente_pagamento' NOT NULL,
	"nome_atleta" text NOT NULL,
	"faixa" "faixa" NOT NULL,
	"data_nascimento" date NOT NULL,
	"academia_id" uuid,
	"academia_nome" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"preco_centavos" integer NOT NULL,
	"preco_segunda_inscricao_centavos" integer,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lutas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave_id" uuid NOT NULL,
	"rodada" integer NOT NULL,
	"posicao" integer NOT NULL,
	"atleta1_inscricao_id" uuid,
	"atleta2_inscricao_id" uuid,
	"proxima_luta_id" uuid,
	"proxima_luta_slot" integer,
	"vencedor_inscricao_id" uuid,
	"metodo" "luta_metodo",
	"pontos1" integer DEFAULT 0 NOT NULL,
	"vantagens1" integer DEFAULT 0 NOT NULL,
	"punicoes1" integer DEFAULT 0 NOT NULL,
	"pontos2" integer DEFAULT 0 NOT NULL,
	"vantagens2" integer DEFAULT 0 NOT NULL,
	"punicoes2" integer DEFAULT 0 NOT NULL,
	"nome_finalizacao" text,
	"encerrada_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pagamento_inscricoes" (
	"pagamento_id" uuid NOT NULL,
	"inscricao_id" uuid NOT NULL,
	CONSTRAINT "pagamento_inscricoes_pagamento_id_inscricao_id_pk" PRIMARY KEY("pagamento_id","inscricao_id")
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"gateway" text NOT NULL,
	"gateway_cobranca_id" text,
	"metodo" "pagamento_metodo" NOT NULL,
	"cupom_id" uuid,
	"valor_bruto_centavos" integer NOT NULL,
	"desconto_centavos" integer DEFAULT 0 NOT NULL,
	"taxa_plataforma_centavos" integer DEFAULT 0 NOT NULL,
	"taxa_gateway_centavos" integer DEFAULT 0 NOT NULL,
	"valor_liquido_organizador_centavos" integer NOT NULL,
	"status" "pagamento_status" DEFAULT 'criado' NOT NULL,
	"expira_em" timestamp with time zone,
	"pago_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" text,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text,
	"data_nascimento" date,
	"sexo" "sexo",
	"faixa_atual" "faixa",
	"academia_id" uuid,
	"eh_organizador" boolean DEFAULT false NOT NULL,
	"eh_admin" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chaves" ADD CONSTRAINT "chaves_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupons" ADD CONSTRAINT "cupons_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_organizador_id_usuarios_id_fk" FOREIGN KEY ("organizador_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_academia_id_academias_id_fk" FOREIGN KEY ("academia_id") REFERENCES "public"."academias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lutas" ADD CONSTRAINT "lutas_chave_id_chaves_id_fk" FOREIGN KEY ("chave_id") REFERENCES "public"."chaves"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lutas" ADD CONSTRAINT "lutas_atleta1_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("atleta1_inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lutas" ADD CONSTRAINT "lutas_atleta2_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("atleta2_inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lutas" ADD CONSTRAINT "lutas_vencedor_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("vencedor_inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamento_inscricoes" ADD CONSTRAINT "pagamento_inscricoes_pagamento_id_pagamentos_id_fk" FOREIGN KEY ("pagamento_id") REFERENCES "public"."pagamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamento_inscricoes" ADD CONSTRAINT "pagamento_inscricoes_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_cupom_id_cupons_id_fk" FOREIGN KEY ("cupom_id") REFERENCES "public"."cupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_academia_id_academias_id_fk" FOREIGN KEY ("academia_id") REFERENCES "public"."academias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cupons_evento_codigo_idx" ON "cupons" USING btree ("evento_id","codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "inscricoes_usuario_categoria_idx" ON "inscricoes" USING btree ("usuario_id","categoria_id");
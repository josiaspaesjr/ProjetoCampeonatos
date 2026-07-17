CREATE TYPE "public"."colaborador_status" AS ENUM('pendente', 'ativo');--> statement-breakpoint
CREATE TABLE "evento_colaboradores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"email" text,
	"usuario_id" uuid,
	"token" text NOT NULL,
	"status" "colaborador_status" DEFAULT 'pendente' NOT NULL,
	"convidado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"aceito_em" timestamp with time zone,
	CONSTRAINT "evento_colaboradores_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "evento_colaboradores" ADD CONSTRAINT "evento_colaboradores_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_colaboradores" ADD CONSTRAINT "evento_colaboradores_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_colaboradores" ADD CONSTRAINT "evento_colaboradores_convidado_por_usuarios_id_fk" FOREIGN KEY ("convidado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
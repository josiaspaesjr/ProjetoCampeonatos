ALTER TABLE "lutas" ADD COLUMN "cronometro_restante_seg" integer;--> statement-breakpoint
ALTER TABLE "lutas" ADD COLUMN "cronometro_rodando" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lutas" ADD COLUMN "cronometro_atualizado_em" timestamp with time zone;
ALTER TABLE "inscricoes" ADD COLUMN "checkin_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "peso_aferido_kg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "inscricoes" ADD COLUMN "fora_do_peso" boolean DEFAULT false NOT NULL;
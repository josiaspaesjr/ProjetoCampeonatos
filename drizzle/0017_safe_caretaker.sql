CREATE TABLE "evento_dias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"data" date NOT NULL,
	"inicio_minutos" integer DEFAULT 540 NOT NULL,
	"fim_minutos" integer DEFAULT 1080 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evento_dias" ADD CONSTRAINT "evento_dias_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evento_dias_evento_data_idx" ON "evento_dias" USING btree ("evento_id","data");
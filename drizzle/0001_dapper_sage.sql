CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"hora_inicio" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "area_id" uuid;--> statement-breakpoint
ALTER TABLE "categorias" ADD COLUMN "ordem_na_area" integer;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;
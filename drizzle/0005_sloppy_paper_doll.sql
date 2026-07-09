CREATE TYPE "public"."modalidade" AS ENUM('gi_nogi', 'gi', 'nogi');--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "circuito" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "modalidade" "modalidade" DEFAULT 'gi_nogi' NOT NULL;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "num_areas" integer;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "data_pesagem" date;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "faixa_min" "faixa";--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "faixa_max" "faixa";
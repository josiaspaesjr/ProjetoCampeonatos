ALTER TABLE "lutas" ADD COLUMN "proxima_luta_perdedor_id" uuid;--> statement-breakpoint
ALTER TABLE "lutas" ADD COLUMN "proxima_luta_perdedor_slot" integer;--> statement-breakpoint
ALTER TABLE "lutas" ADD COLUMN "fase" text;
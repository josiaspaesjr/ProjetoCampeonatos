DROP INDEX "evento_dias_evento_data_idx";--> statement-breakpoint
CREATE INDEX "evento_dias_evento_data_idx" ON "evento_dias" USING btree ("evento_id","data");
ALTER TABLE "inscricoes" ADD COLUMN "preco_centavos" integer;
--> statement-breakpoint
-- backfill: preço travado a partir da cobrança vinculada mais recente
UPDATE "inscricoes" i SET "preco_centavos" = sub.valor
FROM (
  SELECT pi."inscricao_id" AS inscricao_id,
         p."valor_bruto_centavos" AS valor,
         ROW_NUMBER() OVER (
           PARTITION BY pi."inscricao_id" ORDER BY p."criado_em" DESC
         ) AS rn
  FROM "pagamento_inscricoes" pi
  JOIN "pagamentos" p ON p."id" = pi."pagamento_id"
) sub
WHERE sub.inscricao_id = i."id" AND sub.rn = 1 AND i."preco_centavos" IS NULL;
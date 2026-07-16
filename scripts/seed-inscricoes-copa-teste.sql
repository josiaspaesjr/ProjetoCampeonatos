-- ===========================================================================
-- LeagueMat · Seed de 500 inscrições no evento "copa-teste" (PRODUÇÃO)
-- ---------------------------------------------------------------------------
-- Cria APENAS atletas (usuarios) + inscrições (inscricoes). Nada de chaves,
-- áreas, pagamentos, cronograma etc.
--
-- Distribuição:
--   • 20 inscrições na categoria Adulto · Masculino · Branca · Pena (~70kg),
--     sendo 5 atletas de UMA MESMA academia e 15 de academias variadas.
--   • 480 inscrições espalhadas (round-robin) por TODAS as demais categorias
--     abertas do evento, com academias variadas.
--
-- Pré-requisitos no banco: o evento "copa-teste" já existe e sua GRADE DE
-- CATEGORIAS já foi gerada (inclusive a Adulto/Masculino/Branca/Pena 70kg).
-- O catálogo de academias já está populado.
--
-- Idempotência: os atletas usam e-mails com sufixo fixo
--   atleta.<n>.copateste@seed.leaguemat.test
-- Rodar duas vezes falha no índice único de e-mail. Para desfazer, use o
-- bloco "LIMPEZA" no fim do arquivo.
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Precondições — falha cedo, com mensagem clara, sem inserir nada.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_evento uuid;
  v_target uuid;
  v_pool   int;
  v_ac     int;
BEGIN
  SELECT id INTO v_evento FROM eventos WHERE slug = 'copa-teste';
  IF v_evento IS NULL THEN
    RAISE EXCEPTION 'Evento com slug "copa-teste" não encontrado.';
  END IF;

  SELECT c.id INTO v_target
  FROM categorias c
  WHERE c.evento_id = v_evento
    AND c.classe_idade = 'adulto' AND c.sexo = 'masculino' AND c.faixa = 'branca'
  ORDER BY (c.limite_peso_kg = 70) DESC NULLS LAST, (c.nome ILIKE '%Pena%') DESC, c.nome
  LIMIT 1;
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Categoria Adulto/Masculino/Branca ~70kg (Pena) não encontrada — gere a grade de categorias primeiro.';
  END IF;

  SELECT count(*) INTO v_pool FROM categorias
  WHERE evento_id = v_evento AND status = 'aberta' AND id <> v_target;
  IF v_pool = 0 THEN
    RAISE EXCEPTION 'Não há outras categorias abertas no evento para distribuir as 480 inscrições restantes.';
  END IF;

  SELECT count(*) INTO v_ac FROM academias;
  IF v_ac = 0 THEN
    RAISE EXCEPTION 'Catálogo de academias vazio.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Inserção: 500 atletas + 500 inscrições, em uma única passada.
-- ---------------------------------------------------------------------------
WITH
ev AS (
  SELECT id AS evento_id,
         EXTRACT(YEAR FROM data_inicio)::int AS ano
  FROM eventos WHERE slug = 'copa-teste'
),
-- pools de nomes (determinísticos, indexados pelo nº do atleta)
nm AS (
  SELECT
    ARRAY['João','Pedro','Lucas','Gabriel','Rafael','Bruno','Carlos','Felipe','Rodrigo','Thiago',
          'Matheus','Gustavo','Diego','André','Vinícius','Leonardo','Marcelo','Fernando','Ricardo','Eduardo']::text[] AS m,
    ARRAY['Maria','Ana','Juliana','Fernanda','Camila','Beatriz','Larissa','Amanda','Patrícia','Carolina',
          'Mariana','Gabriela','Isabela','Letícia','Aline','Bruna','Renata','Vanessa','Débora','Priscila']::text[] AS f,
    ARRAY['Silva','Santos','Oliveira','Souza','Pereira','Lima','Costa','Ferreira','Almeida','Rodrigues',
          'Gomes','Martins','Araújo','Barbosa','Ribeiro','Carvalho','Nogueira','Teixeira','Moraes','Cardoso']::text[] AS s
),
-- academias ranqueadas (para variar) + total
ac AS (
  SELECT id, nome,
         (row_number() OVER (ORDER BY nome))::int - 1 AS rn,
         (count(*) OVER ())::int AS total
  FROM academias
),
-- a "mesma academia" dos 5 atletas do grupo alvo (Alliance > Gracie Barra > 1ª alfabética)
same_ac AS (
  SELECT id, nome FROM academias
  ORDER BY (nome ILIKE 'Alliance%') DESC, (nome ILIKE 'Gracie Barra%') DESC, nome
  LIMIT 1
),
-- categoria alvo: Adulto · Masculino · Branca · ~70kg (Pena)
target_cat AS (
  SELECT c.id, c.sexo, c.faixa, c.idade_min, c.idade_max
  FROM categorias c, ev
  WHERE c.evento_id = ev.evento_id
    AND c.classe_idade = 'adulto' AND c.sexo = 'masculino' AND c.faixa = 'branca'
  ORDER BY (c.limite_peso_kg = 70) DESC NULLS LAST, (c.nome ILIKE '%Pena%') DESC, c.nome
  LIMIT 1
),
-- demais categorias abertas (para os 480), ranqueadas + total
pool AS (
  SELECT c.id, c.sexo, c.faixa, c.idade_min, c.idade_max,
         (row_number() OVER (ORDER BY c.classe_idade, c.faixa, c.sexo, c.limite_peso_kg NULLS LAST, c.nome))::int - 1 AS rn,
         (count(*) OVER ())::int AS total
  FROM categorias c, ev, target_cat t
  WHERE c.evento_id = ev.evento_id AND c.status = 'aberta' AND c.id <> t.id
),
-- Parte A: 20 na categoria alvo (i<=5 mesma academia; i>5 variadas)
partA AS (
  SELECT
    g.i AS seq,
    t.id AS categoria_id, t.sexo, t.faixa, t.idade_min, t.idade_max,
    CASE WHEN g.i <= 5 THEN (SELECT id   FROM same_ac)
         ELSE (SELECT id   FROM ac WHERE rn = (g.i * 137) % (SELECT total FROM ac LIMIT 1)) END AS academia_id,
    CASE WHEN g.i <= 5 THEN (SELECT nome FROM same_ac)
         ELSE (SELECT nome FROM ac WHERE rn = (g.i * 137) % (SELECT total FROM ac LIMIT 1)) END AS academia_nome
  FROM target_cat t, generate_series(1, 20) AS g(i)
),
-- Parte B: 480 espalhadas nas demais categorias abertas (round-robin)
partB AS (
  SELECT
    20 + g.j AS seq,
    p.id AS categoria_id, p.sexo, p.faixa, p.idade_min, p.idade_max,
    (SELECT id   FROM ac WHERE rn = ((20 + g.j) * 137 + 61) % (SELECT total FROM ac LIMIT 1)) AS academia_id,
    (SELECT nome FROM ac WHERE rn = ((20 + g.j) * 137 + 61) % (SELECT total FROM ac LIMIT 1)) AS academia_nome
  FROM generate_series(1, 480) AS g(j)
  JOIN pool p ON p.rn = (g.j - 1) % (SELECT total FROM pool LIMIT 1)
),
-- plano final (MATERIALIZED garante avaliação única — usado 2x abaixo)
plan AS MATERIALIZED (
  SELECT
    x.seq,
    (SELECT evento_id FROM ev) AS evento_id,
    x.categoria_id,
    x.sexo,
    x.faixa,
    x.academia_id,
    x.academia_nome,
    -- idade dentro da faixa etária da categoria; nascido em 1º/jan => idade exata no ano do evento
    (SELECT ano FROM ev)
      - (x.idade_min + (x.seq % (COALESCE(x.idade_max, x.idade_min + 19) - x.idade_min + 1))) AS ano_nasc,
    (CASE WHEN x.sexo = 'masculino' THEN nm.m[(x.seq % 20) + 1] ELSE nm.f[(x.seq % 20) + 1] END)
      || ' ' || nm.s[((x.seq / 20) % 20) + 1]
      || ' ' || nm.s[((x.seq / 3 + 7) % 20) + 1] AS nome,
    'atleta.' || x.seq || '.copateste@seed.leaguemat.test' AS email
  FROM (SELECT * FROM partA UNION ALL SELECT * FROM partB) x
  CROSS JOIN nm
),
-- cria os atletas
new_users AS (
  INSERT INTO usuarios (nome, email, data_nascimento, sexo, faixa_atual, academia_id)
  SELECT nome, email, make_date(ano_nasc, 1, 1), sexo, faixa, academia_id
  FROM plan
  RETURNING id, email
)
-- cria as inscrições (snapshot igual ao fluxo de inscrição manual do app)
INSERT INTO inscricoes
  (usuario_id, evento_id, categoria_id, status, nome_atleta, faixa, data_nascimento, academia_id, academia_nome)
SELECT u.id, p.evento_id, p.categoria_id, 'confirmada', p.nome, p.faixa,
       make_date(p.ano_nasc, 1, 1), p.academia_id, p.academia_nome
FROM plan p
JOIN new_users u ON u.email = p.email;

COMMIT;

-- ---------------------------------------------------------------------------
-- 2) Conferência (read-only) — rode junto para validar o resultado.
-- ---------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM inscricoes i
     JOIN usuarios u ON u.id = i.usuario_id
     WHERE u.email LIKE 'atleta.%.copateste@seed.leaguemat.test')                       AS inscricoes_criadas,
  (SELECT count(*) FROM inscricoes i
     JOIN categorias c ON c.id = i.categoria_id
     JOIN eventos e ON e.id = i.evento_id
     WHERE e.slug = 'copa-teste' AND c.classe_idade = 'adulto'
       AND c.sexo = 'masculino' AND c.faixa = 'branca'
       AND (c.limite_peso_kg = 70 OR c.nome ILIKE '%Pena%'))                          AS na_categoria_alvo,
  (SELECT count(DISTINCT i.categoria_id) FROM inscricoes i
     JOIN usuarios u ON u.id = i.usuario_id
     WHERE u.email LIKE 'atleta.%.copateste@seed.leaguemat.test')                       AS categorias_distintas,
  (SELECT count(DISTINCT i.academia_id) FROM inscricoes i
     JOIN usuarios u ON u.id = i.usuario_id
     WHERE u.email LIKE 'atleta.%.copateste@seed.leaguemat.test')                       AS academias_distintas;

-- Detalhe das academias na categoria alvo (deve mostrar 1 academia com 5 inscritos):
-- SELECT i.academia_nome, count(*) AS inscritos
-- FROM inscricoes i
-- JOIN categorias c ON c.id = i.categoria_id
-- JOIN eventos e ON e.id = i.evento_id
-- WHERE e.slug = 'copa-teste' AND c.classe_idade = 'adulto'
--   AND c.sexo = 'masculino' AND c.faixa = 'branca'
--   AND (c.limite_peso_kg = 70 OR c.nome ILIKE '%Pena%')
-- GROUP BY i.academia_nome ORDER BY inscritos DESC;

-- ===========================================================================
-- LIMPEZA — desfaz TUDO que este script criou (rode só se precisar refazer):
-- ===========================================================================
-- BEGIN;
--   DELETE FROM inscricoes
--     WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE 'atleta.%.copateste@seed.leaguemat.test');
--   DELETE FROM usuarios WHERE email LIKE 'atleta.%.copateste@seed.leaguemat.test';
-- COMMIT;

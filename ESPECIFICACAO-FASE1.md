# Plataforma de Campeonatos de BJJ — Especificação Fase 1

> Nome provisório: BJJCAMP (a definir). Referência de mercado: Smoothcomp.
> Objetivo da Fase 1: um organizador consegue criar um evento, receber inscrições pagas via Pix, gerar chaves e publicar resultados — utilizável em um campeonato real de pequeno/médio porte (até ~500 atletas).

---

## 1. Escopo

### Dentro da Fase 1
- Cadastro de organizador e criação de evento com página pública
- Categorias no padrão CBJJ (idade × faixa × peso × sexo) + categorias customizadas + absoluto
- Inscrição do atleta com validação de categoria, múltiplas inscrições por atleta
- Pagamento via Pix e cartão (gateway nacional), cupons e lotes (early bird / lote final)
- Cancelamento e reembolso controlados pelo organizador
- Geração automática de chaves (eliminação simples; dupla e round robin se couber sem atrasar)
- Lançamento de resultados luta a luta (pontos, vantagens, punições, finalização, WO, desqualificação)
- Página pública: evento, lista de inscritos por categoria, chaves, resultados e pódio
- Painel do organizador: dashboard de inscrições e financeiro básico

### Fora da Fase 1 (Fases 2 e 3)
- Cronograma com estimativa em tempo real, fila de lutas por área
- Placar digital em tablet, TV-Mode, check-in/pesagem com QR code
- Notificações (WhatsApp/push), app do atleta
- Streaming, overlay, PPV
- Ranking de circuito, filiações/membership, subdomínios de liga

---

## 2. Perfis de usuário

| Perfil | O que faz |
|---|---|
| **Atleta** | cria conta, se inscreve, paga, acompanha chave e resultado |
| **Organizador** | cria e gerencia eventos, categorias, inscrições, chaves, resultados, financeiro |
| **Staff do evento** (Fase 1 simplificado) | conta convidada pelo organizador com permissão de lançar resultados |
| **Público** (sem login) | vê página do evento, inscritos, chaves e resultados |
| **Admin da plataforma** | gestão de organizadores, taxas, suporte |

Um mesmo usuário pode ser atleta e organizador (papéis, não contas separadas).

---

## 3. Modelo de dados (entidades principais)

```
Usuario 1─N InscricaoAtleta N─1 Evento
Usuario N─1 Academia
Evento 1─N Categoria 1─N Inscricao
Categoria 1─1 Chave 1─N Luta
Inscricao 1─N Pagamento
```

### Usuario
- id, nome, email, senha (ou OAuth Google), telefone, data_nascimento, sexo
- faixa_atual, peso_declarado, academia_id
- papel: atleta | organizador | admin (múltiplos)

### Academia
- id, nome, cidade/UF, responsável (livre na Fase 1 — sem verificação)
- Usada para: filtro "separar mesma equipe na 1ª rodada" e pódio por equipes

### Evento
- id, organizador_id, nome, slug (URL pública), banner, descrição (rich text)
- local (endereço, cidade/UF), data(s) do evento
- janela de inscrição (abre/fecha), data-limite para trocas/reembolso
- status: rascunho → publicado → inscrições encerradas → em andamento → finalizado
- config: moeda (BRL), permite absoluto, política de reembolso, regra de pontuação (CBJJ padrão)

### Lote (pricing)
- evento_id, nome (1º lote / 2º lote / lote final), preço, vigência (data início/fim)
- preço adicional para 2ª inscrição do mesmo atleta (ex.: absoluto mais barato)

### Cupom
- evento_id, código, tipo (% ou valor fixo), limite de usos, validade

### Categoria
- evento_id, nome gerado (ex.: "Adulto / Masculino / Azul / Leve (76kg)")
- sexo, faixa (branca→preta), classe de idade (Kids 1..3, Juvenil, Adulto, Master 1..7), limite de peso (com/sem kimono conforme regra), tipo (peso | absoluto | custom)
- min_inscritos para acontecer (default 2), status (aberta | fechada | fundida em outra)
- Seed inicial: gerador de grade CBJJ completa + edição/remoção pelo organizador

### Inscricao
- id, usuario_id, evento_id, categoria_id, academia_id (snapshot no momento da inscrição)
- status: pendente_pagamento → confirmada → cancelada | reembolsada
- Snapshot dos dados do atleta (nome, faixa, peso, nascimento) — o histórico do evento não muda se o perfil mudar depois
- Troca de categoria permitida até a data-limite (auditada)

### Pagamento
- inscricao_ids (um checkout pode conter várias inscrições do mesmo atleta)
- gateway, método (pix | cartão), valor bruto, taxa da plataforma, taxa do gateway, valor líquido do organizador
- status: criado → pago → expirado | estornado (via webhook do gateway)

### Chave (Bracket)
- categoria_id, formato (eliminação simples | dupla | round robin), status (rascunho | publicada | em andamento | concluída)
- Gerada a partir das inscrições confirmadas; regenerável enquanto rascunho; swap manual de posições antes de publicar
- Regras de geração: byes para completar potência de 2, separação de atletas da mesma academia na 1ª rodada (best effort), sorteio aleatório com seed registrada (auditável)

### Luta (Match)
- chave_id, rodada, posição, atleta1_id, atleta2_id (null = bye/aguardando)
- proxima_luta_id (encadeamento do avanço)
- resultado: vencedor, método (pontos | vantagens | finalização | decisão | WO | DQ), placar (pontos/vantagens/punições por atleta), nome da finalização (opcional)
- Correção de resultado permitida com auditoria (quem, quando, valor anterior)

### Resultado/Pódio
- Derivado (não é tabela): 1º/2º/3º por categoria a partir da chave concluída; pódio por equipes = soma de pontos (9/3/1 configurável)

---

## 4. Regras de negócio críticas

1. **Múltiplas inscrições, um atleta**: atleta pode se inscrever no peso e no absoluto. Preço por inscrição definido nos lotes. (Monetização por "crédito por atleta" fica registrada como decisão futura — o modelo de dados já separa atleta de inscrição para suportar qualquer um dos dois.)
2. **Validação de categoria**: idade calculada pelo ano de nascimento (regra CBJJ), faixa declarada pelo atleta. Organizador pode mover atleta de categoria a qualquer momento antes da chave ser publicada.
3. **Categoria com poucos inscritos**: com < min_inscritos no fechamento, o organizador escolhe: reembolsar, ou fundir com categoria adjacente (peso acima / idade abaixo) — fusão manual assistida na Fase 1.
4. **Chave publicada é contrato**: depois de publicada, mudanças só por ação explícita do organizador com registro de auditoria. Nada de regeneração silenciosa.
5. **Dinheiro**: a plataforma nunca deve bloquear inscrição por instabilidade do gateway sem deixar claro o estado. Pix expira → inscrição volta a pendente e vaga não é reservada indefinidamente (TTL de 30 min no checkout).
6. **Reembolso** segue a política configurada no evento (ex.: 100% até X dias antes, 0% depois), executado pelo organizador com um clique (estorno via gateway).

---

## 5. Fluxos de tela

### Atleta
1. Recebe link do evento → página pública (banner, data, local, categorias, preços do lote vigente, inscritos)
2. "Inscrever-se" → login/cadastro rápido (Google ou email) → completa perfil (nascimento, faixa, academia — autocomplete com criação livre)
3. Escolhe categoria(s) — o sistema mostra só as compatíveis com idade/sexo e pré-seleciona pela faixa
4. Checkout: resumo, cupom, escolha Pix (QR + copia-e-cola) ou cartão → confirmação em tempo real via webhook
5. "Minhas inscrições": comprovante, troca de categoria (até a data-limite), cancelamento conforme política
6. Depois do fechamento: vê sua chave; depois do evento: resultado e pódio

### Organizador
1. Onboarding: cria conta organizador → conecta recebimento (subconta no gateway / split)
2. Criar evento: dados básicos → gerador de categorias (grade CBJJ com checkboxes por classe de idade/faixa, edição livre) → lotes e política de reembolso → publicar (gera página pública)
3. Dashboard: inscrições por dia, receita, inscritos por categoria (alerta de categorias com 0–1 inscritos), busca/edição de inscrição, inscrição manual (atleta pago por fora)
4. Encerramento: fecha inscrições → resolve categorias insuficientes (fusão/reembolso) → gera chaves → revisa (swap manual) → publica chaves
5. Dia do evento (Fase 1, sem placar ao vivo): lista de lutas por categoria → lança resultado de cada luta (form rápido: vencedor + método + placar) → chave avança automaticamente → categoria concluída gera pódio
6. Pós-evento: publica resultados, exporta CSV (inscritos, financeiro, resultados)

### Público
- `/evento/{slug}`: informações, inscritos por categoria (agrupados por academia), chaves navegáveis, resultados ao vivo (polling na Fase 1), pódio individual e por equipes

---

## 6. Stack e arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | full-stack em um projeto, SSR para páginas públicas (SEO de eventos), server actions para o painel |
| Banco | **PostgreSQL (Supabase)** | relacional (chaves/lutas são grafo relacional), auth pronta, Realtime nativo que a Fase 2 vai usar para placar/cronograma sem trocar de stack |
| ORM | **Drizzle** | schema tipado, migrações versionadas |
| Pagamentos | **Dupla trilha atrás de abstração comum**: nacional (Asaas ou Mercado Pago — Pix, split, subcontas) + internacional (Stripe — cartão internacional, multi-moeda, como o Smoothcomp) | O gateway é escolhido pela moeda/país do evento; a interface `GatewayPagamento` isola o domínio dos SDKs, permitindo adicionar PayPal etc. depois |
| UI | **Tailwind + shadcn/ui** | velocidade, PT-BR, mobile-first (atleta se inscreve pelo celular — assumir 80% mobile) |
| Hospedagem | **Vercel** + Supabase cloud | zero ops na Fase 1 |
| E-mail transacional | Resend | confirmação de inscrição/pagamento |

Decisões de arquitetura que protegem a Fase 2:
- **Chave/Luta como fonte única de verdade** com eventos de domínio (resultado lançado → avanço na chave) — o placar em tablet da Fase 2 pluga nesse mesmo fluxo via Supabase Realtime.
- **Snapshot de dados na inscrição** — relatórios e chaves imunes a edição de perfil.
- **Toda mutação sensível auditada** (troca de categoria, correção de resultado, regeneração de chave).
- Motor de chaveamento como **módulo puro e testado isoladamente** (entrada: lista de inscritos + config; saída: árvore de lutas) — é o coração do produto, precisa de testes exaustivos de byes/seeds/separação de equipe.

---

## 7. Como rodar (dev)

- **Com Supabase local (auth real + Postgres)**: Docker aberto → `npx supabase start` → `.env.local` com `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (valores do `npx supabase status`) → `npx drizzle-kit migrate` → `npm run dev`.
- **Sem Supabase (modo leve)**: apague/renomeie `.env.local` e rode `npm run dev` — cai no PGlite (banco embutido em `./.pglite`) com organizador dev fixo e sessão de atleta por cookie.
- Testes do motor: `npm test`. Pagamentos sem chaves de gateway usam o simulador (botão no checkout).

## 8. Decisões em aberto (não bloqueiam o início)

1. **Monetização**: crédito por atleta (modelo Smoothcomp) vs. % sobre inscrição retida no split. O split do Asaas favorece o modelo percentual; o schema suporta ambos.
2. **Nome e domínio** — placeholder "BJJCAMP".
3. **Gateway definitivo**: DECIDIDO — dupla trilha nacional + internacional atrás de abstração comum (`GatewayPagamento`). Pendente apenas: Asaas vs. Mercado Pago como trilha nacional (validar taxas de split e prazo de repasse).
4. **Alvo de lançamento**: organizador independente vs. liga parceira (define prioridade do gerador de grade CBJJ vs. categorias customizadas).

---

## 9. Critério de pronto da Fase 1

Um campeonato real de ~300 atletas roda de ponta a ponta na plataforma: inscrições pagas via Pix sem intervenção manual, chaves geradas e publicadas antes do evento, resultados lançados durante o dia e pódio publicado ao final — com o organizador usando apenas o painel, sem planilha paralela.

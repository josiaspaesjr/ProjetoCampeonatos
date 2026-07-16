# Handoff: LeagueMat — Sistema de Competições de Jiu-Jitsu (design v3)

> Este pacote descreve o **design e o layout** de todas as telas do LeagueMat, além das **mudanças de campos** por tela. Os arquivos `.dc.html` são **referências de design** (protótipos em HTML), **não** código de produção — recrie-os no framework do codebase alvo (React/Vue/Svelte etc.), puxando os dados dinâmicos do backend.

---

## 1. Visão geral do produto

LeagueMat é uma plataforma SaaS para rodar competições de jiu-jitsu de ponta a ponta: publicação de eventos, inscrição de atletas, pesagem, chaveamento ao vivo, arbitragem e ranking oficial.

**Fluxo público (atleta/visitante):** Landing → Eventos (catálogo) → Evento (página pública) → Inscrição (3 passos).
**Fluxo organizador:** "Criar evento" (na landing) → Login → Criar Evento → Console do Organizador.

Telas neste pacote:
1. **Landing** — marketing do produto (não lista eventos; só vende a plataforma).
2. **Eventos** — catálogo com busca/filtros de todos os eventos.
3. **Evento** — página pública de um evento (categorias, equipes, CTA de inscrição).
4. **Inscrição** — cadastro do atleta em 3 passos (dados → Pix → confirmação).
5. **Login** — acesso do organizador (split-screen).
6. **CriarEvento** — formulário de criação de evento.
7. **Organizador** — painel de gestão do evento (dashboard com sidebar).

---

## 2. Sistema visual (design system v3)

Direção: **athletic / fight-club** (inspirada em temas esportivos de clube de luta). Impacto por escala tipográfica e contraste, não por gradientes. Fidelidade **alta** — reproduzir cores, tipografia e espaçamento fielmente. Copy final em **pt-BR**.

### Cores
| Token | Hex | Uso |
|---|---|---|
| bg | `#0C0C0D` | Fundo principal (quase-preto). Dashboard usa `#0A0A0B`. |
| surface | `#111112` | Cards, painéis. |
| surface-input | `#131314` / `#141416` | Inputs, selects. |
| ink | `#F5F3EF` | Texto primário (branco quente). |
| accent (vermelho) | `#EE2E24` | Cor de marca / CTAs / destaques / preços. |
| accent-soft | `#EE9A94` | Texto de acento sobre escuro (badges, links, prazos). |
| text-2 | `#C9C6BF` | Texto secundário / parágrafos. |
| muted | `#9C9A93` | Rótulos, meta. |
| muted-2 | `#6B6A64` | Placeholders, faint, desabilitado. |
| success | `#7BD88F` | Status "confirmada". |
| light-section | `#F5F3EF` (fundo) / `#0C0C0D` (texto) | Seção clara alternada (mistura claro/escuro). |
| hairline | `rgba(255,255,255,0.06–0.12)` | Bordas / divisores. |
| input border | `rgba(255,255,255,0.14)`; foco → `#EE2E24` | |

**Faixas (swatches de categoria):** Branca `#F5F3EF`, Cinza `#9CA3AF`, Amarela `#FACC15`, Laranja `#FB923C`, Verde `#22C55E`, Azul `#2563EB`, Roxa `#7C3AED`, Marrom `#78350F`, Preta `#111`.

### Tipografia (Google Fonts)
- **Teko** (500/600/700) — display/títulos/números. Sempre `text-transform:uppercase`, `line-height:0.82`. Classe `.disp`.
- **Barlow Condensed** (500/600/700) — rótulos, botões, chips, itens de tabela. Uppercase. Classe `.cond`.
- **Barlow** (400/500/600) — corpo de texto, inputs.
- Números que se alinham usam `font-variant-numeric: tabular-nums` (classe `.tnum`).

Escala: hero H1 `clamp(80px,13vw,200px)`; título de seção 40–72px (Teko); título de card 26–34px; corpo 15–19px; rótulos/eyebrows 13–15px (Barlow Condensed, uppercase, letter-spacing 0.04–0.14em).

### Motivos de layout (importantes)
- **Skew de −9°:** logo, botões primários, badges e chips usam `transform: skewX(-9deg)` no container com um `<span>` interno em `transform: skewX(9deg)` para "desentortar" o texto. É a assinatura visual — manter.
- **Sem border-radius** em botões/cards/inputs (cantos retos). Sem sombras; profundidade vem de surfaces + hairlines.
- **Barra de acento vermelha:** cards de destaque têm uma faixa vertical de 4–5px `#EE2E24` na borda esquerda (`position:absolute; left:0; width:5px; height:100%`).
- **Palavras/números "fantasma":** textos gigantes em `rgba(255,255,255,0.03–0.06)` atrás de seções (ex.: "JIU-JITSU", "CALENDÁRIO", UF do estado, "ARENA", números de passo "01/02").
- **Seção clara inclinada:** blocos com `transform: skewY(-1.2deg)` e conteúdo interno com `skewY(1.2deg)` para compensar (mistura claro/escuro).
- **Ticker/marquee** vermelho com `@keyframes` (conteúdo duplicado p/ loop) levemente inclinado.
- **Pontos "ao vivo"** pulsam via `@keyframes` (opacity 1→0.3).

### Espaçamento
Padding lateral das páginas públicas: `48px`. Ritmo vertical de seção: 72–110px. Dashboard: conteúdo com padding `32–40px`; sidebar 248px.

---

## 3. Telas — layout e conteúdo

### 3.1 Landing (`Landing.dc.html`)
Marketing da plataforma. **Não lista eventos** (decisão do cliente: a home só vende o produto).
- **Nav sticky:** logo, links (Eventos → catálogo, Ranking, Ao vivo), **seletor de idioma PT/EN/ES**, CTA "Criar evento" (skew) → Login.
- **Hero:** imagem de ação de fundo (drag-and-drop), overlay escuro lateral, palavra "JIU-JITSU" fantasma, badge com ponto pulsante, H1 gigante ("Toda competição. / Uma arena."), parágrafo + 2 CTAs.
- **Ticker** vermelho inclinado.
- **Features + stats:** card de recursos (barra de acento) com 4 itens + grid de 4 stats.
- **Como funciona** (seção clara inclinada): 4 passos numerados.
- **Ao vivo / Ranking:** demo de chaveamento em tempo real + tabela de ranking (prova de recursos, não eventos).
- **CTA final** ("O tatame, organizado.") + footer.
- **i18n:** seletor PT/EN/ES troca toda a copy em runtime; escolha persistida em `localStorage['leaguemat_lang']`. Dicionário completo embutido no componente (pt/en/es). Nomes próprios (atletas/equipes) não são traduzidos. **Só a landing tem i18n até agora** — as demais telas estão em pt-BR e podem receber o mesmo seletor.

### 3.2 Eventos — catálogo (`Eventos.dc.html`)
- Header com "CALENDÁRIO" fantasma + "Todos os eventos".
- **Barra de filtros sticky:** busca (nome/cidade) + chips (Todos, Inscrições abertas, Gi, No-Gi, Em breve) + contador de resultados.
- **Evento em destaque** (banner grande) quando sem filtro/busca.
- **Grade de cards** (3 col) com foto, badge de status (aberto = vermelho; em breve = neutro), data grande. **As datas exibem o ano** (ex.: "MAR 2026"; destaque "14 MAR 2026"). Estado vazio quando nada corresponde.
- Cards e destaque linkam para a página do evento.

### 3.3 Evento — página pública (`Evento.dc.html`)
- **Nav:** voltar aos eventos, âncora Categorias, CTA "Inscrever-se".
- **Hero** (clamp 440–640px): imagem do evento (drag-and-drop), overlay, badges ("Inscrições abertas" + circuito), H1, linha meta (data · cidade/UF · ginásio) com diamantes.
- **Sobre:** parágrafo + grade de 4 "fatos" (Modalidade, Áreas, Faixas abreviadas, Pesagem — pesagem em vermelho).
- **Categorias:** filtros (Todas, Adulto, Master 1, Juvenil, Feminino, Preta) + lista com swatch de faixa e contagem de inscritos.
- **Sidebar sticky:** card de inscrição (barra de acento) com preço grande, "Inscrever-se →", "Cronograma ao vivo", prazos (fechamento, 2ª categoria, pagamento); card de **equipes** confirmadas.
- Rodapé padrão.

### 3.4 Inscrição — atleta (`Inscricao.dc.html`)
Fluxo de 3 passos numa tela só, com **resumo lateral ao vivo**. Progresso em nós de losango (skew): passos concluídos viram ✓.
- **Passo 1 — Dados:** Nome*, E-mail*, Nascimento* (date), Sexo* (select), Faixa* (select), Academia/equipe, **Categoria*** (só aparece quando nascimento+sexo+faixa preenchidos; opções filtradas pelo perfil — classes de peso dependem do sexo; divisão de idade calculada do ano de nascimento). Botão "Continuar" desabilitado até nome, e-mail, perfil e categoria válidos.
- **Passo 2 — Pagamento:** card com total, **QR + Pix copia-e-cola** (botão copiar com feedback), contagem regressiva de expiração, "Simular pagamento aprovado" (apenas dev — em produção vem do provedor Pix via webhook).
- **Passo 3 — Confirmação:** ✓, categoria confirmada, e-mail do comprovante.
- **Sidebar:** imagem do evento, nome/data, resumo (Atleta/Faixa/Divisão/Categoria) atualizado em tempo real, taxa de inscrição.

**Tabelas de peso (por sexo)** e **divisão de idade** são a fonte da verdade compartilhada com o gerador do organizador:
- Idade (contra o ano do evento): ≤15 Infantojuvenil, ≤17 Juvenil, ≤29 Adulto, ≤35 Master 1, ≤40 Master 2, senão Master 3.
- Pesos Masculino: Galo -57.5 / Pluma -64 / Pena -70 / Leve -76 / Médio -82.3 / Meio-Pesado -88.3 / Pesado -94.3 / Super-Pesado -100.5 / Pesadíssimo +100.5 / (+ Absoluto).
- Pesos Feminino: Galo -48.5 / Pluma -53.5 / Pena -58.5 / Leve -64 / Médio -69 / Meio-Pesado -74 / Pesado -79.3 / Super-Pesado +79.3 / (+ Absoluto).

### 3.5 Login (`Login.dc.html`)
- **Split-screen:** painel de marca à esquerda (imagem de ação, palavra "TATAME" fantasma, headline Teko, badge "Área do organizador"); formulário à direita (E-mail, Senha, "Manter conectado", "Entrar →", divisor "ou", "Continuar com Google", link "Criar conta de organizador").
- Entrar → Criar Evento (no protótipo).

### 3.6 Criar Evento (`CriarEvento.dc.html`)
Formulário de criação. Topbar de organizador + título com "NOVO" fantasma.
**Campos (estado atual — mudanças aplicadas):**
- **Imagem de capa** (banner, drag-and-drop).
- Nome do evento* · **Circuito/temporada** (linha inteira — *o campo "Etapa nº" foi REMOVIDO*).
- Data do evento* · Inscrições fecham em (datetime-local).
- Cidade · UF · Moeda (grid 1fr / 90px / 220px).
- Endereço / ginásio.
- Descrição (textarea).
- **Detalhes da competição:** Modalidade (Gi+No-Gi/Gi/No-Gi), Nº de áreas, Data da pesagem, Faixa mínima, Faixa máxima.
- **Inscrição & valores:** Preço 1ª inscrição*, 2ª categoria (adicional).
- **Aviso** (callout vermelho): "Configurações avançadas — lotes, categorias, áreas e chaveamento — ficam disponíveis no painel do organizador após criar o evento."
- Ações: Cancelar · "Criar evento →" → Console do Organizador.

> **Mudança de campos importante:** o conjunto de campos de criação foi ampliado para **cobrir tudo que a página pública do evento exibe** (modalidade, áreas, faixas, pesagem, preços). Em seguida o campo **"Etapa nº" foi removido** a pedido do cliente.

### 3.7 Console do Organizador (`Organizador.dc.html`)
**Redesenhado como dashboard** (não mais blocos empilhados):
- **Sidebar fixa (248px):** logo; **seletor de evento ativo** (nome + data curta); menu com ícones e badges de contagem — Visão geral, Inscrições (312), Categorias (nº), Lotes (nº), Áreas, Check-in, Chaves; usuário no rodapé (avatar + Sair). Clique troca a seção (client-side, sem reload).
- **Top bar:** título da seção (trunca), badge de status, "Ver página ↗", **"✎ Editar evento"**, "Gerar chaves →". A top bar usa `flex-wrap` para não sobrepor em larguras menores.
- **Seção Visão geral:** card banner do evento (capa + circuito + nome + chips de infos); 4 stats (Inscrições, Categorias, Lotes, Receita); card **Preparação** com barra de progresso e checklist clicável (cada item navega à seção); tabela de **inscrições recentes** com status colorido.
- **Seção Lotes:** lista de lotes (nome, badge "vigente", período, preço, excluir) + card "Novo lote" (nome, preço, 2ª inscrição, início, fim, adicionar). Add/remove funcionais.
- **Seção Categorias:** **Gerador de grade CBJJ** — checkboxes de Classes (Pré-Mirim…Master 7, com faixas etárias), Sexo (+"Incluir absoluto"), Faixas (com swatches). "Gerar categorias" faz o **produto cartesiano** classes × sexos × faixas × tabela de pesos. Lista gerada em 2 colunas (swatch + rótulo + excluir), limitada a 40 linhas com rodapé "+N adicionais".
- **Áreas/Check-in/Chaves:** estados "disponível ao encerrar inscrições".

---

## 4. "Editar evento" (edição do cadastro) — comportamento

Presente no **Console do Organizador** (botão "✎ Editar evento" na top bar). Abre um **drawer lateral** (direita, ~480px, overlay escuro, animação de entrada) que edita **todas as informações de cadastro** do evento:

Campos do drawer: Nome, Circuito/temporada, Data do evento, Inscrições fecham (datetime-local), Cidade, UF, Moeda, Endereço/ginásio, Modalidade, Nº de áreas, Faixa mín, Faixa máx, Data da pesagem, Descrição.

Mecânica (padrão a replicar em produção):
- Ao abrir, cria um **rascunho** (`draft`) = cópia do evento atual.
- Os inputs editam só o rascunho (edição isolada).
- **Salvar alterações:** commita `draft → ev`; o cabeçalho/dashboard reflete ao vivo (nome, linha meta "dd/mm/aaaa · Cidade/UF · Moeda") e **regenera o slug** da página pública a partir do novo nome (`slugify`).
- **Cancelar** (ou clique no overlay): descarta o rascunho.

> Observação: o mesmo padrão de drawer de edição pode ser reaproveitado na página pública do evento se desejado (não ligado por padrão).

---

## 5. Interações & estado (resumo p/ produção)
- **Navegação entre páginas:** links relativos entre as telas. Em produção, mapear para rotas (`/`, `/eventos`, `/eventos/:slug`, `/eventos/:slug/inscricao`, `/login`, `/organizador/eventos/novo`, `/organizador/:id`).
- **Filtros/busca** (Eventos, Categorias do evento) e **troca de seção** (dashboard) são estado local.
- **Inscrição:** passos em estado; categoria recalculada quando sexo/faixa/nascimento mudam; countdown do Pix decrementa a cada segundo; "aprovar" é afordância de dev.
- **Lotes / gerador de categorias / editar evento:** todos com estado local funcional — em produção, persistir via API de eventos. A geração da grade CBJJ idealmente é validada no servidor contra o regulamento.
- **i18n:** só a landing; persistência em `localStorage`.

## 6. Requisitos de dados (produção)
- `GET /events` (catálogo), `GET /events/:id` (página do evento: detalhes, categorias + contagens, equipes, prazos), `GET /ranking?category=`.
- `POST /events` (criar) e `PATCH /events/:id` (editar cadastro — os campos do drawer).
- `POST /events/:id/registrations` (inscrição pendente) → cobrança Pix → webhook/polling de aprovação → confirmação + e-mail.
- Lotes e categorias como sub-recursos do evento.

## 7. Assets
- **Fontes:** Teko, Barlow Condensed, Barlow (Google Fonts).
- **image-slot.js:** web component de placeholder drag-and-drop usado no protótipo (hero da landing/evento, capa no criar/organizador, fundo do login). Em produção, trocar por `<img>`/background ligado à imagem enviada do evento.
- **QR do Pix:** placeholder em CSS grid — renderizar QR real do payload em produção.
- **Logo/ícones:** marca é texto ("BJJ" + "ARENA" em vermelho) ao lado de um "B" em bloco vermelho com skew; ícones de menu são glifos. Sem arquivos de imagem obrigatórios.

## 8. Arquivos
- `Landing.dc.html` — marketing + seletor de idioma PT/EN/ES.
- `Eventos.dc.html` — catálogo com busca/filtros.
- `Evento.dc.html` — página pública do evento.
- `Inscricao.dc.html` — inscrição do atleta (3 passos + Pix).
- `Login.dc.html` — login do organizador (split-screen).
- `CriarEvento.dc.html` — criação de evento (campos atualizados; sem "Etapa nº").
- `Organizador.dc.html` — dashboard com sidebar + drawer "Editar evento".
- `image-slot.js` — placeholder de imagem (só protótipo).

Todos são protótipos HTML autocontidos (estilos inline, lógica embutida). Abra qualquer um no navegador para ver o design e o comportamento antes de implementar.

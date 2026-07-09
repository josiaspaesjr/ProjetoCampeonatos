# Handoff — Console do Organizador · Seção **Lotes**

> Arquivo de referência da seção **Lotes** do `Organizador.dc.html` (design v3, tema escuro + vermelho). Descreve layout, comportamento e regras. Recriar no framework do codebase; dados vêm da API (lotes como sub-recurso do evento).

## Objetivo
Gerenciar as **janelas de preço** (lotes) de um evento. O lote **vigente** (data de hoje dentro do intervalo) é o preço aplicado automaticamente na inscrição.

## Layout (topo → base)
1. **Resumo — 3 cards** (grid 3 col, cada um com barra de acento vermelha à esquerda):
   - **Lotes** — total de janelas.
   - **Faixa de preço** — menor preço; sub "até {maior}" (ou "preço único").
   - **Vigente agora** — preço do lote ativo + nome (ou "—/nenhum ativo"). Valor em vermelho.
2. **Linha do tempo de preços** (card): título + "Hoje · dd/mm/aaaa".
   - Track relativo (altura ~92px) com **segmentos posicionados proporcionalmente às datas** de cada lote (`left%`/`width%` calculados de `t0`=menor início e `t1`=maior fim). Cada segmento tem `transform: skewX(-6deg)`, nome + preço dentro, borda superior.
   - **Cor do segmento por status:** vigente `#EE2E24`; futuro `rgba(238,46,36,0.32)`; encerrado `rgba(255,255,255,0.10)` (texto `#6B6A64`).
   - **Marcador "HOJE":** linha vertical branca + ponto (skew) na posição da data atual, se dentro de [t0,t1].
   - Eixo abaixo: label início (esq.) e fim (dir.). Estado vazio quando nenhum lote tem datas.
3. **Criador + Lista** (flex `row-reverse`): **formulário "Novo lote" à ESQUERDA (largura fixa 380px, sticky), lista de lotes à DIREITA (flex:1).**
   - ⚠️ A inversão foi feita com `flex-direction:row-reverse` (o runtime **ignorou** `order` e `grid-column` — usar row-reverse ou ordem de DOM real).

### Cards de lote (lista, à direita)
Cada lote é um card (barra de acento na cor do status) com:
- **Número de ordem** (01, 02…) grande; vermelho se vigente, senão apagado.
- **Nome** (nowrap) + **pill de status** (Vigente / Em breve / Encerrado) + **chip de variação** vs. lote anterior (`▲ R$ X` ou `▼ R$ X`, tracejado; oculto se sem diferença ou primeiro lote).
- **Período** `início → fim` + **duração em dias**.
- **Preço** grande (apagado se encerrado) + rótulo 2ª categoria ("2ª cat. R$ X" ou "por categoria").
- Botão **excluir**.
- Estado vazio: "Nenhum lote cadastrado. Crie o primeiro ao lado."

### Formulário "Novo lote" (à esquerda)
Campos: **Nome**, **Preço (BRL)**, **2ª inscrição** (opcional), **Início**, **Fim** (datas em texto dd/mm/aaaa).
- **Presets de duração** — botões `+7 dias`, `+15 dias`, `+30 dias`: preenchem o **Fim** a partir do Início (ou de hoje se vazio).
- **Preview ao vivo** (bloco): nome · período · preço formatado, atualizado enquanto digita.
- Botão **Adicionar lote** — só habilita com dados válidos (nome ou preço > 0). Ao adicionar: normaliza preços para `R$ 70,00`, anexa à lista e limpa o form.

## Status (regra) — calculado das datas vs. HOJE
- `hoje < início` → **Em breve** (futuro)
- `início ≤ hoje ≤ fim` → **Vigente**
- `hoje > fim` → **Encerrado**

## Pills (config)
| status | bg | borda | texto | label |
|---|---|---|---|---|
| vigente | rgba(238,46,36,0.14) | rgba(238,46,36,0.5) | #EE9A94 | Vigente |
| futuro | transparent | rgba(255,255,255,0.16) | #9C9A93 | Em breve |
| encerrado | transparent | rgba(255,255,255,0.1) | #6B6A64 | Encerrado |

## Estado & lógica
- `lotes: [{ name, start, end, price, price2, vigente? }]` — datas em string `dd/mm/aaaa`.
- `nl: { name, price, price2, start, end }` — rascunho do formulário.
- Helpers: `parseBR` (dd/mm/aaaa → Date), `priceNum` (string → número, aceita "R$ 70,00"), `fmtMoney` (número → "R$ 70,00" pt-BR), `daysBetween`.
- Status/timeline/summary/delta são **derivados** em render a partir de `lotes` + data atual — não persistidos.
- Add/excluir mutam `lotes`; refletem ao vivo na timeline, resumo, status e no **badge de contagem do menu lateral**.

## Notas de tipografia/estilo (v3)
- `.disp` = Teko (números/títulos, uppercase); `.cond` = Barlow Condensed (rótulos/pills); corpo Barlow. `.tnum` = `font-variant-numeric: tabular-nums` nos números.
- Sem border-radius; cards `#111112` com hairlines `rgba(255,255,255,0.1)`; acento `#EE2E24`, acento-soft `#EE9A94`.

## Produção
- `GET /events/:id/lots`, `POST /events/:id/lots`, `DELETE …/lots/:id`.
- Preço vigente deve ser resolvido no servidor pela data; o cliente só reflete.

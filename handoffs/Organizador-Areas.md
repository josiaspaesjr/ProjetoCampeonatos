# Handoff — Console do Organizador · Seção **Áreas**

> Referência da seção **Áreas** do `Organizador.dc.html` (design v3, escuro + vermelho). O objetivo: informar só o **número de áreas (tatames)** e deixar um algoritmo estruturar a distribuição das categorias já geradas. Recriar no framework alvo; categorias e áreas vêm da API.

## Objetivo
A partir da **grade de categorias gerada** (seção Categorias), o organizador informa apenas quantas áreas terá e o sistema **agenda/distribui** os grupos de categoria pelas áreas, numa ordem de dia que vai dos **extremos ao meio**.

## Layout (topo → base)
1. **Card de controle** (barra de acento vermelha): 
   - Input **Número de áreas (tatames)** (number, 1–40; grande, fonte Teko).
   - Bloco **Categorias carregadas** — total + "em N grupos".
   - Botão **⚙ Estruturar áreas** (skew; desabilita se não há categorias).
   - Parágrafo explicando o algoritmo.
2. **Legenda do funil** ("Ordem do dia · extremos → meio"): chips das classes presentes na ordem de agendamento, com setas `›`. Chips das **ondas iniciais** (extremos) em vermelho-suave; ondas centrais em neutro.
3. **Resumo (4 stats)** (após estruturar): Áreas, Categorias, Média / área, Grupos.
4. **Cards por área** (grid 2 col): cada área com header "ÁREA 0i" + nº de grupos + **total de categorias** (vermelho), e uma **lista ordenada** de grupos: sequência (01, 02…), **ponto de onda** (cor do vermelho→apagado conforme vai ao meio), **swatch da faixa**, título `Classe · Sexo · Faixa`, e "N pesos". Mostra até 6 grupos, com rodapé "+ N grupos nesta área".

Estados: **sem categorias** → prompt "Gere a grade de categorias antes" + botão que navega para Categorias. **Ainda não estruturado** → placeholder "Pronto para estruturar".

## Algoritmo (regra central)
Entrada: categorias geradas, cada uma `{ classe, sexo, faixa, peso }`. Agrupadas por **`classe · sexo · faixa`** (cada grupo = um conjunto de brackets por peso).

1. **Índice de classe** pela ordem CBJJ: Pré-Mirim(0), Mirim(1), Infantil(2), Infanto-Juvenil(3), Juvenil(4), Adulto(5), Master 1(6) … Master 7(12). `NCLASS = 13`.
2. **Onda (wave)** = `min(idx, (NCLASS-1) - idx)` → distância ao extremo mais próximo. Pré-Mirim e Master 7 = onda 0 (mais cedo); o centro da lista (Master 1, idx 6) = onda máxima (mais tarde).
3. **Ordenação dos grupos:** por `wave` asc → `beltIndex` asc (branca→preta) → `classIndex` asc → sexo. Isso produz a "ordem do dia": extremos primeiro, afunilando ao meio, cada onda ordenada por faixa.
4. **Distribuição:** round-robin dos grupos ordenados nas N áreas (`grupo i → área i % N`). Assim **toda área começa pelos extremos** (kids/masters liberam cedo) e termina no miolo, com carga equilibrada.

> Nota de produto: "meio" = centro da lista de classes → o funil termina em **Master 1**, com **Adulto** logo antes. Se a regra desejada for Adulto como último (horário nobre), trocar a métrica de `wave` para distância ao índice do Adulto em vez do centro aritmético.

Cor da onda (ponto): `rgba(238,46,36, 1 - (wave/maxWave)*0.78)` — vermelho forte cedo, apagado ao centro.

## Estado & lógica
- Usa `st.cats` (grade gerada em Categorias) — se vazio, bloqueia com prompt.
- `areasN` (string do input), `structured` (bool; vira true ao "Estruturar").
- Ao **Estruturar**: `structured=true` e grava `ev.areas = nAreas` (reflete no chip da Visão geral, no badge do menu e no checklist "Áreas definidas").
- Toda a alocação (grupos, ondas, funil, resumo, cards) é **derivada em render** de `st.cats` + `areasN` — nada persistido além de `areasN`/`structured`.
- Mudar o nº de áreas após estruturar recomputa ao vivo.

## Produção
- `GET /events/:id/categories` (fonte da grade), `PATCH /events/:id { areas }`.
- Persistir a alocação: `POST /events/:id/areas/allocate { count }` retornando grupos por área; o agendamento real (horários, sequência de lutas) roda no servidor.

## Estilo (v3)
`.disp` Teko (títulos/números), `.cond` Barlow Condensed (rótulos/chips), corpo Barlow, `.tnum` tabular. Cards `#111112`, hairlines `rgba(255,255,255,0.1)`, acento `#EE2E24` / soft `#EE9A94`, sem border-radius, chips com `skewX(-9deg)`.

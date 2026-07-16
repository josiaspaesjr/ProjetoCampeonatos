# Handoff — i18n do Console do Organizador (pt/en/es)

Continuação da tradução do LeagueMat. O **público do atleta está 100% traduzido**; falta terminar o **console do organizador**. Este doc é auto-contido para retomar num chat novo.

## Estado atual (o que já foi feito)

**Infra de i18n (pronta, não mexer na base):** idioma global por **cookie** `leaguemat_lang` (`pt`|`en`|`es`, padrão pt). Arquivos em `src/lib/i18n/`:
- `config.ts` — `Locale`, `LOCALES`, `COOKIE_IDIOMA`, `IDIOMAS`, `ehLocale`.
- `dicionarios/{pt,en,es}.ts` — **pt.ts é a forma canônica** (`export type Dicionario = typeof pt`); en/es são `Dicionario` e o tsc **cobra as mesmas chaves**.
- `dicionarios/index.ts` — `DICIONARIOS`, `dicionarioDe`.
- `server.ts` — `getLocale()` e `getDicionario()` (Server Components).
- `client.tsx` — `IdiomaProvider` (no root layout), `useDic()`, `useIdioma()` (dá `{locale, dic, trocar}`), `<SeletorIdioma/>`.

**Já traduzido (público, no ar):** landing, catálogo `/eventos`, todas as abas do evento (Informações/Categorias/Atletas/Chaves/Lutas/Cronograma/Resultados + detalhe da chave), inscrição, checkout, minhas inscrições, faixa de pendências. Países via `Intl.DisplayNames` (`nomePaisLocale` em `src/lib/paises.ts`); classes de idade CBJJ via `dic.classesIdade[id]`.

**Console — já feito (Lotes 1 e 2, no ar):**
- Lote 1: `src/app/entrar/page.tsx`, `src/app/acesso/page.tsx`, `src/app/organizador/layout.tsx`, `src/app/organizador/page.tsx` (dashboard).
- Lote 2: `src/app/organizador/eventos/novo/page.tsx`, `src/components/organizador/campos-data-evento.tsx`, `src/components/organizador/regulamento-campos.tsx`.
- As chaves do dicionário para isso vivem em `dic.admin` (subseções: `status`, `dashboard`, `entrar`, `acesso`, `campos`, `moedas`, `novo`, `regCampos`) — já em pt/en/es.

## O que falta (o grosso do console) — próximos lotes sugeridos

Todos em `src/app/organizador/eventos/[id]/` + `src/components/organizador/`:

- **Lote 3 (mais usado):** `[id]/page.tsx` (visão geral do evento, ~352 ln, muitas strings + `rotuloStatus` reusa `dic.admin.status`) · `src/components/organizador/topbar-evento.tsx` (drawer "Editar evento", ~285 ln — **reusa `dic.admin.campos`**; adicionar `ROTULO_STATUS` → `dic.admin.status`) · `src/components/organizador/sidebar.tsx` (nav) · `src/components/organizador/excluir-evento.tsx`.
- **Lote 4:** `[id]/inscricoes/page.tsx` · `[id]/categorias/page.tsx` + `src/components/organizador/gerador-grade.tsx` (~360 ln).
- **Lote 5:** `[id]/lotes/page.tsx` (~401 ln) + `src/components/organizador/novo-lote.tsx` (~316) + `seletor-grupo-preco.tsx`.
- **Lote 6:** `[id]/areas/page.tsx` + `src/components/organizador/estruturador-areas.tsx` (~305) · `[id]/areas/[areaId]/placar/page.tsx` + `placar-tablet.tsx` (~270) · `[id]/chaves/page.tsx` + `[id]/chaves/[chaveId]/page.tsx` · `[id]/checkin/page.tsx` + `[id]/checkin/[inscricaoId]/page.tsx`.
- **Faltando também (dado, aparece no público E no organizador):** os **16 títulos de seção do regulamento** (`SECOES_REGULAMENTO` em `src/lib/regulamento.ts`, campo `titulo`). Sugestão: adicionar `dic.regulamentoTitulos[chave]` e usar em `src/components/organizador/regulamento-campos.tsx` (`secao.titulo`) e no accordion público de `src/app/evento/[slug]/(abas)/page.tsx` (via `secoesPreenchidas`).

**Fora de escopo (deixar em pt):** nomes de academias; o peso embutido no nome já salvo da categoria (ex.: "…/ Leve (até 76kg)"); rótulos de rodada vindos da lib de cronograma (`luta.label`); texto do regulamento escrito pelo organizador.

## Padrão para traduzir (seguir exatamente)

1. Adicionar a chave nos **3 dicionários** (`pt.ts` primeiro, depois `en.ts`/`es.ts` com as mesmas chaves — tsc cobra). Agrupar sob `admin.<área>` (ex.: `admin.overview`, `admin.lotes`).
2. **Server Component:** `const dic = await getDicionario();` (tornar a função `async` se não for). Para status do evento reusar `dic.admin.status`.
3. **Client Component:** `const dic = useDic();` (ou `const { locale, dic } = useIdioma();` se precisar de país/locale).
4. **Componente puro usado em server E client** (ex.: `passos.tsx`, `bracket-view.tsx`): recebe rótulos **por prop** do pai (não usa hook).
5. Cuidado com **hooks depois de early-return** (ex.: `if (!x) return null` antes do `useDic()` quebra a regra dos hooks — chamar o hook antes).
6. Reaproveitar: `dic.evento.modalidades` (Gi/No-Gi), `dic.admin.campos` (labels de evento), `dic.admin.status` (rascunho/publicado/…). Não duplicar.

## Como verificar (dev tem Supabase/auth real — não dá pra logar sem senha)

O dev usa **Supabase local** (`.env.local`, porta 54322). Server dev já rodando (`preview_start name:"leaguemat-dev"`, porta 3000). Páginas do organizador que exigem sessão redirecionam pra `/entrar` — **NÃO automatizar login com senha**. Truques:
- **SSR por cookie via XHR** (não precisa de layout hidratado): num tab do browser em `localhost:3000`, rodar JS que faz `document.cookie="leaguemat_lang=en;path=/"` + `XMLHttpRequest` síncrono GET da rota e checar o texto. (O preview headless às vezes fica com viewport 0x0 — o XHR do HTML SSR contorna.)
- Rotas do organizador **sem guarda** que renderizam mesmo deslogado: `/organizador/eventos/novo` (shell + form). O `[id]/*` exige evento do organizador logado → difícil ver deslogado; confiar em tsc + padrão + o SSR das partes acessíveis. Se precisar ver logado, **pedir ao usuário** (login manual) — não digitar senha.
- Evento de teste em dev: **`open-bjjcamp-etapa-1`** (publicado, com áreas/chaves/lutas). `copa-teste` é só prod.

## Fluxo de fechamento (memória `bjjcamp-fluxo-deploy-sem-perguntar`)

Por lote: `npx tsc --noEmit` + `npm run lint` (erros pré-existentes só em `placar-tablet.tsx` — ignorar) + `npx vitest run` (deve dar **141 passed**) + `npm run build` → **`vercel --prod`** (deploy é manual; git push NÃO deploya) → `git add src && git commit` → `git push origin main`. Mensagem de commit termina com `Co-Authored-By: Claude ...`. **Não commitar** os untracked pré-existentes `handoffs/Organizador-Areas (1).md` e `scripts/seed-inscricoes-copa-teste.sql`.

## Referências de memória
`bjjcamp-i18n` (arquitetura), `bjjcamp-dev-db-migracoes` (banco dev + gotcha de reiniciar server ao adicionar coluna), `bjjcamp-deploy-vercel`, `bjjcamp-eventos-teste-dev`, `bjjcamp-verificar-console-organizador`.

Último commit no momento do handoff: `0777dc7` (i18n console 2/n).

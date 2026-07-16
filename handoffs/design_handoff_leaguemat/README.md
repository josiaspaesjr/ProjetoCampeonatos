# Handoff: LeagueMat — Sistema de Competições de Jiu-Jitsu

## Overview
LeagueMat is a SaaS platform for running Brazilian jiu-jitsu / grappling competitions end-to-end: event publishing, athlete registration, weigh-in, live brackets, refereeing, and an official ranking. This handoff covers three public-facing screens of the athlete/visitor experience:

1. **Landing** — product marketing page for the platform (targets federations, academies, and athletes).
2. **Event page** — public presentation of a single published event, with categories, teams, and a registration CTA.
3. **Registration flow** — a 3-step athlete sign-up: personal data → Pix payment → confirmation.

The organizer/admin panel (create event, manage brackets & results) is **not** part of this bundle.

## About the Design Files
The files in this bundle are **design references authored in HTML** — prototypes that show the intended look, layout, and behavior. They are **not** production code to ship as-is. The task is to **recreate these designs inside the target codebase** using its established framework, component library, routing, and state patterns (React, Vue, Svelte, etc.). If no frontend environment exists yet, choose the most appropriate framework for the project and implement the designs there.

The HTML is written as "Design Components" (a streaming prototype format) and uses inline styles throughout. Treat the markup as a spec for structure and styling, not as a copy-paste source. In particular, the dynamic data (events, categories, teams, ranking) is hard-coded in the prototypes' logic — in production it must come from the backend API.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are intended to be reproduced pixel-accurately. Recreate the UI faithfully using the codebase's own primitives (design tokens, form controls, buttons). Copy is final Brazilian Portuguese (pt-BR).

---

## Design Tokens

### Colors
| Token | Hex | Usage |
|---|---|---|
| `bg` | `#0B0B0C` | Page background (warm near-black) |
| `surface` | `#0E0E10` | Alt sections, sidebars, cards |
| `surface-raised` | `#111113` | Inputs, event cards |
| `surface-hover` | `#161618` | Bracket rows / hovered cells |
| `gold` | `#C6A15B` | Primary accent, CTAs, prices |
| `gold-light` | `#E4C784` | Links, live badges, secondary accent text |
| `text` | `#F5F1E9` | Primary text (warm white) |
| `text-2` | `#D8D2C6` | Secondary text |
| `text-3` | `#C8C3B8` | Body paragraphs |
| `muted` | `#B9B4A8` | Muted body |
| `muted-2` | `#8B877D` | Labels, meta |
| `muted-3` | `#5C594F` | Placeholders, disabled, faint meta |
| `live-red` | `#E23B3B` | "Ao vivo agora" live-red dot |
| Belt: Branca | `#EDE7DA` | Category belt marker |
| Belt: Azul | `#3E7BD6` | Category belt marker |
| Belt: Roxa | `#8A5BD6` | Category belt marker |
| Belt: Marrom | `#8A5A34` | Category belt marker |
| Belt: Preta | `#111` | Category belt marker |

### Borders / hairlines
- Hairline: `1px solid rgba(255,255,255,0.06–0.09)`
- Input border: `1px solid rgba(255,255,255,0.14)`; focus → `#C6A15B`
- Gold outline (cards/buttons): `1px solid rgba(198,161,91,0.4–0.6)`
- Grid separators use a 1px gap over a `rgba(255,255,255,0.08)` background (hairline-grid technique).

### Radius & shadows
- **No border-radius anywhere.** All corners are square (0px) — this is intentional and part of the premium/technical look. Do not round buttons, inputs, or cards.
- No drop shadows. Depth comes from surface color steps and hairlines. Some panels use a subtle vertical gradient: `linear-gradient(180deg,#151412,#0E0E10)`.

### Typography
Three families (Google Fonts):
- **Saira Condensed** (weights 500/600/700/800) — display / headings / buttons / stat numbers. Always `text-transform: uppercase`, tight line-height (0.9–1.05).
- **Saira** (400/500/600) — body text, inputs.
- **JetBrains Mono** (400/500) — labels, meta, eyebrows, data, timers, code. Usually uppercase with `letter-spacing: 0.08–0.22em`.

Type scale (approx, clamp used for hero):
- Hero H1: `clamp(52px, 8.4vw, 124px)`, Saira Condensed 800, line-height 0.9
- Section H2: `clamp(38px, 5.5vw, 68px)`, Saira Condensed 800
- Screen H1 (forms): `clamp(34px, 4.6vw, 54px)`
- Card/section title: 20–36px Saira Condensed 700
- Body: 15–18px Saira 400/500, line-height 1.5–1.6
- Eyebrow/label: 11–12px JetBrains Mono, letter-spacing 0.1–0.22em, uppercase
- Stat number: 22–52px Saira Condensed 700/800

### Spacing
- Page horizontal padding: `48px` (nav, sections, body).
- Section vertical rhythm: `88–120px`.
- Card padding: `20–28px`. Input padding: `~14px 16px`.
- Common gaps: 8, 12, 16, 20, 28, 38, 48px.

### Motion
- `pulseDot` keyframe: opacity 1 → 0.25 → 1 over 1.6s infinite (live-status dots).
- `marquee` keyframe: translateX(0) → translateX(-50%) over 28s linear infinite (landing ticker; duplicate the content once for a seamless loop).
- Hover on event cards: `border-color` transitions to `rgba(198,161,91,0.55)` over 0.2s.
- `scroll-behavior: smooth` for in-page anchors.

### Motifs
- **Diamond logo mark**: a `30×30px` square with `2px solid #C6A15B`, rotated 45°, containing an `8×8px` solid gold square. Wordmark: "BJJ" in text color + "Arena" in gold, Saira Condensed 800, uppercase, letter-spacing 0.14em.
- **Diamond bullets**: small rotated squares (`◆` glyph in gold, or 8px rotated squares) as list/category markers and separators.
- **Striped backgrounds**: `repeating-linear-gradient(115deg, #131315 0 2px, #0E0E10 2px 26px)` for hero/CTA texture; `repeating-linear-gradient(45deg, #17171A 0 2px, #101012 2px 16px)` for image placeholders.
- **Radial gold glow**: `radial-gradient(...rgba(198,161,91,0.16), transparent 60%)` layered over striped hero backgrounds.

---

## Screens / Views

### 1. Landing (`Landing.dc.html`)
**Purpose:** Sell the LeagueMat platform; route federations/academies to "create event" and athletes to registration.

**Layout:** Single scrolling page, full-width sections, 48px side padding.

**Sections (top → bottom):**
- **Sticky nav** — translucent (`rgba(11,11,12,0.82)` + `backdrop-filter: blur(14px)`), bottom hairline. Left: diamond logo + "LeagueMat". Center: uppercase nav links (Recursos, Ao vivo, Ranking, Eventos) in `#B9B4A8`. Right: gold "Começar grátis" button (solid `#C6A15B`, black text).
- **Hero** — min-height 88vh, content bottom-aligned. Striped bg + gold radial glow + a vertical-text label on the right edge. Eyebrow pill with pulsing dot ("O sistema operacional do jiu-jitsu competitivo"). H1 "Toda competição, / uma plataforma" (second line gold). Blurb (max 480px) + three mono stats (Eventos 340+, Atletas 58 mil, Federações 27 — last in gold). Two CTAs: gold "Começar grátis", outlined "Ver demonstração".
- **Marquee** — horizontal auto-scrolling ticker, Saira Condensed uppercase in `#5C594F` with gold diamond separators. Items: "Gi & No-Gi", "Chaveamento ao vivo", "Ranking oficial IBJJF-style", "Arbitragem certificada".
- **Eventos** (`#eventos`) — heading "Eventos ao vivo agora" + subhead. Responsive card grid (`repeat(auto-fill, minmax(330px, 1fr))`, gap 20px). Each card: 16:10 striped image placeholder with status badge (top-left) + date badge (bottom-right, day large + gold month), then name, city/type meta (mono), footer row with slots text + gold "Inscrever →". Hover: gold border.
- **Formato** (`#formato`) — alt surface. Heading "Da inscrição ao pódio, em uma plataforma só". 4-cell hairline grid of steps (01 Crie seu perfil / 02 Inscreva-se / 03 Acompanhe a chave / 04 Suba no ranking), each with mono number, condensed title, muted description.
- **Chaveamento ao vivo** (`#chaveamento`) — two columns. Left: live-red pulsing "Ao vivo agora" eyebrow, heading, paragraph, outlined gold "Abrir chaveamento". Right: a bracket card — header row (division + "● Área 3" in red), a `1fr 40px 1fr` VS grid with two competitor rows per side (winner rows have gold border + light name, losers muted), score in gold mono, footer "Próxima chamada: FINAL / 02:14 restantes".
- **Ranking** (`#ranking`) — alt surface. Heading "Os melhores do circuito" + category tabs (Adulto active gold, Master/Feminino outlined). Table with columns `70px 1fr 1fr 120px 110px` (# / Atleta / Equipe / Faixa / Pontos). Header row on `#131315`. Row 1 has a faint gold row background and gold rank number; points right-aligned in gold-light mono.
- **CTA** (`#inscricao`) — striped bg + bottom gold radial glow, centered. Eyebrow, huge H1 "O tatame, / organizado" (2nd line gold), paragraph, two CTAs: gold "Criar meu evento", outlined "Sou atleta" (→ `Inscricao.dc.html`).
- **Footer** — logo + `© 2026 LeagueMat · Sistema de competições de jiu-jitsu` (mono, `#5C594F`).

### 2. Event page (`Evento.dc.html`)
**Purpose:** Public page for one published event with all details + registration entry point.

**Layout:** Sticky nav → full-width hero banner → 2-column body (`minmax(0,1fr) 380px`, gap 48px, 48px padding).

**Components:**
- **Nav** — logo links to Landing; right side has "Categorias" anchor + gold "Inscrever-se" button (→ `Inscricao.dc.html`).
- **Hero banner** — `clamp(420px,56vh,620px)` tall. Background is a **user-fillable image** (see Assets — `image-slot`), overlaid with a bottom-heavy dark gradient (`linear-gradient(180deg, rgba(11,11,12,0.35), ...0.94)`), content bottom-aligned. Overlay + text have `pointer-events:none` so the image drop target stays reachable. Two badges (live "Inscrições abertas" + "Etapa 03 · Circuito Nacional"), event H1, and a mono meta row (date · city/UF · gym) separated by gold diamonds.
- **Main column:**
  - *Sobre o evento* — eyebrow, paragraph (max 660px), then a 4-cell hairline "facts" grid (Modalidade, Áreas, Faixas, Pesagem — last value gold).
  - *Categorias* (`#categorias`) — title + "1.064 disponíveis" count. Filter chips (Todas active gold; Adulto, Master 1, Juvenil, Feminino, Preta). A bordered list; each row: rotated-square belt marker (color-coded by belt), category label `Idade / Sexo / Faixa / Nome`, right-aligned "N inscritos" count (muted, or `#5C594F` when 0). Zebra striping via alternating faint bg. Footer note about full categories on the registration screen.
- **Sidebar (sticky, top 96px):**
  - *Registration card* — gold-outlined, gradient bg. "Inscrição · 1º lote" label, huge gold price "R$ 70" + "por categoria", gold "Inscrever-se →" button (→ Inscricao), outlined "Cronograma ao vivo" button, then a hairline-separated list of deadlines (Inscrições fecham 10 MAR 23:59 in gold-light; Segunda categoria +R$ 40; Pagamento Pix ou cartão).
  - *Equipes* — title + "3 confirmadas" (prototype shows more sample teams). List rows: team name (left) + gold count (right), hairline separated.

### 3. Registration flow (`Inscricao.dc.html`)
**Purpose:** Athlete signs up for the event. Single screen with 3 internal steps driven by state; a live summary sidebar persists across steps.

**Layout:** Nav → 2-column (`minmax(0,1fr) 400px`). Left = active step; right = summary sidebar (`#0E0E10`, left hairline). A step-progress indicator (diamond nodes 1/2/3: Dados / Pagamento / Confirmação) sits at the top of the left column; completed steps show ✓ and gold styling, active step is solid gold, future steps muted.

**Step 1 — Dados (form):**
- Eyebrow "// Passo 1 · Seus dados", H1 "Inscrição / Copa Cidade de Jiu-Jitsu 2026", subhead "Só mostramos categorias compatíveis com seu perfil. Pagamento na próxima etapa."
- Fields (max-width 640px): **Nome completo*** + **E-mail*** (2-col); **Nascimento*** (date) + **Sexo*** (select: Masculino/Feminino) + **Faixa*** (select: Branca/Azul/Roxa/Marrom/Preta) (3-col); **Academia / equipe** (text).
- **Categoria*** — only renders once nascimento + sexo + faixa are all set (otherwise a dashed-border hint: "Preencha nascimento, sexo e faixa para ver suas categorias."). Options are **filtered by profile**: weight classes depend on sex, age division is computed from birth year (see State). Options render as selectable buttons (selected = gold fill); "Absoluto" shows "todos os pesos" meta.
- Buttons: outlined "Voltar" (→ Evento) + "Continuar para o pagamento →" (disabled/greyed until nome, email, profile, and categoria are all filled).

**Step 2 — Pagamento:**
- Eyebrow "// Passo 2 · Pagamento", H1 "Pague com Pix / e garanta a vaga", subhead about the reserved slot.
- Payment card (max 560px, gold outline, gradient): header row = chosen category label + "aguardando pagamento" (gold-light). Body: "Total" + big gold price. A row with a **QR-code placeholder** (7×7 grid of black/white cells on a white tile, 112px) + "Pix copia e cola" code box (mono, breakable) + "Copiar código" button (toggles to "Copiado ✓" for 2s). Below: "Expira em HH:MM:SS — após isso a vaga é liberada." (live countdown, gold-light time). Full-width gold "Simular pagamento aprovado" button.
- Below card: "← Editar dados" text button (back to step 1).

**Step 3 — Confirmação:**
- Diamond ✓ badge, eyebrow "// Inscrição confirmada", H1 "Você está no / chaveamento". Paragraph confirming the category and that the receipt was emailed (interpolates chosen category + email). Secondary paragraph about live match notifications. Buttons: gold "Ver cronograma" (→ Evento) + outlined "Início" (→ Landing).

**Summary sidebar (all steps):** 16:10 event image placeholder + "Etapa 03" badge, event name + date/gym, a hairline list that updates live (Atleta, Faixa, Divisão, Categoria — filled values gold/white, empty "—" in `#5C594F`), and a bottom "Taxa de inscrição R$ 70" + "Segunda categoria: +R$ 40 · Pix ou cartão".

---

## Interactions & Behavior
- **Navigation:** anchor links for in-page sections (smooth scroll); page-to-page links between Landing ↔ Evento ↔ Inscricao. In production, wire these to the router (e.g. `/`, `/eventos/:slug`, `/eventos/:slug/inscricao`).
- **Registration steps** are internal component state, not separate routes in the prototype — production may keep it single-route with steps or split into routed sub-steps; preserve the live summary either way.
- **Category filtering:** whenever sexo/faixa/nascimento change, the selected category is reset and options recompute. Weight-class list is sex-dependent; age division is derived from birth year.
- **Continue button** is disabled until required fields (nome, email, sexo, faixa, nascimento, categoria) are valid.
- **Pix countdown:** decrements every second while on the payment step; format `HH:MM:SS`. At 0 the slot should be released (prototype starts at 30:00; backend defines the real window).
- **Copy Pix code:** copies the payload; button label flips to "Copiado ✓" for 2s. In the prototype it's a visual toggle — implement real clipboard write.
- **"Simular pagamento aprovado"** advances to confirmation — this is a **test/dev affordance only**. In production, payment approval comes from the Pix provider webhook / polling; do not ship a client-side "approve" button.
- **Live badges:** pulsing dots on "Inscrições abertas" (gold) and "Ao vivo agora" (red).
- **Hover states:** event cards → gold border; buttons darken/gold as noted; links go text-white on hover; inputs → gold border on focus.

## State Management
Registration screen state (prototype):
- `step`: `'form' | 'pay' | 'done'`
- Form fields: `nome`, `email`, `nascimento` (ISO date string), `sexo`, `faixa`, `equipe`, `categoria`
- `remaining` (seconds, countdown), `copied` (boolean, transient)
- Derived: **age division** from `nascimento` → `2026 - birthYear`: ≤15 Infantojuvenil, ≤17 Juvenil, ≤29 Adulto, ≤35 Master 1, ≤40 Master 2, else Master 3. (Compute against the event year, not a hard-coded 2026, in production.)
- Derived: **weight classes** by sex —
  - Feminino: Galo (até 48.5kg), Pluma (até 53.5kg), Pena (até 58.5kg), Leve (até 64kg), Médio (até 69kg), Meio-Pesado (até 74kg), Pesado (+74kg), Absoluto.
  - Masculino: Galo (até 57.5kg), Pluma (até 64kg), Pena (até 70kg), Leve (até 76kg), Médio (até 82.3kg), Meio-Pesado (até 88.3kg), Pesado (até 94.3kg), Super-Pesado (+94.3kg), Absoluto.
- Chosen category string = `${age} / ${sexo} / ${faixa} / ${weightClass}`.

Event & Landing screens are read-only in the prototype but must fetch from the API in production:
- Event: name, etapa, dateFull, city/UF, gym, description, price, lote, category list (with per-category enrolled counts), team list (with counts), deadlines.
- Landing: featured metrics, events list, ranking rows (per category tab).

## Data fetching requirements (production)
- `GET /events` (landing list), `GET /events/:id` (event page: details, categories + counts, teams + counts), `GET /ranking?category=` (ranking tabs).
- `POST /events/:id/registrations` (create pending registration), then create a Pix charge → poll/webhook for approval, then confirm and email receipt.
- Category options should ideally be validated/derived server-side against the event's ruleset, not only client-side.

## Assets
- **Fonts:** Google Fonts — Saira Condensed, Saira, JetBrains Mono. Use the codebase's font-loading approach (self-host or `<link>`).
- **Event image (`image-slot.js`):** the event hero uses a drag-and-drop image placeholder web component included in this bundle. It is a **prototype convenience** for dropping a real photo — in production, replace it with a normal `<img>`/background bound to the event's uploaded cover image. On Landing and the registration sidebar, images are striped placeholders labeled "[ foto do evento ]" — swap for real event imagery.
- **QR code:** the payment QR is a decorative CSS grid placeholder. Render a real QR from the Pix payload in production.
- **Icons/glyphs:** the diamond mark and separators are pure CSS (rotated squares) and the `◆` / `✓` glyphs — no icon assets required. If the codebase has an icon set, matching square/diamond motifs is fine.
- No logo image file — the wordmark is text ("BJJ" + gold "Arena") beside the CSS diamond mark.

## Files
- `Landing.dc.html` — platform marketing landing page.
- `Evento.dc.html` — single event presentation page (uses `image-slot.js`).
- `Inscricao.dc.html` — 3-step athlete registration + Pix payment + confirmation.
- `image-slot.js` — drag-and-drop image placeholder web component (prototype-only helper).

All three are self-contained HTML prototypes (inline styles, logic embedded). Open any of them directly in a browser to see the intended design and behavior before implementing.

"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo, SkewTexto } from "@/components/marca";
import { useIdioma } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { RankingGeral } from "@/lib/ranking";

/* ------------------------------------------------------------------------ */
/* Dados vindos do servidor                                                  */
/* ------------------------------------------------------------------------ */

export interface LadoBracket {
  nome: string;
  placar: string;
  venceu: boolean;
}

export interface BracketVivo {
  demo: boolean;
  titulo: string;
  esquerda: LadoBracket[];
  direita: LadoBracket[];
  href: string;
}

export interface StatLanding {
  valor: string;
  destaque: boolean;
}

/* ------------------------------------------------------------------------ */
/* i18n — a landing traz o próprio conteúdo; o idioma é o global (cookie)     */
/* ------------------------------------------------------------------------ */

type Lang = "pt" | "en" | "es";

interface FT {
  t: string;
  d: string;
}
interface Step {
  title: string;
  desc: string;
}
interface Plano {
  nome: string;
  preco: string;
  unidade: string;
  desc: string;
  itens: string[];
  destaque: boolean;
  cta: string;
}
interface Grupo {
  titulo: string;
  itens: string[];
}

interface Conteudo {
  nav: {
    recursos: string;
    formatos: string;
    preco: string;
    eventos: string;
    entrar: string;
    criar: string;
  };
  hero: {
    badge: string;
    l1: string;
    l2pre: string;
    accent: string;
    desc: string;
    btn1: string;
    btn2: string;
    prova: string;
  };
  ticker: string[];
  spot: {
    eyebrow: string;
    tPre: string;
    tAccent: string;
    tPos: string;
    desc: string;
    bullets: string[];
    cta: string;
  };
  pilaresEyebrow: string;
  pilaresTitle: string;
  pilares: FT[];
  statLabels: string[];
  comoEyebrow: string;
  comoTitle: string;
  steps: Step[];
  fmtEyebrow: string;
  fmtTitle: string;
  fmtDesc: string;
  formatos: FT[];
  fmtNota: string;
  diaEyebrow: string;
  diaTitle: string;
  diaDesc: string;
  dia: FT[];
  rankEyebrow: string;
  rankTitle: string;
  rankDesc: string;
  rankEmpty: string;
  rankTabs: { adulto: string; master: string; feminino: string };
  atletaEyebrow: string;
  atletaTitle: string;
  atletaDesc: string;
  atleta: FT[];
  atletaCta: string;
  precoEyebrow: string;
  precoTitle: string;
  precoDesc: string;
  planos: Plano[];
  precoNota: string;
  inclEyebrow: string;
  inclTitle: string;
  grupos: Grupo[];
  ctaTitle: string;
  ctaAccent: string;
  ctaBtn1: string;
  ctaBtn2: string;
  foot: {
    tagline: string;
    colOrg: string;
    colAtleta: string;
    colSistema: string;
    lkCriar: string;
    lkConsole: string;
    lkPreco: string;
    lkEventos: string;
    lkInscricoes: string;
    lkEntrar: string;
    lkRecursos: string;
    lkFormatos: string;
    lkAtleta: string;
    copy: string;
  };
}

const DICT: Record<Lang, Conteudo> = {
  pt: {
    nav: {
      recursos: "Recursos",
      formatos: "Formatos",
      preco: "Preço",
      eventos: "Eventos",
      entrar: "Entrar",
      criar: "Criar evento",
    },
    hero: {
      badge: "O sistema operacional do jiu-jitsu",
      l1: "O campeonato inteiro.",
      l2pre: "Num só",
      accent: "sistema",
      desc: "Inscrições com Pix, chaveamento automático, cronograma com horários estimados, placar digital e ranking oficial. Federações e academias organizam o campeonato inteiro — da primeira inscrição ao pódio.",
      btn1: "Criar evento →",
      btn2: "Ver eventos",
      prova: "No ar · Gi & No-Gi · PT · EN · ES",
    },
    ticker: [
      "Gi & No-Gi",
      "Chaveamento automático",
      "Ranking oficial",
      "Pix integrado",
      "Check-in por QR",
      "Telão ao vivo",
      "Cronograma com ETA",
    ],
    spot: {
      eyebrow: "O motor do sistema",
      tPre: "O chaveamento faz o ",
      tAccent: "trabalho pesado",
      tPos: ".",
      desc: "Inscrições agrupadas por divisão viram chaves prontas num clique. Você gera todas as divisões em lote, o sistema escolhe o formato pelo tamanho e calcula os horários sozinho.",
      bullets: [
        "Chaves geradas em lote",
        "Formato automático por tamanho",
        "Semente que separa a mesma academia",
        "Horário estimado de cada luta",
      ],
      cta: "Ver uma chave ao vivo →",
    },
    pilaresEyebrow: "Uma plataforma, tudo integrado",
    pilaresTitle: "Tudo que uma federação precisa",
    pilares: [
      {
        t: "Inscrições & Pix",
        d: "Cobrança integrada via Pix, lotes com preço por período e categoria detectada pelo perfil.",
      },
      {
        t: "Divisões & categorias",
        d: "Faixa, idade e peso combinam em divisões automáticas — com preço e tempo de luta por categoria.",
      },
      {
        t: "Chaveamento automático",
        d: "Eliminação simples e todos-contra-todos, gerados em lote e escolhidos pelo tamanho da divisão.",
      },
      {
        t: "Cronograma & áreas",
        d: "Distribua as divisões entre as áreas com horário estimado de cada luta, recalculado a cada mudança.",
      },
      {
        t: "Placar & telão",
        d: "Placar digital por área e telão do cronograma ao vivo para projetar no ginásio.",
      },
      {
        t: "Ranking oficial",
        d: "Cada resultado alimenta o ranking por faixa, idade e peso — e o ranking de equipes.",
      },
    ],
    statLabels: ["Eventos", "Atletas", "Equipes", "Inscrições"],
    comoEyebrow: "Como funciona",
    comoTitle: "Da inscrição ao pódio",
    steps: [
      {
        title: "Crie o perfil",
        desc: "Cadastro único com faixa, peso e equipe, reaproveitado em todas as etapas.",
      },
      {
        title: "Inscreva-se",
        desc: "Categoria detectada pelo perfil, com pesagem e pagamento via Pix integrados.",
      },
      {
        title: "Acompanhe a chave",
        desc: "Chaveamento ao vivo, chamada de área no telão e horário estimado de cada luta.",
      },
      {
        title: "Suba no ranking",
        desc: "Cada resultado alimenta o ranking oficial por faixa, idade e peso.",
      },
    ],
    fmtEyebrow: "Chaveamento",
    fmtTitle: "Dá conta de qualquer chave",
    fmtDesc: "Do grupo de três à divisão lotada. Escolha o formato ou deixe o sistema decidir pelo número de inscritos.",
    formatos: [
      { t: "Eliminação simples", d: "até a final" },
      { t: "Todos contra todos", d: "round robin" },
      { t: "Seleção automática", d: "pelo tamanho" },
      { t: "Geração em lote", d: "todas de uma vez" },
      { t: "Semente por academia", d: "separa colegas" },
      { t: "Desempate por finalização", d: "e confronto direto" },
    ],
    fmtNota: "Chave dupla e repescagem estão a caminho.",
    diaEyebrow: "No dia do evento",
    diaTitle: "Rode a competição de ponta a ponta",
    diaDesc: "Do check-in ao placar, tudo conversa com a mesma chave.",
    dia: [
      {
        t: "Check-in por QR",
        d: "Cada inscrição vira um QR. Confira presença e pesagem sem fila.",
      },
      {
        t: "Placar digital",
        d: "Um placar por área, no tablet, ligado direto à chave em disputa.",
      },
      {
        t: "Telão ao vivo",
        d: "Projete o cronograma com horários que se atualizam sozinhos.",
      },
    ],
    rankEyebrow: "Ranking do circuito",
    rankTitle: "Os melhores do circuito",
    rankDesc: "Cada chave concluída atualiza o ranking por faixa, idade e peso — e a disputa por equipes.",
    rankEmpty: "O ranking nasce quando as primeiras chaves forem concluídas.",
    rankTabs: { adulto: "Adulto", master: "Master", feminino: "Feminino" },
    atletaEyebrow: "Para o atleta",
    atletaTitle: "Um perfil, todas as etapas",
    atletaDesc: "O atleta cria o perfil uma vez e acompanha tudo pelo navegador — sem instalar nada.",
    atleta: [
      {
        t: "Perfil reaproveitado",
        d: "Faixa, peso e equipe salvos, prontos para a próxima inscrição.",
      },
      {
        t: "Página pública do evento",
        d: "Chaves, cronograma, lutas e atletas — abertos para todo mundo.",
      },
      {
        t: "Minhas inscrições",
        d: "Acompanhe pagamentos, chaves e resultados num lugar só.",
      },
    ],
    atletaCta: "Sou atleta →",
    precoEyebrow: "Preço",
    precoTitle: "Preço simples",
    precoDesc: "Comece de graça. Quando o evento acontece, você paga por atleta inscrito — sem mensalidade para começar.",
    planos: [
      {
        nome: "Grátis",
        preco: "R$ 0",
        unidade: "para começar",
        desc: "Crie e publique seu primeiro evento.",
        itens: [
          "Página pública do evento",
          "Inscrições e chaves",
          "Cronograma e telão",
        ],
        destaque: false,
        cta: "Criar evento",
      },
      {
        nome: "Por atleta",
        preco: "1 crédito",
        unidade: "= 1 atleta / evento",
        desc: "Pague conforme o evento cresce. Uma inscrição conta como um crédito, em quantas divisões quiser.",
        itens: [
          "Tudo do plano Grátis",
          "Placar por área e check-in",
          "Ranking oficial do circuito",
        ],
        destaque: true,
        cta: "Falar com a gente",
      },
      {
        nome: "Federação",
        preco: "Sob medida",
        unidade: "circuito e temporada",
        desc: "Para quem roda uma temporada inteira com ranking e várias etapas.",
        itens: [
          "Ranking por temporada",
          "Várias etapas e áreas",
          "Suporte dedicado",
        ],
        destaque: false,
        cta: "Falar com a gente",
      },
    ],
    precoNota: "Crédito não usado antes do evento fica com você. Valores finais sob consulta.",
    inclEyebrow: "Tudo incluído",
    inclTitle: "Uma plataforma, tudo conectado",
    grupos: [
      {
        titulo: "Inscrições & pagamento",
        itens: [
          "Cobrança via Pix (Asaas)",
          "Lotes com preço por período",
          "Preço por categoria",
          "Confirmação automática",
          "Página de inscrição própria",
        ],
      },
      {
        titulo: "Divisões & chaves",
        itens: [
          "Faixa, idade e peso automáticos",
          "Geração de chaves em lote",
          "Eliminação simples e round robin",
          "Formato automático por tamanho",
          "Semente por academia",
        ],
      },
      {
        titulo: "Cronograma & áreas",
        itens: [
          "Distribuição entre áreas",
          "Horário estimado por luta",
          "Intercalação de rodadas",
          "Tempo de luta por categoria",
          "Recalcula a cada mudança",
        ],
      },
      {
        titulo: "Placar & telão",
        itens: [
          "Placar digital por área",
          "Telão do cronograma ao vivo",
          "Atualização automática",
          "Pronto para tablet e projetor",
        ],
      },
      {
        titulo: "Ranking & resultados",
        itens: [
          "Ranking por faixa, idade e peso",
          "Ranking de equipes",
          "Página pública de resultados",
          "Atualiza a cada chave",
        ],
      },
      {
        titulo: "Página & atleta",
        itens: [
          "Página pública do evento",
          "Perfil de atleta reaproveitado",
          "Minhas inscrições",
          "Chaves, cronograma e lutas",
          "Três idiomas (PT · EN · ES)",
        ],
      },
    ],
    ctaTitle: "O tatame,",
    ctaAccent: "organizado",
    ctaBtn1: "Criar meu evento",
    ctaBtn2: "Ver eventos",
    foot: {
      tagline: "O sistema completo para campeonatos de jiu-jitsu.",
      colOrg: "Organizador",
      colAtleta: "Atleta",
      colSistema: "Sistema",
      lkCriar: "Criar evento",
      lkConsole: "Console",
      lkPreco: "Preço",
      lkEventos: "Eventos",
      lkInscricoes: "Minhas inscrições",
      lkEntrar: "Entrar",
      lkRecursos: "Recursos",
      lkFormatos: "Formatos",
      lkAtleta: "Minha área",
      copy: "© 2026 LeagueMat · Sistema de competições de jiu-jitsu",
    },
  },

  en: {
    nav: {
      recursos: "Features",
      formatos: "Formats",
      preco: "Pricing",
      eventos: "Events",
      entrar: "Sign in",
      criar: "Create event",
    },
    hero: {
      badge: "The operating system of jiu-jitsu",
      l1: "The whole championship.",
      l2pre: "One",
      accent: "system",
      desc: "Pix registration, automatic brackets, a schedule with live estimates, digital scoreboards and an official ranking. Federations and gyms run the whole championship — from the first sign-up to the podium.",
      btn1: "Create event →",
      btn2: "Browse events",
      prova: "Live · Gi & No-Gi · PT · EN · ES",
    },
    ticker: [
      "Gi & No-Gi",
      "Automatic brackets",
      "Official ranking",
      "Pix built in",
      "QR check-in",
      "Live big screen",
      "Schedule with ETAs",
    ],
    spot: {
      eyebrow: "The engine",
      tPre: "The bracket builder does the ",
      tAccent: "heavy lifting",
      tPos: ".",
      desc: "Registrations grouped by division become ready-to-run brackets in one click. Generate every division in batch, let the system pick the format by size and compute the schedule on its own.",
      bullets: [
        "Batch bracket generation",
        "Automatic format by size",
        "Seeding that splits the same gym",
        "Estimated time for every match",
      ],
      cta: "See a live bracket →",
    },
    pilaresEyebrow: "One platform, fully integrated",
    pilaresTitle: "Everything a federation needs",
    pilares: [
      {
        t: "Registration & Pix",
        d: "Built-in Pix checkout, registration waves priced by period and the category detected from each profile.",
      },
      {
        t: "Divisions & categories",
        d: "Belt, age and weight combine into automatic divisions — with price and match time per category.",
      },
      {
        t: "Automatic brackets",
        d: "Single elimination and round robin, generated in batch and chosen by the size of the division.",
      },
      {
        t: "Schedule & mats",
        d: "Spread divisions across mats with an estimated time for every match, recomputed on every change.",
      },
      {
        t: "Scoreboard & big screen",
        d: "Digital scoreboard per mat and a live schedule big screen to project at the venue.",
      },
      {
        t: "Official ranking",
        d: "Every result feeds the ranking by belt, age and weight — plus the team ranking.",
      },
    ],
    statLabels: ["Events", "Athletes", "Teams", "Registrations"],
    comoEyebrow: "How it works",
    comoTitle: "From sign-up to the podium",
    steps: [
      {
        title: "Create a profile",
        desc: "One profile with belt, weight and team, reused across every stage.",
      },
      {
        title: "Register",
        desc: "Category detected from your profile, with weigh-in and Pix payment built in.",
      },
      {
        title: "Follow the bracket",
        desc: "Live brackets, mat calls on the big screen and an estimate for every match.",
      },
      {
        title: "Climb the ranking",
        desc: "Every result feeds the official ranking by belt, age and weight.",
      },
    ],
    fmtEyebrow: "Brackets",
    fmtTitle: "Handles any bracket",
    fmtDesc: "From a group of three to a packed division. Pick the format or let the system decide by the number of entries.",
    formatos: [
      { t: "Single elimination", d: "to the final" },
      { t: "Round robin", d: "everyone plays" },
      { t: "Auto selection", d: "by size" },
      { t: "Batch generation", d: "all at once" },
      { t: "Seed by gym", d: "splits teammates" },
      { t: "Submission tiebreak", d: "and head-to-head" },
    ],
    fmtNota: "Double elimination and repechage are on the way.",
    diaEyebrow: "On event day",
    diaTitle: "Run the whole event end to end",
    diaDesc: "From check-in to the scoreboard, everything talks to the same bracket.",
    dia: [
      {
        t: "QR check-in",
        d: "Every entry becomes a QR. Confirm attendance and weigh-in with no queue.",
      },
      {
        t: "Digital scoreboard",
        d: "One scoreboard per mat, on a tablet, wired straight to the live bracket.",
      },
      {
        t: "Live big screen",
        d: "Project the schedule with times that update on their own.",
      },
    ],
    rankEyebrow: "Circuit ranking",
    rankTitle: "The best on the circuit",
    rankDesc: "Every finished bracket updates the ranking by belt, age and weight — and the team race.",
    rankEmpty: "The ranking is born once the first brackets finish.",
    rankTabs: { adulto: "Adult", master: "Master", feminino: "Female" },
    atletaEyebrow: "For the athlete",
    atletaTitle: "One profile, every stage",
    atletaDesc: "Athletes build a profile once and follow everything in the browser — nothing to install.",
    atleta: [
      {
        t: "Reusable profile",
        d: "Belt, weight and team saved, ready for the next sign-up.",
      },
      {
        t: "Public event page",
        d: "Brackets, schedule, matches and athletes — open to everyone.",
      },
      {
        t: "My registrations",
        d: "Track payments, brackets and results in one place.",
      },
    ],
    atletaCta: "I'm an athlete →",
    precoEyebrow: "Pricing",
    precoTitle: "Simple pricing",
    precoDesc: "Start for free. When the event happens, you pay per registered athlete — no subscription to get going.",
    planos: [
      {
        nome: "Free",
        preco: "$0",
        unidade: "to get started",
        desc: "Create and publish your first event.",
        itens: [
          "Public event page",
          "Registrations and brackets",
          "Schedule and big screen",
        ],
        destaque: false,
        cta: "Create event",
      },
      {
        nome: "Per athlete",
        preco: "1 credit",
        unidade: "= 1 athlete / event",
        desc: "Pay as the event grows. One registration is one credit, across as many divisions as you like.",
        itens: [
          "Everything in Free",
          "Mat scoreboard and check-in",
          "Official circuit ranking",
        ],
        destaque: true,
        cta: "Talk to us",
      },
      {
        nome: "Federation",
        preco: "Custom",
        unidade: "circuit & season",
        desc: "For running a whole season with a ranking and multiple stages.",
        itens: [
          "Season-long ranking",
          "Multiple stages and mats",
          "Dedicated support",
        ],
        destaque: false,
        cta: "Talk to us",
      },
    ],
    precoNota: "An unused credit before the event stays yours. Final prices on request.",
    inclEyebrow: "All included",
    inclTitle: "One platform, fully connected",
    grupos: [
      {
        titulo: "Registration & payment",
        itens: [
          "Pix checkout (Asaas)",
          "Registration waves by period",
          "Price per category",
          "Automatic confirmation",
          "Your own registration page",
        ],
      },
      {
        titulo: "Divisions & brackets",
        itens: [
          "Automatic belt, age and weight",
          "Batch bracket generation",
          "Single elimination and round robin",
          "Automatic format by size",
          "Seed by gym",
        ],
      },
      {
        titulo: "Schedule & mats",
        itens: [
          "Spread across mats",
          "Estimated time per match",
          "Interleaved rounds",
          "Match time per category",
          "Recomputed on every change",
        ],
      },
      {
        titulo: "Scoreboard & big screen",
        itens: [
          "Digital scoreboard per mat",
          "Live schedule big screen",
          "Automatic updates",
          "Ready for tablet and projector",
        ],
      },
      {
        titulo: "Ranking & results",
        itens: [
          "Ranking by belt, age and weight",
          "Team ranking",
          "Public results page",
          "Updates on every bracket",
        ],
      },
      {
        titulo: "Page & athlete",
        itens: [
          "Public event page",
          "Reusable athlete profile",
          "My registrations",
          "Brackets, schedule and matches",
          "Three languages (PT · EN · ES)",
        ],
      },
    ],
    ctaTitle: "The mat,",
    ctaAccent: "organized",
    ctaBtn1: "Create my event",
    ctaBtn2: "Browse events",
    foot: {
      tagline: "The complete platform for jiu-jitsu championships.",
      colOrg: "Organizer",
      colAtleta: "Athlete",
      colSistema: "System",
      lkCriar: "Create event",
      lkConsole: "Console",
      lkPreco: "Pricing",
      lkEventos: "Events",
      lkInscricoes: "My registrations",
      lkEntrar: "Sign in",
      lkRecursos: "Features",
      lkFormatos: "Formats",
      lkAtleta: "My area",
      copy: "© 2026 LeagueMat · Jiu-jitsu competition system",
    },
  },

  es: {
    nav: {
      recursos: "Recursos",
      formatos: "Formatos",
      preco: "Precio",
      eventos: "Eventos",
      entrar: "Entrar",
      criar: "Crear evento",
    },
    hero: {
      badge: "El sistema operativo del jiu-jitsu",
      l1: "Todo el campeonato.",
      l2pre: "Un solo",
      accent: "sistema",
      desc: "Inscripciones con Pix, llaves automáticas, cronograma con horarios estimados, marcador digital y ranking oficial. Federaciones y academias organizan todo el campeonato — de la primera inscripción al podio.",
      btn1: "Crear evento →",
      btn2: "Ver eventos",
      prova: "En línea · Gi & No-Gi · PT · EN · ES",
    },
    ticker: [
      "Gi & No-Gi",
      "Llaves automáticas",
      "Ranking oficial",
      "Pix integrado",
      "Check-in por QR",
      "Pantalla en vivo",
      "Cronograma con ETA",
    ],
    spot: {
      eyebrow: "El motor",
      tPre: "Las llaves hacen el ",
      tAccent: "trabajo pesado",
      tPos: ".",
      desc: "Inscripciones agrupadas por división se vuelven llaves listas en un clic. Generas todas las divisiones en lote, el sistema elige el formato por tamaño y calcula los horarios solo.",
      bullets: [
        "Llaves generadas en lote",
        "Formato automático por tamaño",
        "Siembra que separa la misma academia",
        "Horario estimado de cada combate",
      ],
      cta: "Ver una llave en vivo →",
    },
    pilaresEyebrow: "Una plataforma, todo integrado",
    pilaresTitle: "Todo lo que una federación necesita",
    pilares: [
      {
        t: "Inscripciones y Pix",
        d: "Cobro integrado por Pix, lotes con precio por período y categoría detectada por el perfil.",
      },
      {
        t: "Divisiones y categorías",
        d: "Cinturón, edad y peso se combinan en divisiones automáticas — con precio y tiempo de combate por categoría.",
      },
      {
        t: "Llaves automáticas",
        d: "Eliminación simple y todos contra todos, generadas en lote y elegidas por el tamaño de la división.",
      },
      {
        t: "Cronograma y áreas",
        d: "Distribuye las divisiones entre las áreas con horario estimado de cada combate, recalculado en cada cambio.",
      },
      {
        t: "Marcador y pantalla",
        d: "Marcador digital por área y pantalla del cronograma en vivo para proyectar en el gimnasio.",
      },
      {
        t: "Ranking oficial",
        d: "Cada resultado alimenta el ranking por cinturón, edad y peso — y el ranking de equipos.",
      },
    ],
    statLabels: ["Eventos", "Atletas", "Equipos", "Inscripciones"],
    comoEyebrow: "Cómo funciona",
    comoTitle: "De la inscripción al podio",
    steps: [
      {
        title: "Crea el perfil",
        desc: "Perfil único con cinturón, peso y equipo, reutilizado en cada etapa.",
      },
      {
        title: "Inscríbete",
        desc: "Categoría detectada por tu perfil, con pesaje y pago por Pix integrados.",
      },
      {
        title: "Sigue la llave",
        desc: "Llaves en vivo, llamado de área en la pantalla y horario estimado de cada combate.",
      },
      {
        title: "Sube en el ranking",
        desc: "Cada resultado alimenta el ranking oficial por cinturón, edad y peso.",
      },
    ],
    fmtEyebrow: "Llaves",
    fmtTitle: "Con cualquier llave",
    fmtDesc: "Del grupo de tres a la división llena. Elige el formato o deja que el sistema decida por el número de inscritos.",
    formatos: [
      { t: "Eliminación simple", d: "hasta la final" },
      { t: "Todos contra todos", d: "round robin" },
      { t: "Selección automática", d: "por tamaño" },
      { t: "Generación en lote", d: "todas a la vez" },
      { t: "Siembra por academia", d: "separa compañeros" },
      { t: "Desempate por finalización", d: "y enfrentamiento directo" },
    ],
    fmtNota: "La doble eliminación y la repesca están en camino.",
    diaEyebrow: "El día del evento",
    diaTitle: "Organiza el evento de principio a fin",
    diaDesc: "Del check-in al marcador, todo habla con la misma llave.",
    dia: [
      {
        t: "Check-in por QR",
        d: "Cada inscripción es un QR. Confirma presencia y pesaje sin fila.",
      },
      {
        t: "Marcador digital",
        d: "Un marcador por área, en la tablet, conectado a la llave en disputa.",
      },
      {
        t: "Pantalla en vivo",
        d: "Proyecta el cronograma con horarios que se actualizan solos.",
      },
    ],
    rankEyebrow: "Ranking del circuito",
    rankTitle: "Los mejores del circuito",
    rankDesc: "Cada llave concluida actualiza el ranking por cinturón, edad y peso — y la disputa por equipos.",
    rankEmpty: "El ranking nace cuando terminan las primeras llaves.",
    rankTabs: { adulto: "Adulto", master: "Master", feminino: "Femenino" },
    atletaEyebrow: "Para el atleta",
    atletaTitle: "Un perfil, todas las etapas",
    atletaDesc: "El atleta crea el perfil una vez y sigue todo desde el navegador — sin instalar nada.",
    atleta: [
      {
        t: "Perfil reutilizado",
        d: "Cinturón, peso y equipo guardados, listos para la próxima inscripción.",
      },
      {
        t: "Página pública del evento",
        d: "Llaves, cronograma, combates y atletas — abiertos para todos.",
      },
      {
        t: "Mis inscripciones",
        d: "Sigue pagos, llaves y resultados en un solo lugar.",
      },
    ],
    atletaCta: "Soy atleta →",
    precoEyebrow: "Precio",
    precoTitle: "Precio simple",
    precoDesc: "Empieza gratis. Cuando el evento ocurre, pagas por atleta inscrito — sin mensualidad para empezar.",
    planos: [
      {
        nome: "Gratis",
        preco: "$0",
        unidade: "para empezar",
        desc: "Crea y publica tu primer evento.",
        itens: [
          "Página pública del evento",
          "Inscripciones y llaves",
          "Cronograma y pantalla",
        ],
        destaque: false,
        cta: "Crear evento",
      },
      {
        nome: "Por atleta",
        preco: "1 crédito",
        unidade: "= 1 atleta / evento",
        desc: "Paga a medida que el evento crece. Una inscripción es un crédito, en las divisiones que quieras.",
        itens: [
          "Todo lo del plan Gratis",
          "Marcador por área y check-in",
          "Ranking oficial del circuito",
        ],
        destaque: true,
        cta: "Hablar con nosotros",
      },
      {
        nome: "Federación",
        preco: "A medida",
        unidade: "circuito y temporada",
        desc: "Para quien organiza una temporada entera con ranking y varias etapas.",
        itens: [
          "Ranking por temporada",
          "Varias etapas y áreas",
          "Soporte dedicado",
        ],
        destaque: false,
        cta: "Hablar con nosotros",
      },
    ],
    precoNota: "El crédito no usado antes del evento queda contigo. Valores finales bajo consulta.",
    inclEyebrow: "Todo incluido",
    inclTitle: "Una plataforma, todo conectado",
    grupos: [
      {
        titulo: "Inscripciones y pago",
        itens: [
          "Cobro por Pix (Asaas)",
          "Lotes con precio por período",
          "Precio por categoría",
          "Confirmación automática",
          "Página de inscripción propia",
        ],
      },
      {
        titulo: "Divisiones y llaves",
        itens: [
          "Cinturón, edad y peso automáticos",
          "Generación de llaves en lote",
          "Eliminación simple y round robin",
          "Formato automático por tamaño",
          "Siembra por academia",
        ],
      },
      {
        titulo: "Cronograma y áreas",
        itens: [
          "Distribución entre áreas",
          "Horario estimado por combate",
          "Intercalado de rondas",
          "Tiempo de combate por categoría",
          "Recalcula en cada cambio",
        ],
      },
      {
        titulo: "Marcador y pantalla",
        itens: [
          "Marcador digital por área",
          "Pantalla del cronograma en vivo",
          "Actualización automática",
          "Listo para tablet y proyector",
        ],
      },
      {
        titulo: "Ranking y resultados",
        itens: [
          "Ranking por cinturón, edad y peso",
          "Ranking de equipos",
          "Página pública de resultados",
          "Se actualiza en cada llave",
        ],
      },
      {
        titulo: "Página y atleta",
        itens: [
          "Página pública del evento",
          "Perfil de atleta reutilizado",
          "Mis inscripciones",
          "Llaves, cronograma y combates",
          "Tres idiomas (PT · EN · ES)",
        ],
      },
    ],
    ctaTitle: "El tatami,",
    ctaAccent: "organizado",
    ctaBtn1: "Crear mi evento",
    ctaBtn2: "Ver eventos",
    foot: {
      tagline: "La plataforma completa para campeonatos de jiu-jitsu.",
      colOrg: "Organizador",
      colAtleta: "Atleta",
      colSistema: "Sistema",
      lkCriar: "Crear evento",
      lkConsole: "Consola",
      lkPreco: "Precio",
      lkEventos: "Eventos",
      lkInscricoes: "Mis inscripciones",
      lkEntrar: "Entrar",
      lkRecursos: "Recursos",
      lkFormatos: "Formatos",
      lkAtleta: "Mi área",
      copy: "© 2026 LeagueMat · Sistema de competiciones de jiu-jitsu",
    },
  },
};

const LANGS: { code: string; id: Lang }[] = [
  { code: "PT", id: "pt" },
  { code: "EN", id: "en" },
  { code: "ES", id: "es" },
];

/* ícones (independentes de idioma), pareados por índice às listas do DICT */
const PILAR_IC = [
  "inscricao",
  "divisoes",
  "chave",
  "cronograma",
  "placar",
  "ranking",
];
const DIA_IC = ["checkin", "placar", "telao"];
const ATLETA_IC = ["perfil", "pagina", "medalha"];

/* ------------------------------------------------------------------------ */
/* Ícone — traço reto, currentColor, com um acento vermelho quando cabe       */
/* ------------------------------------------------------------------------ */

function Ic({ name }: { name: string }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
  };
  const brand = "var(--color-brand)";
  const s = (
    children: React.ReactNode,
  ): React.ReactElement => (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden>
      {children}
    </svg>
  );

  switch (name) {
    case "inscricao":
      return s(
        <>
          <rect x="3.5" y="3" width="17" height="18" {...p} />
          <line x1="7" y1="8" x2="13" y2="8" {...p} />
          <line x1="7" y1="12" x2="11" y2="12" {...p} />
          <polygon points="16,12 19.5,15.5 16,19 12.5,15.5" fill={brand} />
        </>,
      );
    case "divisoes":
      return s(
        <>
          <rect x="3" y="4" width="18" height="3.6" fill={brand} />
          <rect x="3" y="10.2" width="12" height="3.6" {...p} />
          <rect x="3" y="16.4" width="15" height="3.6" {...p} />
        </>,
      );
    case "chave":
      return s(
        <>
          <line x1="3" y1="6" x2="8.5" y2="6" {...p} />
          <line x1="3" y1="12" x2="8.5" y2="12" {...p} />
          <line x1="8.5" y1="6" x2="8.5" y2="12" {...p} />
          <line x1="8.5" y1="9" x2="13.5" y2="9" {...p} />
          <line x1="13.5" y1="9" x2="13.5" y2="18" {...p} />
          <line x1="13.5" y1="18" x2="19" y2="18" {...p} />
          <rect x="18.5" y="8" width="3" height="3" fill={brand} />
        </>,
      );
    case "cronograma":
      return s(
        <>
          <rect x="3" y="4" width="18" height="16" {...p} />
          <line x1="3" y1="9" x2="21" y2="9" {...p} />
          <line x1="9" y1="9" x2="9" y2="20" {...p} />
          <line x1="15" y1="9" x2="15" y2="20" {...p} />
          <rect x="3.8" y="12" width="4.4" height="3" fill={brand} />
        </>,
      );
    case "placar":
      return s(
        <>
          <rect x="2.5" y="5" width="19" height="12" {...p} />
          <line x1="12" y1="5" x2="12" y2="17" {...p} />
          <line x1="6" y1="9" x2="6" y2="13" {...p} />
          <rect x="15" y="9" width="3.5" height="4" fill={brand} />
          <line x1="9" y1="20" x2="15" y2="20" {...p} />
        </>,
      );
    case "ranking":
    case "medalha":
      return s(
        <>
          <rect x="3.5" y="13" width="4.5" height="7" {...p} />
          <rect x="9.75" y="8" width="4.5" height="12" fill={brand} />
          <rect x="16" y="15" width="4.5" height="5" {...p} />
        </>,
      );
    case "checkin":
      return s(
        <>
          <rect x="3" y="3" width="7" height="7" {...p} />
          <rect x="14" y="3" width="7" height="7" {...p} />
          <rect x="3" y="14" width="7" height="7" {...p} />
          <rect x="16" y="16" width="5" height="5" fill={brand} />
        </>,
      );
    case "telao":
      return s(
        <>
          <rect x="3" y="4" width="18" height="12" {...p} />
          <line x1="12" y1="16" x2="12" y2="20" {...p} />
          <line x1="8.5" y1="20" x2="15.5" y2="20" {...p} />
          <rect x="6" y="7" width="6" height="2.4" fill={brand} />
        </>,
      );
    case "perfil":
      return s(
        <>
          <circle cx="12" cy="8" r="3.6" {...p} />
          <path d="M5 20 v-0.6 a7 7 0 0 1 14 0 V20" {...p} />
          <rect x="10.4" y="6.4" width="3.2" height="3.2" fill={brand} />
        </>,
      );
    case "pagina":
      return s(
        <>
          <rect x="3" y="4" width="18" height="16" {...p} />
          <line x1="3" y1="9" x2="21" y2="9" {...p} />
          <rect x="5.5" y="6" width="3" height="1.6" fill={brand} />
          <line x1="6" y1="13" x2="18" y2="13" {...p} />
          <line x1="6" y1="16.5" x2="14" y2="16.5" {...p} />
        </>,
      );
    default:
      return s(<rect x="4" y="4" width="16" height="16" fill={brand} />);
  }
}

/** Quadro do ícone com a assinatura skew −9°. */
function IconeBox({ name }: { name: string }) {
  return (
    <span className="mb-5 inline-flex h-[52px] w-[52px] -skew-x-9 items-center justify-center border border-brand/35 bg-brand/10 text-brand">
      <span className="skew-x-9">
        <Ic name={name} />
      </span>
    </span>
  );
}

/** Marcador de item ✓ com o losango skew da marca. */
function Marca() {
  return (
    <span className="mt-[7px] h-2 w-2 shrink-0 -skew-x-9 bg-brand" aria-hidden />
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-cond text-[15px] font-semibold uppercase tracking-[0.12em] text-brand">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Página                                                                    */
/* ------------------------------------------------------------------------ */

export function LandingClient({
  stats,
  ranking,
  bracket,
}: {
  stats: StatLanding[];
  ranking: RankingGeral;
  bracket: BracketVivo;
}) {
  const { locale: lang, trocar: trocarLang } = useIdioma();
  const [abaRanking, setAbaRanking] = useState<keyof RankingGeral>("adulto");

  const t = DICT[lang];
  const linhasRanking = ranking[abaRanking].slice(0, 5);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-white/8 bg-ink/90 px-6 py-4 backdrop-blur-xl md:px-12">
        <Logo />
        <div className="flex items-center gap-6 font-cond text-base font-semibold uppercase tracking-[0.04em] lg:gap-7">
          <a href="#recursos" className="max-lg:hidden transition-colors hover:text-brand">
            {t.nav.recursos}
          </a>
          <a href="#formatos" className="max-lg:hidden transition-colors hover:text-brand">
            {t.nav.formatos}
          </a>
          <a href="#preco" className="max-lg:hidden transition-colors hover:text-brand">
            {t.nav.preco}
          </a>
          <Link href="/eventos" className="max-md:hidden transition-colors hover:text-brand">
            {t.nav.eventos}
          </Link>
          <div className="flex items-center border border-white/16">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => trocarLang(l.id)}
                className={cn(
                  "cursor-pointer px-2.5 py-1.5 font-cond text-sm font-bold tracking-[0.06em] transition-colors",
                  lang === l.id
                    ? "bg-brand text-white"
                    : "text-muted-2 hover:text-foreground",
                )}
              >
                {l.code}
              </button>
            ))}
          </div>
          <Link href="/acesso" className="max-md:hidden transition-colors hover:text-brand">
            {t.nav.entrar}
          </Link>
          <Link
            href="/organizador"
            className="-skew-x-9 bg-brand px-5 py-2.5 text-white"
          >
            <SkewTexto>{t.nav.criar}</SkewTexto>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative flex min-h-[90vh] items-center overflow-hidden">
        <div className="absolute inset-0 bg-stripes-hero" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(12,12,13,0.96)_0%,rgba(12,12,13,0.82)_42%,rgba(12,12,13,0.45)_100%)]" />
        <div className="pointer-events-none absolute -right-10 top-[44%] -translate-y-1/2">
          <div className="disp whitespace-nowrap text-[340px] tracking-[0.02em] text-white/[0.03]">
            JIU-JITSU
          </div>
        </div>

        <div className="relative z-[2] w-full px-6 py-24 md:px-12">
          <div className="mb-6 inline-flex -skew-x-9 items-center bg-brand px-4 py-2 font-cond text-[15px] font-semibold uppercase tracking-[0.08em] text-white">
            <SkewTexto>
              <span className="h-2 w-2 rounded-full bg-white animate-pulse-dot" />
              {t.hero.badge}
            </SkewTexto>
          </div>
          <h1 className="disp max-w-[1100px] text-[clamp(64px,12vw,190px)] tracking-[0.005em]">
            {t.hero.l1}
            <br />
            {t.hero.l2pre} <span className="text-brand">{t.hero.accent}</span>.
          </h1>
          <div className="mt-8 flex flex-wrap items-end gap-x-11 gap-y-7">
            <p className="max-w-[520px] text-[19px] font-medium leading-normal text-text-2">
              {t.hero.desc}
            </p>
            <div className="flex flex-wrap gap-3.5">
              <Link
                href="/organizador"
                className="-skew-x-9 bg-brand px-8 py-4 font-cond text-[19px] font-bold uppercase tracking-[0.04em] text-white"
              >
                <SkewTexto>{t.hero.btn1}</SkewTexto>
              </Link>
              <Link
                href="/eventos"
                className="-skew-x-9 border border-white/28 px-8 py-4 font-cond text-[19px] font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/55"
              >
                <SkewTexto>{t.hero.btn2}</SkewTexto>
              </Link>
            </div>
          </div>
          <div className="mt-9 flex items-center gap-2.5 font-cond text-sm font-semibold uppercase tracking-[0.1em] text-muted-2">
            <span className="h-2 w-2 rounded-full bg-live animate-pulse-dot" />
            {t.hero.prova}
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="-mt-1.5 -skew-y-[0.6deg] overflow-hidden bg-brand py-2.5">
        <div className="flex w-max animate-marquee font-cond text-[19px] font-bold uppercase tracking-[0.08em] text-white">
          {[0, 1].map((copia) => (
            <div key={copia} className="flex" aria-hidden={copia === 1}>
              {t.ticker.map((item) => (
                <span key={item} className="flex items-center">
                  <span className="px-[22px]">{item}</span>
                  <span>/</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* SPOTLIGHT — o chaveamento faz o trabalho pesado (chave real/demo) */}
      <section id="aovivo" className="border-b border-white/8 px-6 py-[84px] md:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <Eyebrow>{t.spot.eyebrow}</Eyebrow>
            <h2 className="disp text-[clamp(44px,6vw,76px)]">
              {t.spot.tPre}
              <span className="text-brand">{t.spot.tAccent}</span>
              {t.spot.tPos}
            </h2>
            <p className="mt-5 max-w-[520px] text-[18px] font-medium leading-normal text-text-2">
              {t.spot.desc}
            </p>
            <div className="mt-7 flex flex-col gap-2.5">
              {t.spot.bullets.map((b) => (
                <div key={b} className="flex items-start gap-3">
                  <Marca />
                  <span className="font-cond text-[19px] font-semibold uppercase tracking-[0.02em] text-foreground">
                    {b}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* card da chave */}
          <div className="border border-white/10 bg-surface">
            <div className="flex items-center justify-between border-b border-white/8 px-[18px] py-3 font-cond text-sm uppercase tracking-[0.08em] text-muted-2">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full animate-pulse-dot",
                    bracket.demo ? "bg-brand" : "bg-live",
                  )}
                />
                {bracket.titulo}
              </span>
              <span className="text-brand">
                {bracket.demo ? "DEMO" : "LIVE"}
              </span>
            </div>
            {[...bracket.esquerda, ...bracket.direita].map((m, i) => (
              <div
                key={`${m.nome}-${i}`}
                className={cn(
                  "flex items-center justify-between border-b border-white/6 px-[18px] py-[15px]",
                  m.venceu && "bg-brand/6",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "h-[26px] w-1.5",
                      m.venceu ? "bg-brand" : "bg-white/15",
                    )}
                  />
                  <span
                    className={cn(
                      "font-cond text-[22px] font-semibold uppercase",
                      m.venceu ? "text-foreground" : "text-muted-2",
                    )}
                  >
                    {m.nome}
                  </span>
                </div>
                <span
                  className={cn(
                    "disp tnum text-[34px]",
                    m.venceu ? "text-brand" : "text-muted-2",
                  )}
                >
                  {m.placar}
                </span>
              </div>
            ))}
            <div className="px-[18px] py-3">
              <Link
                href={bracket.href}
                className="font-cond text-sm font-bold uppercase tracking-[0.08em] text-brand-soft hover:text-brand"
              >
                {t.spot.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PILARES */}
      <section id="recursos" className="scroll-mt-24 border-b border-white/8 px-6 py-[84px] md:px-12">
        <div className="mb-11">
          <Eyebrow>{t.pilaresEyebrow}</Eyebrow>
          <h2 className="disp text-[clamp(44px,6vw,72px)]">{t.pilaresTitle}</h2>
        </div>
        <div className="grid gap-px bg-white/8 md:grid-cols-2 lg:grid-cols-3">
          {t.pilares.map((ft, i) => (
            <div key={ft.t} className="bg-background p-8">
              <IconeBox name={PILAR_IC[i]} />
              <h3 className="disp mb-2.5 text-[30px]">{ft.t}</h3>
              <p className="text-[15px] font-medium leading-normal text-muted-2">
                {ft.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* STATS (dados reais) */}
      <section className="border-b border-white/8 px-6 py-[54px] md:px-12">
        <div className="grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-background px-[30px] py-[26px]">
              <div
                className={cn(
                  "disp tnum text-[clamp(56px,7vw,80px)]",
                  s.destaque ? "text-brand" : "text-foreground",
                )}
              >
                {s.valor}
              </div>
              <div className="mt-0.5 font-cond text-[15px] uppercase tracking-[0.08em] text-muted-2">
                {t.statLabels[i]}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA (seção clara inclinada) */}
      <section className="-mx-5 -skew-y-[1.2deg] overflow-hidden bg-paper px-6 py-[84px] text-ink md:px-12">
        <div className="skew-y-[1.2deg] px-5">
          <div className="relative mb-11">
            <div className="disp pointer-events-none absolute -top-10 left-0 text-[120px] text-ink/5">
              01
            </div>
            <div className="relative mb-1.5 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
              {t.comoEyebrow}
            </div>
            <h2 className="disp relative text-[clamp(44px,7vw,72px)]">
              {t.comoTitle}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((st, i) => (
              <div key={st.title}>
                <div className="disp text-[64px] leading-[0.8] text-brand">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="my-3.5 h-[3px] w-11 bg-ink" />
                <div className="disp mb-2 text-[32px]">{st.title}</div>
                <p className="text-[15px] font-medium leading-normal text-[#4A4A47]">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORMATOS */}
      <section id="formatos" className="scroll-mt-24 border-b border-white/8 px-6 py-[84px] md:px-12">
        <div className="grid gap-11 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow>{t.fmtEyebrow}</Eyebrow>
            <h2 className="disp text-[clamp(44px,6vw,72px)]">{t.fmtTitle}</h2>
            <p className="mt-5 max-w-[440px] text-[18px] font-medium leading-normal text-text-2">
              {t.fmtDesc}
            </p>
            <p className="mt-6 inline-flex -skew-x-9 items-center border border-white/14 px-4 py-2 font-cond text-sm font-semibold uppercase tracking-[0.06em] text-muted-2">
              <SkewTexto>
                <span className="h-1.5 w-1.5 bg-brand" />
                {t.fmtNota}
              </SkewTexto>
            </p>
          </div>
          <div className="grid gap-px bg-white/8 sm:grid-cols-2">
            {t.formatos.map((f) => (
              <div key={f.t} className="flex items-center gap-3.5 bg-background px-5 py-[18px]">
                <span className="h-8 w-1.5 -skew-x-9 bg-brand" />
                <div>
                  <div className="font-cond text-[21px] font-semibold uppercase leading-none tracking-[0.02em]">
                    {f.t}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-muted-2">
                    {f.d}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NO DIA DO EVENTO */}
      <section className="border-b border-white/8 px-6 py-[84px] md:px-12">
        <div className="mb-11 max-w-[720px]">
          <Eyebrow>{t.diaEyebrow}</Eyebrow>
          <h2 className="disp text-[clamp(44px,6vw,72px)]">{t.diaTitle}</h2>
          <p className="mt-4 text-[18px] font-medium leading-normal text-text-2">
            {t.diaDesc}
          </p>
        </div>
        <div className="grid gap-px bg-white/8 md:grid-cols-3">
          {t.dia.map((c, i) => (
            <div key={c.t} className="bg-surface p-8">
              <IconeBox name={DIA_IC[i]} />
              <h3 className="disp mb-2.5 text-[30px]">{c.t}</h3>
              <p className="text-[15px] font-medium leading-normal text-muted-2">
                {c.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* RANKING (dados reais) */}
      <section className="border-b border-white/8 px-6 py-[84px] md:px-12">
        <div className="grid gap-11 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <Eyebrow>{t.rankEyebrow}</Eyebrow>
            <h2 className="disp text-[clamp(44px,6vw,72px)]">{t.rankTitle}</h2>
            <p className="mt-5 max-w-[420px] text-[18px] font-medium leading-normal text-text-2">
              {t.rankDesc}
            </p>
            <div className="mt-7 flex gap-1.5">
              {(Object.keys(t.rankTabs) as (keyof RankingGeral)[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setAbaRanking(k)}
                  className={cn(
                    "cursor-pointer px-3.5 py-2 font-cond text-sm font-bold uppercase tracking-[0.06em] transition-colors",
                    abaRanking === k
                      ? "bg-brand text-white"
                      : "border border-white/15 text-muted-2 hover:text-foreground",
                  )}
                >
                  {t.rankTabs[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="border border-white/10">
            {linhasRanking.length === 0 ? (
              <div className="px-[18px] py-10 font-cond text-base text-muted-3">
                {t.rankEmpty}
              </div>
            ) : (
              linhasRanking.map((r, i) => (
                <div
                  key={`${r.nome}-${i}`}
                  className={cn(
                    "grid grid-cols-[56px_1fr_auto] items-center border-b border-white/6 px-[18px] py-3.5",
                    i === 0 && "bg-brand/6",
                  )}
                >
                  <span
                    className={cn(
                      "disp text-[40px]",
                      i === 0
                        ? "text-brand"
                        : i < 3
                          ? "text-foreground"
                          : "text-muted-2",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-cond text-[22px] font-semibold uppercase">
                      {r.nome}
                    </div>
                    <div className="text-[13px] font-medium text-muted-2">
                      {r.equipe}
                    </div>
                  </div>
                  <span className="disp tnum text-[34px] text-brand">
                    {r.pontos.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* PARA O ATLETA */}
      <section className="border-b border-white/8 px-6 py-[84px] md:px-12">
        <div className="mb-11 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[640px]">
            <Eyebrow>{t.atletaEyebrow}</Eyebrow>
            <h2 className="disp text-[clamp(44px,6vw,72px)]">{t.atletaTitle}</h2>
            <p className="mt-4 text-[18px] font-medium leading-normal text-text-2">
              {t.atletaDesc}
            </p>
          </div>
          <Link
            href="/atleta"
            className="font-cond text-lg font-bold uppercase tracking-[0.06em] text-brand-soft transition-colors hover:text-brand"
          >
            {t.atletaCta}
          </Link>
        </div>
        <div className="grid gap-px bg-white/8 md:grid-cols-3">
          {t.atleta.map((c, i) => (
            <div key={c.t} className="bg-background p-8">
              <IconeBox name={ATLETA_IC[i]} />
              <h3 className="disp mb-2.5 text-[30px]">{c.t}</h3>
              <p className="text-[15px] font-medium leading-normal text-muted-2">
                {c.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PREÇO */}
      <section id="preco" className="scroll-mt-24 border-b border-white/8 px-6 py-[84px] md:px-12">
        <div className="mb-11 max-w-[720px]">
          <Eyebrow>{t.precoEyebrow}</Eyebrow>
          <h2 className="disp text-[clamp(44px,6vw,72px)]">{t.precoTitle}</h2>
          <p className="mt-4 text-[18px] font-medium leading-normal text-text-2">
            {t.precoDesc}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {t.planos.map((pl) => (
            <div
              key={pl.nome}
              className={cn(
                "flex flex-col border p-8",
                pl.destaque
                  ? "border-brand bg-brand/[0.06]"
                  : "border-white/12 bg-surface",
              )}
            >
              {pl.destaque && (
                <span className="mb-4 inline-flex w-max -skew-x-9 bg-brand px-3 py-1 font-cond text-xs font-bold uppercase tracking-[0.1em] text-white">
                  <SkewTexto>★</SkewTexto>
                </span>
              )}
              <div className="font-cond text-lg font-semibold uppercase tracking-[0.06em] text-muted-2">
                {pl.nome}
              </div>
              <div className="mt-1.5 flex items-end gap-2">
                <span className="disp text-[52px] leading-none text-foreground">
                  {pl.preco}
                </span>
                <span className="pb-1.5 font-cond text-sm uppercase tracking-[0.05em] text-muted-2">
                  {pl.unidade}
                </span>
              </div>
              <p className="mt-4 text-[15px] font-medium leading-normal text-text-2">
                {pl.desc}
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                {pl.itens.map((it) => (
                  <div key={it} className="flex items-start gap-3">
                    <Marca />
                    <span className="text-[15px] font-medium text-foreground">
                      {it}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/organizador"
                className={cn(
                  "mt-8 -skew-x-9 px-6 py-3.5 text-center font-cond text-base font-bold uppercase tracking-[0.04em]",
                  pl.destaque
                    ? "bg-brand text-white"
                    : "border border-white/28 text-foreground transition-colors hover:border-white/55",
                )}
              >
                <SkewTexto>{pl.cta}</SkewTexto>
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm font-medium text-muted-3">{t.precoNota}</p>
      </section>

      {/* TUDO INCLUÍDO */}
      <section className="border-b border-white/8 px-6 py-[84px] md:px-12">
        <div className="mb-11">
          <Eyebrow>{t.inclEyebrow}</Eyebrow>
          <h2 className="disp text-[clamp(44px,6vw,72px)]">{t.inclTitle}</h2>
        </div>
        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {t.grupos.map((g) => (
            <div key={g.titulo}>
              <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
                <span className="h-2.5 w-2.5 -skew-x-9 bg-brand" />
                <h3 className="font-cond text-[22px] font-semibold uppercase tracking-[0.02em]">
                  {g.titulo}
                </h3>
              </div>
              <div className="flex flex-col gap-2.5">
                {g.itens.map((it) => (
                  <div key={it} className="flex items-start gap-3">
                    <Marca />
                    <span className="text-[15px] font-medium leading-snug text-text-2">
                      {it}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden px-6 py-[110px] text-center md:px-12">
        <div className="disp pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap text-[300px] text-brand/6">
          ARENA
        </div>
        <div className="relative">
          <h2 className="disp text-[clamp(56px,10vw,140px)]">
            {t.ctaTitle}
            <br />
            <span className="text-brand">{t.ctaAccent}</span>.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/organizador"
              className="-skew-x-9 bg-brand px-10 py-[17px] font-cond text-xl font-bold uppercase tracking-[0.04em] text-white"
            >
              <SkewTexto>{t.ctaBtn1}</SkewTexto>
            </Link>
            <Link
              href="/eventos"
              className="-skew-x-9 border border-white/28 px-10 py-[17px] font-cond text-xl font-bold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/55"
            >
              <SkewTexto>{t.ctaBtn2}</SkewTexto>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/8 px-6 py-[54px] md:px-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <span className="disp text-[30px]">
              League<span className="text-brand">Mat</span>
            </span>
            <p className="mt-3 max-w-[280px] text-[15px] font-medium leading-normal text-muted-2">
              {t.foot.tagline}
            </p>
          </div>
          <FooterCol
            titulo={t.foot.colOrg}
            links={[
              { label: t.foot.lkCriar, href: "/organizador" },
              { label: t.foot.lkConsole, href: "/organizador" },
              { label: t.foot.lkPreco, href: "#preco" },
            ]}
          />
          <FooterCol
            titulo={t.foot.colAtleta}
            links={[
              { label: t.foot.lkEventos, href: "/eventos" },
              { label: t.foot.lkInscricoes, href: "/minhas-inscricoes" },
              { label: t.foot.lkEntrar, href: "/acesso" },
            ]}
          />
          <FooterCol
            titulo={t.foot.colSistema}
            links={[
              { label: t.foot.lkRecursos, href: "#recursos" },
              { label: t.foot.lkFormatos, href: "#formatos" },
              { label: t.foot.lkAtleta, href: "/atleta" },
            ]}
          />
        </div>
        <div className="mt-10 border-t border-white/8 pt-6 font-cond text-sm uppercase tracking-[0.08em] text-muted-3">
          {t.foot.copy}
        </div>
      </footer>
    </div>
  );
}

function FooterCol({
  titulo,
  links,
}: {
  titulo: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="mb-4 font-cond text-sm font-bold uppercase tracking-[0.1em] text-muted-3">
        {titulo}
      </div>
      <div className="flex flex-col gap-2.5">
        {links.map((l) =>
          l.href.startsWith("#") ? (
            <a
              key={l.label}
              href={l.href}
              className="font-cond text-base font-semibold uppercase tracking-[0.03em] text-text-2 transition-colors hover:text-brand"
            >
              {l.label}
            </a>
          ) : (
            <Link
              key={l.label}
              href={l.href}
              className="font-cond text-base font-semibold uppercase tracking-[0.03em] text-text-2 transition-colors hover:text-brand"
            >
              {l.label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

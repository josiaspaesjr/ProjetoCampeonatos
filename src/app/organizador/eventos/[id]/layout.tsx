import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  areas,
  categorias,
  chaves,
  eventoDias,
  inscricoes,
  lotes,
} from "@/db/schema";
import { minutosParaHHMM } from "@/lib/cronograma/dias";
import {
  SidebarOrganizador,
  type ItemNav,
} from "@/components/organizador/sidebar";
import { NavMobileProvider } from "@/components/organizador/nav-mobile-context";
import { COOKIE_SIDEBAR } from "@/components/organizador/nav-mobile-config";
import { ConsoleGrid } from "@/components/organizador/console-grid";
import {
  TopbarEvento,
  type EventoEditavel,
} from "@/components/organizador/topbar-evento";
import { getUsuarioAtual } from "@/lib/auth";
import { acessoAoEvento, eventosGerenciaveis } from "@/lib/eventos/acesso";
import { temAcesso, type Secao } from "@/lib/eventos/permissoes";
import { getDicionario } from "@/lib/i18n/server";
import { dataCurta } from "@/lib/datas";
import { editarEvento } from "../actions";

function paraDatetimeLocal(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function LayoutConsoleEvento({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const nav = (await getDicionario()).admin.nav;
  const sidebarColapsada =
    (await cookies()).get(COOKIE_SIDEBAR)?.value === "1";

  const acesso = await acessoAoEvento(db, id, usuario.id);
  // sem acesso, ou colaborador sem nenhuma seção liberada: o evento não existe
  if (!acesso || (!acesso.ehDono && acesso.permissoes.length === 0)) notFound();
  const { evento, ehDono, permissoes } = acesso;

  const [meusEventos, cats, lts, ars, inscritas, diasRows] = await Promise.all([
    eventosGerenciaveis(db, usuario.id),
    db.query.categorias.findMany({ where: eq(categorias.eventoId, id) }),
    db.query.lotes.findMany({ where: eq(lotes.eventoId, id) }),
    db.query.areas.findMany({ where: eq(areas.eventoId, id) }),
    // inscritos "ativos" — confirmadas + pendentes, mesma conta da aba Inscrições
    db.query.inscricoes.findMany({
      where: and(
        eq(inscricoes.eventoId, id),
        inArray(inscricoes.status, ["confirmada", "pendente_pagamento"]),
      ),
      columns: { status: true },
    }),
    db.query.eventoDias.findMany({
      where: eq(eventoDias.eventoId, id),
      orderBy: asc(eventoDias.data),
    }),
  ]);

  const chavesGeradas = cats.length
    ? await db.query.chaves.findMany({
        where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
      })
    : [];

  const base = `/organizador/eventos/${id}`;
  // cada item declara a permissão que exige; o menu mostra só o que a pessoa
  // pode abrir (a checagem de verdade está em `eventoGerenciavel`)
  const todosItens: (ItemNav & { secao: Secao })[] = [
    { id: "overview", secao: "evento", rotulo: nav.overview, icone: "◧", href: base },
    {
      id: "inscricoes",
      secao: "inscricoes",
      rotulo: nav.inscricoes,
      icone: "◇",
      href: `${base}/inscricoes`,
      // pagas / inscritas — o organizador precisa das duas para saber o que
      // ainda falta receber
      badge: inscritas.length
        ? `${inscritas.filter((i) => i.status === "confirmada").length}/${inscritas.length}`
        : undefined,
    },
    {
      id: "lotes",
      secao: "lotes",
      rotulo: nav.lotes,
      icone: "❏",
      href: `${base}/lotes`,
      badge: lts.length ? String(lts.length) : undefined,
    },
    {
      id: "categorias",
      secao: "categorias",
      rotulo: nav.categorias,
      icone: "▦",
      href: `${base}/categorias`,
      badge: cats.length ? String(cats.length) : undefined,
    },
    {
      id: "chaves",
      secao: "chaves",
      rotulo: nav.chaves,
      icone: "⑃",
      href: `${base}/chaves`,
      badge: chavesGeradas.length ? String(chavesGeradas.length) : undefined,
    },
    {
      id: "areas",
      secao: "areas",
      rotulo: nav.areas,
      icone: "⬒",
      href: `${base}/areas`,
      badge: ars.length ? String(ars.length) : undefined,
    },
    { id: "checkin", secao: "checkin", rotulo: nav.checkin, icone: "✔", href: `${base}/checkin` },
  ];

  const itens: ItemNav[] = todosItens.filter((i) => temAcesso(permissoes, i.secao));
  // gerenciar a equipe é exclusivo do dono
  if (ehDono) {
    itens.push({ id: "equipe", rotulo: nav.equipe, icone: "⧉", href: `${base}/equipe` });
  }

  const editavel: EventoEditavel = {
    id: evento.id,
    nome: evento.nome,
    slug: evento.slug,
    status: evento.status,
    circuito: evento.circuito ?? "",
    dataInicio: evento.dataInicio,
    dias: diasRows.length
      ? diasRows.map((d) => ({
          data: d.data,
          inicio: minutosParaHHMM(d.inicioMinutos),
          fim: minutosParaHHMM(d.fimMinutos),
        }))
      : [{ data: evento.dataInicio, inicio: "09:00", fim: "18:00" }],
    inscricoesFecham: paraDatetimeLocal(evento.inscricoesFecham),
    cidade: evento.cidade ?? "",
    uf: evento.uf ?? "",
    moeda: evento.moeda,
    endereco: evento.endereco ?? "",
    bannerUrl: evento.bannerUrl ?? "",
    modalidade: evento.modalidade,
    dataPesagem: evento.dataPesagem ?? "",
    dataGeracaoChaves: evento.dataGeracaoChaves ?? "",
    descricao: evento.descricao ?? "",
    regulamento: evento.regulamento ?? {},
  };

  return (
    <NavMobileProvider colapsadoInicial={sidebarColapsada}>
      <ConsoleGrid
        sidebar={
          <SidebarOrganizador
            eventoId={evento.id}
            eventos={meusEventos.map((e) => ({
              id: e.id,
              nome: e.nome,
              dataCurta: dataCurta(e.dataInicio),
            }))}
            itens={itens}
          />
        }
      >
        <div className="flex min-w-0 flex-col">
          <TopbarEvento
            evento={editavel}
            editar={editarEvento.bind(null, evento.id)}
            podeEditar={temAcesso(permissoes, "evento")}
          />
          <div className="flex flex-col gap-8 px-6 pb-[90px] pt-8 md:px-10">
            {children}
          </div>
        </div>
      </ConsoleGrid>
    </NavMobileProvider>
  );
}

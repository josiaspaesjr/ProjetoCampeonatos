import { notFound } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { areas, categorias, chaves, eventos, inscricoes, lotes } from "@/db/schema";
import {
  SidebarOrganizador,
  type ItemNav,
} from "@/components/organizador/sidebar";
import {
  TopbarEvento,
  type EventoEditavel,
} from "@/components/organizador/topbar-evento";
import { getUsuarioAtual } from "@/lib/auth";
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

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, id), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) notFound();

  const [meusEventos, cats, lts, ars, confirmadas] = await Promise.all([
    db.query.eventos.findMany({
      where: eq(eventos.organizadorId, usuario.id),
      orderBy: desc(eventos.criadoEm),
    }),
    db.query.categorias.findMany({ where: eq(categorias.eventoId, id) }),
    db.query.lotes.findMany({ where: eq(lotes.eventoId, id) }),
    db.query.areas.findMany({ where: eq(areas.eventoId, id) }),
    db.query.inscricoes.findMany({
      where: and(eq(inscricoes.eventoId, id), eq(inscricoes.status, "confirmada")),
    }),
  ]);

  const chavesGeradas = cats.length
    ? await db.query.chaves.findMany({
        where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
      })
    : [];

  const base = `/organizador/eventos/${id}`;
  const itens: ItemNav[] = [
    { id: "overview", rotulo: "Visão geral", icone: "◧", href: base },
    {
      id: "inscricoes",
      rotulo: "Inscrições",
      icone: "◇",
      href: `${base}/inscricoes`,
      badge: confirmadas.length ? String(confirmadas.length) : undefined,
    },
    {
      id: "categorias",
      rotulo: "Categorias",
      icone: "▦",
      href: `${base}/categorias`,
      badge: cats.length ? String(cats.length) : undefined,
    },
    {
      id: "lotes",
      rotulo: "Lotes",
      icone: "❏",
      href: `${base}/lotes`,
      badge: lts.length ? String(lts.length) : undefined,
    },
    {
      id: "areas",
      rotulo: "Áreas",
      icone: "⬒",
      href: `${base}/areas`,
      badge: ars.length ? String(ars.length) : undefined,
    },
    { id: "checkin", rotulo: "Check-in", icone: "✔", href: `${base}/checkin` },
    {
      id: "chaves",
      rotulo: "Chaves",
      icone: "⑃",
      href: `${base}/chaves`,
      badge: chavesGeradas.length ? String(chavesGeradas.length) : undefined,
    },
  ];

  const editavel: EventoEditavel = {
    id: evento.id,
    nome: evento.nome,
    slug: evento.slug,
    status: evento.status,
    circuito: evento.circuito ?? "",
    dataInicio: evento.dataInicio,
    inscricoesFecham: paraDatetimeLocal(evento.inscricoesFecham),
    cidade: evento.cidade ?? "",
    uf: evento.uf ?? "",
    moeda: evento.moeda,
    endereco: evento.endereco ?? "",
    bannerUrl: evento.bannerUrl ?? "",
    modalidade: evento.modalidade,
    dataPesagem: evento.dataPesagem ?? "",
    faixaMin: evento.faixaMin ?? "",
    faixaMax: evento.faixaMax ?? "",
    descricao: evento.descricao ?? "",
    regulamento: evento.regulamento ?? {},
  };

  return (
    <div className="grid min-h-[calc(100vh-57px)] lg:grid-cols-[248px_minmax(0,1fr)]">
      <SidebarOrganizador
        eventoId={evento.id}
        eventos={meusEventos.map((e) => ({
          id: e.id,
          nome: e.nome,
          dataCurta: dataCurta(e.dataInicio),
        }))}
        itens={itens}
      />
      <div className="flex min-w-0 flex-col">
        <TopbarEvento evento={editavel} editar={editarEvento.bind(null, evento.id)} />
        <div className="flex flex-col gap-8 px-6 pb-[90px] pt-8 md:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}

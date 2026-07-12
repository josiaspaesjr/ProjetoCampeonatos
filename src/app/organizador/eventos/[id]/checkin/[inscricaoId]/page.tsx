import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos, inscricoes } from "@/db/schema";
import { AcaoTexto, BotaoAcao } from "@/components/ui/botao-acao";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getUsuarioAtual } from "@/lib/auth";
import { getDicionario } from "@/lib/i18n/server";
import { codigoCurto } from "@/lib/checkin/qr";
import { desfazerCheckin, registrarCheckin } from "../actions";

export default async function PaginaCheckinAtleta({
  params,
}: {
  params: Promise<{ id: string; inscricaoId: string }>;
}) {
  const { id, inscricaoId } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const dic = await getDicionario();
  const ca = dic.admin.checkinAtleta;

  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, id), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) notFound();

  const inscricao = await db.query.inscricoes.findFirst({
    where: and(eq(inscricoes.id, inscricaoId), eq(inscricoes.eventoId, id)),
  });
  if (!inscricao) notFound();

  const categoria = await db.query.categorias.findFirst({
    where: eq(categorias.id, inscricao.categoriaId),
  });
  const limite = categoria?.limitePesoKg ? Number(categoria.limitePesoKg) : null;
  const idade =
    new Date(evento.dataInicio).getFullYear() -
    new Date(inscricao.dataNascimento).getFullYear();

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/organizador/eventos/${id}/checkin`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {dic.admin.nav.checkin}
      </Link>

      <Card className="mt-3 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{inscricao.nomeAtleta}</h1>
              <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                {dic.inscricao.faixa}{" "}
                {dic.evento.faixaNomes[
                  inscricao.faixa as keyof typeof dic.evento.faixaNomes
                ] ?? inscricao.faixa}{" "}
                · {idade} {dic.admin.categorias.anos}
                {inscricao.academiaNome ? ` · ${inscricao.academiaNome}` : ""}
              </p>
            </div>
            <span className="font-cond text-sm text-muted-foreground">
              {codigoCurto(inscricao.id)}
            </span>
          </div>

          <div className="mt-4 rounded-xl bg-muted p-4 text-sm">
            <p className="font-medium">{categoria?.nome}</p>
            <p className="mt-0.5 text-muted-foreground">
              {limite
                ? `${ca.limiteLabel} ${limite}kg ${ca.comKimono}`
                : ca.semLimite}
            </p>
          </div>

          {inscricao.status !== "confirmada" ? (
            <p className="mt-5 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {ca.inscricaoPre}{" "}
              {dic.admin.statusInscricao[inscricao.status] ?? inscricao.status}{" "}
              {ca.naoPodeCheckin}
            </p>
          ) : inscricao.checkinEm ? (
            <div className="mt-5">
              <div
                className={`rounded-xl p-5 text-center ${inscricao.foraDoPeso ? "bg-destructive/10" : "bg-success/10"}`}
              >
                <p
                  className={`text-2xl font-bold ${inscricao.foraDoPeso ? "text-destructive" : "text-success"}`}
                >
                  {inscricao.foraDoPeso ? ca.foraDoPesoMaiusc : ca.checkinOk}
                </p>
                <p
                  className={`mt-1 text-sm ${inscricao.foraDoPeso ? "text-destructive" : "text-success"}`}
                >
                  {inscricao.pesoAferidoKg}kg
                  {limite ? ` · ${ca.limiteWord} ${limite}kg` : ""} ·{" "}
                  {inscricao.checkinEm.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {inscricao.foraDoPeso && (
                  <p className="mt-2 text-xs text-destructive">
                    {ca.foraResolva}
                  </p>
                )}
              </div>
              <form
                action={desfazerCheckin.bind(null, id, inscricao.id)}
                className="mt-3 text-center"
              >
                <AcaoTexto className="text-xs text-muted-foreground hover:text-destructive hover:underline">
                  {ca.desfazerCheckin}
                </AcaoTexto>
              </form>
            </div>
          ) : (
            <form action={registrarCheckin.bind(null, id, inscricao.id)} className="mt-5">
              <label className="block">
                <span className="text-sm font-medium">{ca.pesoAferido}</span>
                <Input
                  name="peso"
                  type="number"
                  step="0.01"
                  min="20"
                  max="300"
                  required
                  autoFocus
                  placeholder="75.40"
                  className="mt-1 h-14 text-2xl font-bold tabular-nums"
                />
              </label>
              <BotaoAcao variant="success" size="lg" className="mt-4 w-full">
                {ca.registrarPesagem}
              </BotaoAcao>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

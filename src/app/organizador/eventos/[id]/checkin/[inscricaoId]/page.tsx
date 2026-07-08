import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, eventos, inscricoes } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
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
      <Link href={`/organizador/eventos/${id}/checkin`} className="text-sm text-zinc-500 hover:underline">
        ← Check-in
      </Link>

      <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{inscricao.nomeAtleta}</h1>
            <p className="mt-0.5 text-sm capitalize text-zinc-500">
              faixa {inscricao.faixa} · {idade} anos
              {inscricao.academiaNome ? ` · ${inscricao.academiaNome}` : ""}
            </p>
          </div>
          <span className="font-mono text-sm text-zinc-400">{codigoCurto(inscricao.id)}</span>
        </div>

        <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm">
          <p className="font-medium">{categoria?.nome}</p>
          <p className="mt-0.5 text-zinc-500">
            {limite ? `Limite: ${limite}kg (com kimono)` : "Sem limite de peso"}
          </p>
        </div>

        {inscricao.status !== "confirmada" ? (
          <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Inscrição {inscricao.status.replace("_", " ")} — não pode fazer check-in.
          </p>
        ) : inscricao.checkinEm ? (
          <div className="mt-5">
            <div
              className={`rounded-xl p-5 text-center ${inscricao.foraDoPeso ? "bg-red-50" : "bg-emerald-50"}`}
            >
              <p className={`text-2xl font-bold ${inscricao.foraDoPeso ? "text-red-700" : "text-emerald-700"}`}>
                {inscricao.foraDoPeso ? "FORA DO PESO" : "Check-in OK ✓"}
              </p>
              <p className={`mt-1 text-sm ${inscricao.foraDoPeso ? "text-red-700" : "text-emerald-700"}`}>
                {inscricao.pesoAferidoKg}kg
                {limite ? ` · limite ${limite}kg` : ""} ·{" "}
                {inscricao.checkinEm.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {inscricao.foraDoPeso && (
                <p className="mt-2 text-xs text-red-600">
                  Resolva na gestão de inscrições: mover de categoria ou
                  desclassificar, conforme o regulamento do evento.
                </p>
              )}
            </div>
            <form action={desfazerCheckin.bind(null, id, inscricao.id)} className="mt-3 text-center">
              <button className="text-xs text-zinc-400 hover:text-red-500 hover:underline">
                desfazer check-in (registrado na auditoria)
              </button>
            </form>
          </div>
        ) : (
          <form action={registrarCheckin.bind(null, id, inscricao.id)} className="mt-5">
            <label className="block">
              <span className="text-sm font-medium">Peso aferido (kg)</span>
              <input
                name="peso"
                type="number"
                step="0.01"
                min="20"
                max="300"
                required
                autoFocus
                placeholder="75.40"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-2xl font-bold tabular-nums focus:border-zinc-900 focus:outline-none"
              />
            </label>
            <button className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500">
              Registrar pesagem
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

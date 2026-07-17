import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { eventoColaboradores, usuarios } from "@/db/schema";
import { AcaoTexto, BotaoAcao } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { ConviteLink } from "@/components/organizador/convite-link";
import { getUsuarioAtual } from "@/lib/auth";
import { ehDonoDoEvento, eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { convidarColaborador, revogarColaborador } from "./actions";

export default async function PaginaEquipe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const t = (await getDicionario()).admin.equipe;

  const evento = await eventoGerenciavel(db, id, usuario.id);
  if (!evento) notFound();
  const ehDono = ehDonoDoEvento(evento, usuario.id);

  const dono = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, evento.organizadorId),
    columns: { nome: true, email: true },
  });

  const colaboradores = await db.query.eventoColaboradores.findMany({
    where: eq(eventoColaboradores.eventoId, id),
  });
  const uids = colaboradores
    .map((c) => c.usuarioId)
    .filter((x): x is string => !!x);
  const perfis = uids.length
    ? await db.query.usuarios.findMany({
        where: inArray(usuarios.id, uids),
        columns: { id: true, nome: true, email: true },
      })
    : [];
  const perfilPorId = new Map(perfis.map((u) => [u.id, u]));

  const ativos = colaboradores.filter((c) => c.status === "ativo");
  const pendentes = colaboradores.filter((c) => c.status === "pendente");

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold">{t.titulo}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t.descricao}</p>
      </div>

      {/* DONO + COLABORADORES ATIVOS */}
      <section>
        <h2 className="mb-3 font-cond text-sm font-semibold uppercase tracking-[0.08em] text-muted-2">
          {t.colaboradores}
        </h2>
        <ul className="divide-y divide-border rounded-xl border bg-card">
          <li className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {dono?.nome}
                {evento.organizadorId === usuario.id && (
                  <span className="ml-2 text-xs font-normal text-brand">
                    ({t.voce})
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {dono?.email}
              </p>
            </div>
            <span className="shrink-0 font-cond text-xs uppercase tracking-[0.06em] text-muted-3">
              {t.dono}
            </span>
          </li>

          {ativos.map((c) => {
            const p = c.usuarioId ? perfilPorId.get(c.usuarioId) : undefined;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {p?.nome ?? c.email ?? "—"}
                    {c.usuarioId === usuario.id && (
                      <span className="ml-2 text-xs font-normal text-brand">
                        ({t.voce})
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p?.email ?? c.email}
                  </p>
                </div>
                {ehDono && (
                  <form action={revogarColaborador.bind(null, id, c.id)}>
                    <AcaoTexto className="text-xs text-destructive hover:underline">
                      {t.remover}
                    </AcaoTexto>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* CONVIDAR + PENDENTES (só o dono) */}
      {ehDono ? (
        <>
          <section>
            <h2 className="text-lg font-bold">{t.convidar}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t.convidarDesc}</p>
            <form
              action={convidarColaborador.bind(null, id)}
              className="mt-4 flex flex-col gap-3 sm:flex-row"
            >
              <Input
                name="email"
                type="email"
                placeholder={t.emailOpcional}
                className="sm:flex-1"
              />
              <BotaoAcao>{t.gerarConvite}</BotaoAcao>
            </form>
          </section>

          {pendentes.length > 0 && (
            <section>
              <h2 className="mb-3 font-cond text-sm font-semibold uppercase tracking-[0.08em] text-muted-2">
                {t.convitesPendentes}
              </h2>
              <ul className="space-y-3">
                {pendentes.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border bg-card p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <span className="truncate text-sm font-medium">
                        {c.email ?? t.semEmail}
                        <span className="ml-2 text-xs font-normal text-warning-foreground">
                          {t.pendente}
                        </span>
                      </span>
                      <form action={revogarColaborador.bind(null, id, c.id)}>
                        <AcaoTexto className="shrink-0 text-xs text-destructive hover:underline">
                          {t.remover}
                        </AcaoTexto>
                      </form>
                    </div>
                    <ConviteLink path={`/organizador/convite/${c.token}`} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-white/12 px-5 py-4 text-sm text-muted-foreground">
          {t.soDonoGerencia}
        </p>
      )}
    </div>
  );
}

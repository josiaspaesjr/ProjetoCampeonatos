import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { eventoColaboradores, eventos } from "@/db/schema";
import { BotaoAcao } from "@/components/ui/botao-acao";
import { getUsuarioSessao } from "@/lib/auth";
import { getDicionario } from "@/lib/i18n/server";
import { aceitarConvite } from "./actions";

function Casca({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-xl border bg-card p-8 text-center">{children}</div>
    </div>
  );
}

export default async function PaginaConvite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = await getDb();
  const dc = (await getDicionario()).admin.convite;

  const convite = await db.query.eventoColaboradores.findFirst({
    where: eq(eventoColaboradores.token, token),
  });
  const evento = convite
    ? await db.query.eventos.findFirst({
        where: eq(eventos.id, convite.eventoId),
        columns: { id: true, nome: true, organizadorId: true },
      })
    : null;
  const usuario = await getUsuarioSessao();

  if (!convite || !evento) {
    return (
      <Casca>
        <p className="text-sm text-muted-foreground">{dc.invalido}</p>
      </Casca>
    );
  }

  const jaMembro =
    evento.organizadorId === usuario?.id ||
    (convite.status === "ativo" && convite.usuarioId === usuario?.id);
  const usadoPorOutro =
    convite.status === "ativo" &&
    !!convite.usuarioId &&
    convite.usuarioId !== usuario?.id;

  return (
    <Casca>
      <div className="mb-2 font-cond text-[13px] font-semibold uppercase tracking-[0.14em] text-brand">
        {dc.eyebrow}
      </div>
      <h1 className="disp text-[40px] leading-none">{dc.titulo}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {dc.descPre}{" "}
        <span className="font-semibold text-foreground">{evento.nome}</span>.
      </p>

      <div className="mt-7">
        {!usuario ? (
          <Link
            href={`/entrar?next=${encodeURIComponent(`/organizador/convite/${token}`)}`}
            className="inline-flex -skew-x-9 items-center bg-brand px-6 py-3 font-cond text-base font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
          >
            <span className="inline-block skew-x-9">{dc.entrar}</span>
          </Link>
        ) : usadoPorOutro ? (
          <p className="text-sm text-muted-foreground">{dc.jaUsado}</p>
        ) : jaMembro ? (
          <Link
            href={`/organizador/eventos/${evento.id}`}
            className="inline-flex -skew-x-9 items-center bg-brand px-6 py-3 font-cond text-base font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
          >
            <span className="inline-block skew-x-9">{dc.verEvento}</span>
          </Link>
        ) : (
          <form action={aceitarConvite.bind(null, token)}>
            <BotaoAcao className="w-full justify-center">{dc.aceitar}</BotaoAcao>
          </form>
        )}
      </div>
    </Casca>
  );
}

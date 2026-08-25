import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chaves } from "@/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { montarFilaDaArea, tempoDeLutaSegundos } from "@/lib/cronograma/fila";
import { hora, rotuloCat } from "@/lib/cronograma/telao-format";
import { BotaoTelaCheia } from "@/components/telao/botao-tela-cheia";
import { PlacarTablet } from "./placar-tablet";
import {
  SeletorProximaLuta,
  type OpcaoLuta,
} from "./seletor-proxima-luta";

export default async function PaginaPlacar({
  params,
}: {
  params: Promise<{ id: string; areaId: string }>;
}) {
  const { id, areaId } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const dic = await getDicionario();
  const p = dic.admin.placar;

  const evento = await eventoGerenciavel(db, id, usuario.id);
  if (!evento) notFound();

  const fila = await montarFilaDaArea(db, areaId);
  if (!fila) notFound();

  const proxima = fila.fila.find((f) => f.pronta);

  // fila pendente da área para o seletor "escolher luta" (busca por atleta,
  // academia ou categoria). `atual` marca a que está no tatame agora.
  const nomeAtleta = (id: string | null) =>
    id ? (fila.atletas[id]?.nome ?? "?") : p.escolherAguardando;
  const academiaAtleta = (id: string | null) =>
    id ? (fila.atletas[id]?.academia ?? null) : null;
  const opcoes: OpcaoLuta[] = fila.fila.map((f) => ({
    lutaId: f.luta.id,
    categoria: rotuloCat(f.categoria.nome),
    categoriaCompleta: f.categoria.nome,
    hora: hora(f.horaEstimada),
    atleta1: nomeAtleta(f.luta.atleta1InscricaoId),
    atleta2: nomeAtleta(f.luta.atleta2InscricaoId),
    academia1: academiaAtleta(f.luta.atleta1InscricaoId),
    academia2: academiaAtleta(f.luta.atleta2InscricaoId),
    pronta: f.pronta,
    atual: f.luta.id === proxima?.luta.id,
  }));

  if (!proxima) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-2xl font-bold">
          {p.nenhumLutaProntaEm} {fila.area.nome}
        </p>
        <p className="mt-2 text-muted-foreground">{p.filaVazia}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/organizador/eventos/${id}/areas`}
            className={buttonVariants()}
          >
            {p.voltarAsAreas}
          </Link>
          {opcoes.length > 0 && (
            <SeletorProximaLuta eventoId={id} areaId={areaId} opcoes={opcoes} />
          )}
        </div>
      </div>
    );
  }

  const chave = await db.query.chaves.findFirst({
    where: eq(chaves.categoriaId, proxima.categoria.id),
  });
  const a1 = proxima.luta.atleta1InscricaoId!;
  const a2 = proxima.luta.atleta2InscricaoId!;

  return (
    <div id="placar-operador">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/organizador/eventos/${id}/areas`} className="text-sm text-muted-foreground hover:underline">
          ← {dic.admin.nav.areas}
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            {fila.area.nome} · {fila.fila.length}{" "}
            {fila.fila.length === 1 ? dic.lutasTab.luta : dic.lutasTab.lutas}{" "}
            {p.naFila}
          </p>
          <SeletorProximaLuta eventoId={id} areaId={areaId} opcoes={opcoes} />
          <BotaoTelaCheia alvoId="placar-operador" variante="inline" />
        </div>
      </div>

      <PlacarTablet
        key={proxima.luta.id}
        eventoId={id}
        chaveId={chave!.id}
        lutaId={proxima.luta.id}
        categoriaNome={proxima.categoria.nome}
        duracaoSegundos={tempoDeLutaSegundos(proxima.categoria.faixa)}
        atleta1={{ id: a1, ...fila.atletas[a1] }}
        atleta2={{ id: a2, ...fila.atletas[a2] }}
        placarInicial={{
          l1: {
            pontos: proxima.luta.pontos1,
            vantagens: proxima.luta.vantagens1,
            punicoes: proxima.luta.punicoes1,
          },
          l2: {
            pontos: proxima.luta.pontos2,
            vantagens: proxima.luta.vantagens2,
            punicoes: proxima.luta.punicoes2,
          },
        }}
        cronometroInicial={{
          restanteSeg: proxima.luta.cronometroRestanteSeg,
          rodando: proxima.luta.cronometroRodando,
          atualizadoEmMs: proxima.luta.cronometroAtualizadoEm?.getTime() ?? null,
        }}
      />
    </div>
  );
}

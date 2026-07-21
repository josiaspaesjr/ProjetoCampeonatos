import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, chaves, inscricoes, lutas } from "@/db/schema";
import { BotaoAcao } from "@/components/ui/botao-acao";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { ordenarCategoriasExibicao } from "@/lib/categorias/distribuicao-areas";
import { GerarLoteDialog } from "@/components/chaves/gerar-lote-dialog";
import {
  BotaoImprimirChaves,
  type AtletaImpressao,
  type ChaveImpressao,
} from "@/components/chaves/botao-imprimir-chaves";
import { gerarChavesEmLote, publicarChaves } from "../../actions";
import { PainelChaves, type LinhaChave } from "./painel-chaves";

export default async function PaginaChaves({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const dic = await getDicionario();
  const ch = dic.admin.chaves;

  const evento = await eventoGerenciavel(db, id, usuario.id);
  if (!evento) notFound();

  const [cats, confirmadas] = await Promise.all([
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, id),
      orderBy: asc(categorias.nome),
    }),
    db.query.inscricoes.findMany({
      where: and(eq(inscricoes.eventoId, id), eq(inscricoes.status, "confirmada")),
    }),
  ]);
  const todasChaves = cats.length
    ? await db.query.chaves.findMany({
        where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
      })
    : [];
  const chavePorCategoria = new Map(todasChaves.map((c) => [c.categoriaId, c]));

  const contagem = new Map<string, number>();
  // atletas confirmados por categoria — alimentam a busca por nome de atleta
  const atletasPorCategoria = new Map<string, string[]>();
  for (const i of confirmadas) {
    contagem.set(i.categoriaId, (contagem.get(i.categoriaId) ?? 0) + 1);
    const arr = atletasPorCategoria.get(i.categoriaId) ?? [];
    if (i.nomeAtleta) arr.push(i.nomeAtleta);
    if (i.academiaNome) arr.push(i.academiaNome);
    atletasPorCategoria.set(i.categoriaId, arr);
  }

  // ordem canônica de exibição (classe → sexo F→M → faixa → peso)
  const comInscritos = ordenarCategoriasExibicao(
    cats.filter((c) => (contagem.get(c.id) ?? 0) > 0),
  );

  // linhas serializadas para o painel client (filtros + busca instantâneos)
  const linhas: LinhaChave[] = comInscritos.map((c) => {
    const chave = chavePorCategoria.get(c.id) ?? null;
    const qtd = contagem.get(c.id) ?? 0;
    return {
      id: c.id,
      nome: c.nome,
      classeIdade: c.classeIdade,
      faixa: c.faixa,
      sexo: c.sexo,
      qtd,
      statusKey: chave ? chave.status : "sem_chave",
      chave: chave
        ? {
            id: chave.id,
            status: chave.status,
            formato: chave.formato,
            medalhasEntregues: !!chave.medalhasEntreguesEm,
          }
        : null,
      busca: [c.nome, ...(atletasPorCategoria.get(c.id) ?? [])].join(" "),
    };
  });
  // dados p/ imprimir TODAS as chaves geradas (uma por página, bracket visual),
  // na mesma ordem de exibição da lista
  const lutasRows = todasChaves.length
    ? await db.query.lutas.findMany({
        where: inArray(
          lutas.chaveId,
          todasChaves.map((c) => c.id),
        ),
      })
    : [];
  const lutasPorChave = new Map<string, typeof lutasRows>();
  for (const l of lutasRows) {
    const arr = lutasPorChave.get(l.chaveId);
    if (arr) arr.push(l);
    else lutasPorChave.set(l.chaveId, [l]);
  }
  const atletasImpressao: Record<string, AtletaImpressao> = Object.fromEntries(
    confirmadas.map((i) => [i.id, { nome: i.nomeAtleta, academia: i.academiaNome }]),
  );
  const chavesImpressao: ChaveImpressao[] = comInscritos.flatMap((c) => {
    const chave = chavePorCategoria.get(c.id);
    if (!chave) return [];
    return [
      {
        id: chave.id,
        categoriaNome: c.nome,
        faixa: c.faixa,
        formato: chave.formato,
        lutas: (lutasPorChave.get(chave.id) ?? []).map((l) => ({
          id: l.id,
          rodada: l.rodada,
          posicao: l.posicao,
          fase: l.fase,
          atleta1InscricaoId: l.atleta1InscricaoId,
          atleta2InscricaoId: l.atleta2InscricaoId,
          vencedorInscricaoId: l.vencedorInscricaoId,
          proximaLutaId: l.proximaLutaId,
          proximaLutaSlot: l.proximaLutaSlot,
          proximaLutaPerdedorId: l.proximaLutaPerdedorId,
          proximaLutaPerdedorSlot: l.proximaLutaPerdedorSlot,
          metodo: l.metodo,
          nomeFinalizacao: l.nomeFinalizacao,
        })),
      },
    ];
  });

  const rascunhos = todasChaves.filter((c) => c.status === "rascunho").length;
  // 1 atleta já é elegível (vira campeão por W.O.)
  const pendentes = comInscritos.filter(
    (c) => (contagem.get(c.id) ?? 0) >= 1 && !chavePorCategoria.has(c.id),
  );
  const semChave = pendentes.length;

  return (
    <div>
      {erro && (
        <p className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[560px] text-sm text-muted-foreground">{ch.intro}</p>
        <div className="flex items-center gap-3">
          {chavesImpressao.length > 0 && (
            <BotaoImprimirChaves
              chaves={chavesImpressao}
              atletas={atletasImpressao}
              eventoNome={evento.nome}
            />
          )}
          {semChave > 0 && (
            <GerarLoteDialog
              acao={gerarChavesEmLote.bind(null, evento.id)}
              total={semChave}
            />
          )}
          {rascunhos > 0 && (
            <form action={publicarChaves.bind(null, evento.id)}>
              <BotaoAcao variant="success">
                {ch.publicar} {rascunhos}{" "}
                {rascunhos === 1 ? ch.chaveSing : ch.chavePlur}
              </BotaoAcao>
            </form>
          )}
        </div>
      </div>

      <PainelChaves eventoId={evento.id} linhas={linhas} />
    </div>
  );
}

"use server";

import { and, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  categorias,
  eventos,
  inscricoes,
  lotes,
  pagamentoInscricoes,
  pagamentos,
} from "@/db/schema";
import { getAtletaAtual } from "@/lib/sessao";
import { cobrancaQueCobre } from "@/lib/pagamentos/agrupar";
import { criarCobrancaPixParaInscricoes } from "@/lib/pagamentos/cobranca";
import { dentroDoPrazoDePagamento } from "@/lib/pagamentos/prazo";

/**
 * Gera (ou retoma) uma única cobrança Pix com TODAS as inscrições pendentes do
 * atleta num campeonato — usado pelo "pagar agora" de Minhas inscrições e pelo
 * "gerar novo Pix" do checkout quando a cobrança expirou.
 *
 * É por campeonato, não por inscrição: quem se inscreve na categoria de peso e
 * no absoluto deve um valor só, num Pix só. Só funciona dentro do prazo de
 * pagamento do campeonato (último dia de inscrição).
 */
export async function gerarCobrancaEvento(eventoId: string) {
  const atleta = await getAtletaAtual();
  if (!atleta) {
    redirect(`/entrar?next=${encodeURIComponent("/minhas-inscricoes")}`);
  }

  const db = await getDb();
  const pendentes = await db.query.inscricoes.findMany({
    where: and(
      eq(inscricoes.usuarioId, atleta.id),
      eq(inscricoes.eventoId, eventoId),
      eq(inscricoes.status, "pendente_pagamento"),
    ),
  });
  // nada a pagar (já confirmadas, canceladas ou evento errado)
  if (pendentes.length === 0) redirect("/minhas-inscricoes");

  const [evento, lotesEvento] = await Promise.all([
    db.query.eventos.findFirst({ where: eq(eventos.id, eventoId) }),
    db.query.lotes.findMany({ where: eq(lotes.eventoId, eventoId) }),
  ]);
  if (!evento) notFound();

  if (!dentroDoPrazoDePagamento(evento, lotesEvento)) {
    throw new Error("O prazo de pagamento deste campeonato já encerrou.");
  }

  // uma cobrança ainda viva que cubra exatamente essas inscrições é retomada
  // em vez de duplicada
  const agora = new Date();
  const vinculos = await db.query.pagamentoInscricoes.findMany({
    where: inArray(
      pagamentoInscricoes.inscricaoId,
      pendentes.map((i) => i.id),
    ),
  });
  if (vinculos.length) {
    const pags = await db.query.pagamentos.findMany({
      where: inArray(pagamentos.id, [
        ...new Set(vinculos.map((v) => v.pagamentoId)),
      ]),
    });
    const vivas = pags
      .filter((p) => p.status === "criado" && p.expiraEm && p.expiraEm > agora)
      .map((p) => ({
        id: p.id,
        inscricaoIds: vinculos
          .filter((v) => v.pagamentoId === p.id)
          .map((v) => v.inscricaoId),
      }));
    const reaproveitar = cobrancaQueCobre(
      vivas,
      pendentes.map((i) => i.id),
    );
    if (reaproveitar) redirect(`/checkout/${reaproveitar}`);
  }

  const cats = await db.query.categorias.findMany({
    where: inArray(
      categorias.id,
      pendentes.map((i) => i.categoriaId),
    ),
  });
  const nomeCategoria = new Map(cats.map((c) => [c.id, c.nome]));

  // preço travado na inscrição; sem ele não dá para cobrar
  const semPreco = pendentes.find((i) => i.precoCentavos == null);
  if (semPreco) {
    throw new Error("Inscrição sem preço definido — refaça a inscrição.");
  }

  const pagamentoId = await criarCobrancaPixParaInscricoes(db, {
    eventoId: evento.id,
    usuarioId: atleta.id,
    moeda: evento.moeda,
    emailPagador: atleta.email,
    nomePagador: pendentes[0].nomeAtleta,
    itens: pendentes.map((i) => ({
      inscricaoId: i.id,
      descricao: `${evento.nome} — ${nomeCategoria.get(i.categoriaId) ?? "Inscrição"}`,
      valorCentavos: i.precoCentavos!,
    })),
  });

  redirect(`/checkout/${pagamentoId}`);
}

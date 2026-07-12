"use server";

import { desc, eq, inArray } from "drizzle-orm";
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
import { criarCobrancaPixParaInscricoes } from "@/lib/pagamentos/cobranca";
import { dentroDoPrazoDePagamento } from "@/lib/pagamentos/prazo";

/**
 * Gera (ou retoma) a cobrança Pix de uma inscrição pendente do atleta logado —
 * usado pelo "pagar agora" de Minhas inscrições e pelo "gerar novo Pix" do
 * checkout quando a cobrança expirou. Só funciona dentro do prazo de pagamento
 * do campeonato (último dia de inscrição).
 */
export async function gerarCobrancaInscricao(inscricaoId: string) {
  const atleta = await getAtletaAtual();
  if (!atleta) {
    redirect(`/entrar?next=${encodeURIComponent("/minhas-inscricoes")}`);
  }

  const db = await getDb();
  const inscricao = await db.query.inscricoes.findFirst({
    where: eq(inscricoes.id, inscricaoId),
  });
  if (!inscricao || inscricao.usuarioId !== atleta.id) notFound();

  // nada a pagar
  if (inscricao.status === "confirmada") redirect("/minhas-inscricoes");
  if (inscricao.status !== "pendente_pagamento") {
    throw new Error("Esta inscrição não está aguardando pagamento.");
  }

  const [evento, lotesEvento] = await Promise.all([
    db.query.eventos.findFirst({ where: eq(eventos.id, inscricao.eventoId) }),
    db.query.lotes.findMany({ where: eq(lotes.eventoId, inscricao.eventoId) }),
  ]);
  if (!evento) notFound();

  if (!dentroDoPrazoDePagamento(evento, lotesEvento)) {
    throw new Error("O prazo de pagamento deste campeonato já encerrou.");
  }

  // reaproveita uma cobrança ainda viva; senão, herda o valor da última
  const vinculos = await db.query.pagamentoInscricoes.findMany({
    where: eq(pagamentoInscricoes.inscricaoId, inscricaoId),
  });
  const agora = new Date();
  let ultimoValor: number | null = null;
  if (vinculos.length) {
    const pags = await db.query.pagamentos.findMany({
      where: inArray(
        pagamentos.id,
        vinculos.map((v) => v.pagamentoId),
      ),
      orderBy: desc(pagamentos.criadoEm),
    });
    const viva = pags.find(
      (p) => p.status === "criado" && p.expiraEm && p.expiraEm > agora,
    );
    if (viva) redirect(`/checkout/${viva.id}`);
    ultimoValor = pags[0]?.valorBrutoCentavos ?? null;
  }

  const valorCentavos = inscricao.precoCentavos ?? ultimoValor;
  if (valorCentavos == null) {
    throw new Error("Inscrição sem preço definido — refaça a inscrição.");
  }

  const categoria = await db.query.categorias.findFirst({
    where: eq(categorias.id, inscricao.categoriaId),
  });

  const pagamentoId = await criarCobrancaPixParaInscricoes(db, {
    eventoId: evento.id,
    usuarioId: atleta.id,
    moeda: evento.moeda,
    emailPagador: atleta.email,
    nomePagador: inscricao.nomeAtleta,
    itens: [
      {
        inscricaoId: inscricao.id,
        descricao: `${evento.nome} — ${categoria?.nome ?? "Inscrição"}`,
        valorCentavos,
      },
    ],
  });

  redirect(`/checkout/${pagamentoId}`);
}

"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  academias,
  categorias,
  eventos,
  inscricoes,
  lotes,
  pagamentoInscricoes,
  pagamentos,
  usuarios,
} from "@/db/schema";
import type { Faixa } from "@/lib/categorias/cbjj";
import {
  categoriaCompativel,
  idadeNoAnoDoEvento,
} from "@/lib/categorias/elegibilidade";
import { getGateway } from "@/lib/pagamentos";
import { precoInscricaoCentavos } from "@/lib/lotes/preco";
import { getUsuarioSessao } from "@/lib/auth";
import { definirSessaoAtleta } from "@/lib/sessao";
import { supabaseConfigurado } from "@/lib/supabase/server";

export async function criarInscricao(eventoSlug: string, formData: FormData) {
  const db = await getDb();
  const agora = new Date();

  const evento = await db.query.eventos.findFirst({
    where: eq(eventos.slug, eventoSlug),
  });
  if (!evento || evento.status !== "publicado") {
    throw new Error("Evento não está com inscrições abertas");
  }
  if (evento.inscricoesFecham && agora > evento.inscricoesFecham) {
    throw new Error("As inscrições deste evento já fecharam");
  }

  const todosLotes = await db.query.lotes.findMany({
    where: eq(lotes.eventoId, evento.id),
  });
  const lote = todosLotes.find((l) => l.inicio <= agora && agora <= l.fim);
  if (!lote) throw new Error("Nenhum lote de inscrição vigente");

  // --- dados do atleta ---------------------------------------------------
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const dataNascimento = String(formData.get("dataNascimento") ?? "");
  const sexo = String(formData.get("sexo") ?? "") as "masculino" | "feminino";
  const faixa = String(formData.get("faixa") ?? "") as Faixa;
  const academiaId = String(formData.get("academiaId") ?? "").trim() || null;
  const categoriaId = String(formData.get("categoriaId") ?? "");

  if (!nome || !email || !dataNascimento || !sexo || !faixa || !categoriaId) {
    throw new Error("Preencha todos os campos obrigatórios");
  }

  // academia: precisa existir no catálogo — o formulário só envia um id
  // válido (não há cadastro manual). Guardamos o nome como snapshot.
  let academiaNome: string | null = null;
  if (academiaId) {
    const academia = await db.query.academias.findFirst({
      where: eq(academias.id, academiaId),
      columns: { nome: true },
    });
    if (!academia) throw new Error("Academia inválida — selecione uma da lista");
    academiaNome = academia.nome;
  }

  const dadosPerfil = {
    nome,
    dataNascimento,
    sexo,
    faixaAtual: faixa,
    academiaId,
  };

  let usuario;
  if (supabaseConfigurado()) {
    // login obrigatório: a inscrição pertence à conta autenticada
    const sessao = await getUsuarioSessao();
    if (!sessao) {
      redirect(`/entrar?next=${encodeURIComponent(`/evento/${eventoSlug}/inscricao`)}`);
    }
    [usuario] = await db
      .update(usuarios)
      .set(dadosPerfil)
      .where(eq(usuarios.id, sessao.id))
      .returning();
  } else {
    // dev sem Supabase: reutiliza por e-mail ou cria, sessão via cookie
    const usuarioExistente = await db.query.usuarios.findFirst({
      where: eq(usuarios.email, email),
    });
    usuario = usuarioExistente
      ? (
          await db
            .update(usuarios)
            .set(dadosPerfil)
            .where(eq(usuarios.id, usuarioExistente.id))
            .returning()
        )[0]
      : (await db.insert(usuarios).values({ ...dadosPerfil, email }).returning())[0];
    await definirSessaoAtleta(usuario.id);
  }

  // --- validação da categoria --------------------------------------------
  const categoria = await db.query.categorias.findFirst({
    where: and(eq(categorias.id, categoriaId), eq(categorias.eventoId, evento.id)),
  });
  if (!categoria || categoria.status !== "aberta") {
    throw new Error("Categoria inválida ou fechada");
  }
  const idade = idadeNoAnoDoEvento(dataNascimento, evento.dataInicio);
  if (!categoriaCompativel(categoria, { sexo, faixa, idade })) {
    throw new Error("Você não é elegível para esta categoria (idade, sexo ou faixa)");
  }

  const minhasInscricoes = await db.query.inscricoes.findMany({
    where: and(
      eq(inscricoes.usuarioId, usuario.id),
      eq(inscricoes.eventoId, evento.id),
      inArray(inscricoes.status, ["pendente_pagamento", "confirmada"]),
    ),
  });
  if (minhasInscricoes.some((i) => i.categoriaId === categoriaId)) {
    throw new Error("Você já tem inscrição nesta categoria");
  }

  // --- preço: categoria com preço próprio (entry) > grupo de preço da
  // categoria no lote > desconto de 2ª inscrição > preço base do lote -------
  const ehSegundaInscricao = minhasInscricoes.length > 0;
  const valorCentavos = precoInscricaoCentavos({
    categoriaPrecoCentavos: categoria.precoCentavos,
    grupoPreco: categoria.grupoPreco,
    loteVariacoes: lote.variacoes,
    lotePrecoCentavos: lote.precoCentavos,
    lotePrecoSegundaCentavos: lote.precoSegundaInscricaoCentavos,
    ehSegundaInscricao,
  });

  // --- inscrição + cobrança ----------------------------------------------
  const [inscricao] = await db
    .insert(inscricoes)
    .values({
      usuarioId: usuario.id,
      eventoId: evento.id,
      categoriaId,
      nomeAtleta: nome,
      faixa,
      dataNascimento,
      academiaId,
      academiaNome: academiaNome || null,
    })
    .returning();

  const gateway = getGateway(evento.moeda);
  const cobranca = await gateway.criarCobrancaPix!({
    eventoId: evento.id,
    usuarioId: usuario.id,
    emailPagador: email,
    nomePagador: nome,
    moeda: evento.moeda,
    itens: [
      {
        inscricaoId: inscricao.id,
        descricao: `${evento.nome} — ${categoria.nome}`,
        valorCentavos,
      },
    ],
    descontoCentavos: 0,
    taxaPlataformaCentavos: 0, // monetização: decisão em aberto (spec §7)
  });

  const [pagamento] = await db
    .insert(pagamentos)
    .values({
      eventoId: evento.id,
      usuarioId: usuario.id,
      gateway: gateway.id,
      gatewayCobrancaId: cobranca.idExterno,
      metodo: "pix",
      valorBrutoCentavos: valorCentavos,
      valorLiquidoOrganizadorCentavos: valorCentavos,
      expiraEm: cobranca.expiraEm,
    })
    .returning();

  await db.insert(pagamentoInscricoes).values({
    pagamentoId: pagamento.id,
    inscricaoId: inscricao.id,
  });

  redirect(`/checkout/${pagamento.id}`);
}

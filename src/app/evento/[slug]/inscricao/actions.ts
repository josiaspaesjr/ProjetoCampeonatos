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
  usuarios,
} from "@/db/schema";
import type { Faixa } from "@/lib/categorias/cbjj";
import {
  categoriaCompativel,
  idadeNoAnoDoEvento,
} from "@/lib/categorias/elegibilidade";
import { criarCobrancaPixParaInscricoes } from "@/lib/pagamentos/cobranca";
import { normalizarPais } from "@/lib/paises";
import { soDigitos, validarCpf } from "@/lib/cpf";
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
  const pais = normalizarPais(String(formData.get("pais") ?? ""));
  const cpf = soDigitos(String(formData.get("cpf") ?? "")) || null;
  const enderecoCep = soDigitos(String(formData.get("cep") ?? "")) || null;
  const enderecoLogradouro = String(formData.get("logradouro") ?? "").trim() || null;
  const enderecoNumero = String(formData.get("numero") ?? "").trim() || null;
  const enderecoComplemento = String(formData.get("complemento") ?? "").trim() || null;
  const enderecoBairro = String(formData.get("bairro") ?? "").trim() || null;
  const enderecoCidade = String(formData.get("cidade") ?? "").trim() || null;
  const enderecoUf = String(formData.get("uf") ?? "").trim().toUpperCase() || null;
  const categoriaId = String(formData.get("categoriaId") ?? "");

  if (!nome || !email || !dataNascimento || !sexo || !faixa || !categoriaId) {
    throw new Error("Preencha todos os campos obrigatórios");
  }
  // endereço obrigatório (complemento é opcional)
  if (
    !enderecoCep ||
    !enderecoLogradouro ||
    !enderecoNumero ||
    !enderecoBairro ||
    !enderecoCidade ||
    !enderecoUf
  ) {
    throw new Error("Preencha o endereço completo");
  }
  // CPF obrigatório e válido para atletas do Brasil (documento nacional)
  const ehBrasil = pais === "BR";
  if (ehBrasil && (!cpf || !validarCpf(cpf))) {
    throw new Error("Informe um CPF válido");
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
    cpf: ehBrasil ? cpf : null,
    enderecoCep,
    enderecoLogradouro,
    enderecoNumero,
    enderecoComplemento,
    enderecoBairro,
    enderecoCidade,
    enderecoUf,
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

  // --- preço: categoria com preço próprio (entry) > desconto de 2ª inscrição
  // (garantido quando habilitado) > grupo de preço da categoria > base ------
  const ehSegundaInscricao = minhasInscricoes.length > 0;
  const valorCentavos = precoInscricaoCentavos({
    categoriaPrecoCentavos: categoria.precoCentavos,
    grupoPreco: categoria.grupoPreco,
    loteVariacoes: lote.variacoes,
    lotePrecoCentavos: lote.precoCentavos,
    lotePrecoSegundaCentavos: lote.precoSegundaInscricaoCentavos,
    ehSegundaInscricao,
  });

  // --- inscrição ----------------------------------------------------------
  // preço travado na inscrição: pagando agora ou depois, cobra-se este valor
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
      pais,
      precoCentavos: valorCentavos,
    })
    .returning();

  // "pagar depois": a inscrição fica pendente e o atleta gera o Pix quando
  // quiser em Minhas inscrições (dentro do prazo do campeonato).
  const pagarDepois = String(formData.get("intent") ?? "") === "pagar_depois";
  if (pagarDepois) {
    redirect("/minhas-inscricoes");
  }

  // "pagar agora": gera a cobrança Pix e leva ao checkout
  const pagamentoId = await criarCobrancaPixParaInscricoes(db, {
    eventoId: evento.id,
    usuarioId: usuario.id,
    moeda: evento.moeda,
    emailPagador: email,
    nomePagador: nome,
    itens: [
      {
        inscricaoId: inscricao.id,
        descricao: `${evento.nome} — ${categoria.nome}`,
        valorCentavos,
      },
    ],
  });

  redirect(`/checkout/${pagamentoId}`);
}

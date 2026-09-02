"use server";

import { and, eq, inArray, or } from "drizzle-orm";
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

type Categoria = typeof categorias.$inferSelect;
import {
  categoriaCompativel,
  idadeNoAnoDoEvento,
} from "@/lib/categorias/elegibilidade";
import { criarCobrancaPixParaInscricoes } from "@/lib/pagamentos/cobranca";
import { normalizarPais } from "@/lib/paises";
import { soDigitos, validarCpf } from "@/lib/cpf";
import { montarPedido } from "@/lib/inscricoes/pedido";
import { getUsuarioSessao } from "@/lib/auth";
import { definirCadastroPendente, definirSessaoAtleta } from "@/lib/sessao";
import { supabaseConfigurado } from "@/lib/supabase/server";

/**
 * O CPF já tem conta na plataforma?
 *
 * Chamada pelo formulário assim que o CPF fica válido: existindo conta, a tela
 * pede login antes de continuar, em vez de deixar a pessoa preencher tudo para
 * descobrir no fim. Devolve só um booleano — nada de nome ou e-mail —, e só
 * responde a CPF bem formado.
 *
 * Ressalva: é um endpoint público que confirma se um CPF está cadastrado, o
 * mesmo tipo de exposição que "e-mail já cadastrado" em qualquer signup. Se
 * virar problema, o caminho é limitar taxa por IP.
 */
export async function cpfJaTemConta(cpfBruto: string): Promise<boolean> {
  const cpf = soDigitos(cpfBruto);
  if (!validarCpf(cpf)) return false;
  const db = await getDb();
  const dono = await db.query.usuarios.findFirst({
    where: eq(usuarios.cpf, cpf),
    columns: { id: true, authId: true },
  });
  // só conta com login de verdade bloqueia: linha sem authId é de alguém que
  // se inscreveu e ainda não escolheu senha — essa pessoa segue o fluxo
  return !!dono?.authId;
}

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
  // absoluto é opcional e vai como inscrição própria, cobrada como 2ª
  const absolutoId = String(formData.get("absolutoId") ?? "");

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
  // sem sessão, a conta nasce aqui e a senha é escolhida logo depois — quem
  // preencheu a inscrição inteira não é mandado para o login de mãos vazias
  let precisaCriarSenha = false;
  if (supabaseConfigurado()) {
    const sessao = await getUsuarioSessao();
    if (sessao) {
      [usuario] = await db
        .update(usuarios)
        .set(dadosPerfil)
        .where(eq(usuarios.id, sessao.id))
        .returning();
    } else {
      // CPF ou e-mail de conta já registrada: aí sim é caso de entrar antes,
      // senão a inscrição iria parar na conta de outra pessoa
      const existente = await db.query.usuarios.findFirst({
        where: cpf ? or(eq(usuarios.cpf, cpf), eq(usuarios.email, email)) : eq(usuarios.email, email),
      });
      if (existente?.authId) {
        throw new Error(
          "Você já tem conta na plataforma. Entre antes de se inscrever.",
        );
      }
      // reaproveita a linha sem login (inscrição anterior que não virou conta)
      usuario = existente
        ? (
            await db
              .update(usuarios)
              .set(dadosPerfil)
              .where(eq(usuarios.id, existente.id))
              .returning()
          )[0]
        : (
            await db
              .insert(usuarios)
              .values({ ...dadosPerfil, email })
              .returning()
          )[0];
      await definirCadastroPendente(usuario.id);
      precisaCriarSenha = true;
    }
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

  // --- absoluto (opcional) ------------------------------------------------
  // O atleta pede o absoluto na pergunta antes das categorias; ele vira uma
  // inscrição própria e, por já haver a de peso, sempre entra como 2ª.
  let absoluto: Categoria | null = null;
  if (absolutoId && absolutoId !== categoriaId) {
    absoluto =
      (await db.query.categorias.findFirst({
        where: and(eq(categorias.id, absolutoId), eq(categorias.eventoId, evento.id)),
      })) ?? null;
    if (!absoluto || absoluto.status !== "aberta") {
      throw new Error("Absoluto inválido ou fechado");
    }
    if (absoluto.tipo !== "absoluto") {
      throw new Error("A categoria adicional precisa ser um absoluto");
    }
    if (!categoriaCompativel(absoluto, { sexo, faixa, idade })) {
      throw new Error("Você não é elegível para este absoluto (idade, sexo ou faixa)");
    }
    if (minhasInscricoes.some((i) => i.categoriaId === absolutoId)) {
      throw new Error("Você já tem inscrição neste absoluto");
    }
  }

  // --- inscrições e preços -------------------------------------------------
  const aCriar = montarPedido({
    categoria,
    absoluto,
    lote,
    jaTemInscricao: minhasInscricoes.length > 0,
  });

  // preço travado na inscrição: pagando agora ou depois, cobra-se este valor
  const criadas = await db
    .insert(inscricoes)
    .values(
      aCriar.map((item) => ({
        usuarioId: usuario.id,
        eventoId: evento.id,
        categoriaId: item.categoria.id,
        nomeAtleta: nome,
        faixa,
        dataNascimento,
        academiaId,
        academiaNome: academiaNome || null,
        pais,
        precoCentavos: item.valorCentavos,
      })),
    )
    .returning();

  // "pagar depois": a inscrição fica pendente e o atleta gera o Pix quando
  // quiser em Minhas inscrições (dentro do prazo do campeonato).
  const pagarDepois = String(formData.get("intent") ?? "") === "pagar_depois";

  // Sem conta ainda: a senha vem antes de qualquer outra coisa. A inscrição já
  // está gravada, então nada se perde — e o destino segue guardado no `next`.
  if (precisaCriarSenha) {
    const destino = pagarDepois ? "/minhas-inscricoes" : null;
    if (destino) {
      redirect(`/criar-senha?next=${encodeURIComponent(destino)}`);
    }
  }

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
    itens: criadas.map((insc) => {
      const item = aCriar.find((x) => x.categoria.id === insc.categoriaId)!;
      return {
        inscricaoId: insc.id,
        descricao: `${evento.nome} — ${item.categoria.nome}`,
        valorCentavos: item.valorCentavos,
      };
    }),
  });

  if (precisaCriarSenha) {
    redirect(
      `/criar-senha?next=${encodeURIComponent(`/checkout/${pagamentoId}`)}`,
    );
  }
  redirect(`/checkout/${pagamentoId}`);
}

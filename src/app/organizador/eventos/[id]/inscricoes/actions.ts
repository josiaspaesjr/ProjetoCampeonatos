"use server";

import { and, eq, ilike, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import {
  academias,
  auditoria,
  categorias,
  chaves,
  eventos,
  inscricoes,
  usuarios,
} from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";

async function contexto(eventoId: string) {
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, eventoId), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) throw new Error("Evento não encontrado ou sem permissão");
  return { db, usuario, evento };
}

function recarregar(eventoId: string) {
  revalidatePath(`/organizador/eventos/${eventoId}/inscricoes`);
  revalidatePath(`/organizador/eventos/${eventoId}/chaves`);
}

async function garantirCategoriaSemChave(db: Awaited<ReturnType<typeof getDb>>, categoriaId: string) {
  const chave = await db.query.chaves.findFirst({
    where: eq(chaves.categoriaId, categoriaId),
  });
  if (chave && chave.status !== "rascunho") {
    throw new Error("Categoria com chave publicada — corrija a chave, não a inscrição");
  }
  // chave em rascunho fica desatualizada: o organizador regenera antes de publicar
}

export async function moverInscricao(
  eventoId: string,
  inscricaoId: string,
  formData: FormData,
) {
  const { db, usuario } = await contexto(eventoId);
  const destinoId = String(formData.get("categoriaId") ?? "");

  const [inscricao, destino] = await Promise.all([
    db.query.inscricoes.findFirst({
      where: and(eq(inscricoes.id, inscricaoId), eq(inscricoes.eventoId, eventoId)),
    }),
    db.query.categorias.findFirst({
      where: and(eq(categorias.id, destinoId), eq(categorias.eventoId, eventoId)),
    }),
  ]);
  if (!inscricao || !destino) throw new Error("Inscrição ou categoria inválida");
  if (destino.status !== "aberta") throw new Error("Categoria de destino fechada");

  await garantirCategoriaSemChave(db, inscricao.categoriaId);
  await garantirCategoriaSemChave(db, destino.id);

  await db
    .update(inscricoes)
    .set({ categoriaId: destino.id, atualizadoEm: new Date() })
    .where(eq(inscricoes.id, inscricaoId));

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "inscricao",
    entidadeId: inscricaoId,
    acao: "categoria_alterada",
    dadosAnteriores: { categoriaId: inscricao.categoriaId },
    dadosNovos: { categoriaId: destino.id },
  });
  recarregar(eventoId);
}

export async function cancelarInscricao(eventoId: string, inscricaoId: string) {
  const { db, usuario } = await contexto(eventoId);
  const inscricao = await db.query.inscricoes.findFirst({
    where: and(eq(inscricoes.id, inscricaoId), eq(inscricoes.eventoId, eventoId)),
  });
  if (!inscricao) throw new Error("Inscrição não encontrada");
  if (inscricao.status !== "pendente_pagamento") {
    throw new Error("Só inscrições pendentes podem ser canceladas — use reembolso");
  }

  await db
    .update(inscricoes)
    .set({ status: "cancelada", atualizadoEm: new Date() })
    .where(eq(inscricoes.id, inscricaoId));
  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "inscricao",
    entidadeId: inscricaoId,
    acao: "cancelada",
    dadosAnteriores: { status: inscricao.status },
  });
  recarregar(eventoId);
}

export async function reembolsarInscricao(eventoId: string, inscricaoId: string) {
  const { db, usuario } = await contexto(eventoId);
  const inscricao = await db.query.inscricoes.findFirst({
    where: and(eq(inscricoes.id, inscricaoId), eq(inscricoes.eventoId, eventoId)),
  });
  if (!inscricao) throw new Error("Inscrição não encontrada");
  if (inscricao.status !== "confirmada") {
    throw new Error("Só inscrições confirmadas podem ser reembolsadas");
  }
  await garantirCategoriaSemChave(db, inscricao.categoriaId);

  // TODO(pagamentos): acionar estorno no gateway (POST /payments/{id}/refund
  // no Asaas) — hoje marca o reembolso e o financeiro é resolvido no gateway
  await db
    .update(inscricoes)
    .set({ status: "reembolsada", atualizadoEm: new Date() })
    .where(eq(inscricoes.id, inscricaoId));
  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "inscricao",
    entidadeId: inscricaoId,
    acao: "reembolsada",
    dadosAnteriores: { status: inscricao.status },
  });
  recarregar(eventoId);
}

/** atleta que pagou por fora (dinheiro, isenção) entra direto como confirmada */
export async function inscricaoManual(eventoId: string, formData: FormData) {
  const { db, usuario, evento } = await contexto(eventoId);

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const dataNascimento = String(formData.get("dataNascimento") ?? "");
  const sexo = String(formData.get("sexo") ?? "") as "masculino" | "feminino";
  const faixa = String(formData.get("faixa") ?? "") as
    | "branca" | "azul" | "roxa" | "marrom" | "preta";
  const academiaNome = String(formData.get("academia") ?? "").trim();
  const categoriaId = String(formData.get("categoriaId") ?? "");

  if (!nome || !email || !dataNascimento || !sexo || !faixa || !categoriaId) {
    throw new Error("Preencha todos os campos da inscrição manual");
  }

  const categoria = await db.query.categorias.findFirst({
    where: and(eq(categorias.id, categoriaId), eq(categorias.eventoId, evento.id)),
  });
  if (!categoria || categoria.status !== "aberta") {
    throw new Error("Categoria inválida ou fechada");
  }

  let academiaId: string | null = null;
  if (academiaNome) {
    const existente = await db.query.academias.findFirst({
      where: ilike(academias.nome, academiaNome),
    });
    academiaId =
      existente?.id ??
      (await db.insert(academias).values({ nome: academiaNome }).returning())[0].id;
  }

  const existente = await db.query.usuarios.findFirst({
    where: eq(usuarios.email, email),
  });
  const atleta =
    existente ??
    (
      await db
        .insert(usuarios)
        .values({ nome, email, dataNascimento, sexo, faixaAtual: faixa, academiaId })
        .returning()
    )[0];

  const [inscricao] = await db
    .insert(inscricoes)
    .values({
      usuarioId: atleta.id,
      eventoId: evento.id,
      categoriaId,
      status: "confirmada",
      nomeAtleta: nome,
      faixa,
      dataNascimento,
      academiaId,
      academiaNome: academiaNome || null,
    })
    .returning();

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "inscricao",
    entidadeId: inscricao.id,
    acao: "inscricao_manual",
    dadosNovos: { categoriaId, email },
  });
  recarregar(eventoId);
}

/** move todos os inscritos ativos da origem para o destino e fecha a origem */
export async function fundirCategorias(
  eventoId: string,
  origemId: string,
  formData: FormData,
) {
  const { db, usuario } = await contexto(eventoId);
  const destinoId = String(formData.get("destinoId") ?? "");
  if (!destinoId || destinoId === origemId) {
    throw new Error("Escolha uma categoria de destino diferente da origem");
  }

  const [origem, destino] = await Promise.all([
    db.query.categorias.findFirst({
      where: and(eq(categorias.id, origemId), eq(categorias.eventoId, eventoId)),
    }),
    db.query.categorias.findFirst({
      where: and(eq(categorias.id, destinoId), eq(categorias.eventoId, eventoId)),
    }),
  ]);
  if (!origem || !destino) throw new Error("Categoria inválida");
  if (destino.status !== "aberta") throw new Error("Destino fechado");
  await garantirCategoriaSemChave(db, origemId);
  await garantirCategoriaSemChave(db, destinoId);

  const movidas = await db
    .update(inscricoes)
    .set({ categoriaId: destinoId, atualizadoEm: new Date() })
    .where(
      and(
        eq(inscricoes.categoriaId, origemId),
        inArray(inscricoes.status, ["pendente_pagamento", "confirmada"]),
      ),
    )
    .returning();

  await db
    .update(categorias)
    .set({ status: "fundida", fundidaEmId: destinoId })
    .where(eq(categorias.id, origemId));

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "categoria",
    entidadeId: origemId,
    acao: "fundida",
    dadosNovos: { destinoId, inscricoesMovidas: movidas.length },
  });
  recarregar(eventoId);
}

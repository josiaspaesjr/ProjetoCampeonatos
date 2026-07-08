"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { auditoria, categorias, chaves, eventos, inscricoes, lotes } from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import {
  gerarChaveParaCategoria,
  registrarResultadoNoBanco,
} from "@/lib/chaves/persistencia";
import type { MetodoVitoria } from "@/lib/bracket";
import {
  gerarGrade,
  type Faixa,
  type SelecaoGrade,
  type Sexo,
} from "@/lib/categorias/cbjj";

function slugify(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** validações esperadas viram banner na página do evento (visível em produção) */
function erroVisivel(eventoId: string, mensagem: string): never {
  redirect(`/organizador/eventos/${eventoId}?erro=${encodeURIComponent(mensagem)}`);
}

async function eventoDoOrganizador(eventoId: string) {
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const evento = await db.query.eventos.findFirst({
    where: and(eq(eventos.id, eventoId), eq(eventos.organizadorId, usuario.id)),
  });
  if (!evento) throw new Error("Evento não encontrado ou sem permissão");
  return { db, usuario, evento };
}

export async function criarEvento(formData: FormData) {
  const db = await getDb();
  const usuario = await getUsuarioAtual();

  const nome = String(formData.get("nome") ?? "").trim();
  const dataInicio = String(formData.get("dataInicio") ?? "");
  if (!nome || !dataInicio) throw new Error("Nome e data são obrigatórios");

  const base = slugify(nome);
  const existentes = await db.query.eventos.findMany({
    where: eq(eventos.slug, base),
  });
  const slug = existentes.length ? `${base}-${Date.now().toString(36)}` : base;

  const [evento] = await db
    .insert(eventos)
    .values({
      organizadorId: usuario.id,
      nome,
      slug,
      dataInicio,
      cidade: String(formData.get("cidade") ?? "") || null,
      uf: String(formData.get("uf") ?? "") || null,
      endereco: String(formData.get("endereco") ?? "") || null,
      descricao: String(formData.get("descricao") ?? "") || null,
      moeda: String(formData.get("moeda") ?? "BRL"),
      inscricoesFecham: formData.get("inscricoesFecham")
        ? new Date(String(formData.get("inscricoesFecham")))
        : null,
    })
    .returning();

  redirect(`/organizador/eventos/${evento.id}`);
}

export async function gerarCategoriasCbjj(eventoId: string, formData: FormData) {
  const { db } = await eventoDoOrganizador(eventoId);

  const selecao: SelecaoGrade = {
    classes: formData.getAll("classes").map(String),
    sexos: formData.getAll("sexos").map(String) as Sexo[],
    faixas: formData.getAll("faixas").map(String) as Faixa[],
    incluirAbsoluto: formData.get("incluirAbsoluto") === "on",
  };

  const grade = gerarGrade(selecao);
  if (!grade.length) {
    erroVisivel(eventoId, "Seleção não gera nenhuma categoria — marque ao menos uma classe, um sexo e uma faixa.");
  }

  // não duplica categorias com o mesmo nome já existentes no evento
  const existentes = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, eventoId),
  });
  const nomesExistentes = new Set(existentes.map((c) => c.nome));
  const novas = grade.filter((c) => !nomesExistentes.has(c.nome));

  if (novas.length) {
    await db.insert(categorias).values(
      novas.map((c) => ({
        eventoId,
        nome: c.nome,
        tipo: c.tipo,
        sexo: c.sexo,
        faixa: c.faixa,
        classeIdade: c.classeIdade,
        idadeMin: c.idadeMin,
        idadeMax: c.idadeMax,
        limitePesoKg: c.limitePesoKg?.toString() ?? null,
      })),
    );
  }

  revalidatePath(`/organizador/eventos/${eventoId}`);
}

export async function excluirCategoria(eventoId: string, categoriaId: string) {
  const { db } = await eventoDoOrganizador(eventoId);

  const inscritos = await db.query.inscricoes.findMany({
    where: eq(inscricoes.categoriaId, categoriaId),
  });
  if (inscritos.length) {
    erroVisivel(
      eventoId,
      "Categoria com inscritos não pode ser excluída — mova os atletas antes.",
    );
  }

  await db
    .delete(categorias)
    .where(and(eq(categorias.id, categoriaId), eq(categorias.eventoId, eventoId)));
  revalidatePath(`/organizador/eventos/${eventoId}`);
}

export async function criarLote(eventoId: string, formData: FormData) {
  const { db } = await eventoDoOrganizador(eventoId);

  const nome = String(formData.get("nome") ?? "").trim();
  const preco = Math.round(Number(formData.get("preco") ?? 0) * 100);
  const precoSegunda = formData.get("precoSegunda")
    ? Math.round(Number(formData.get("precoSegunda")) * 100)
    : null;
  const inicio = new Date(String(formData.get("inicio")));
  const fim = new Date(String(formData.get("fim")));

  if (!nome || !preco || isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
    erroVisivel(eventoId, "Preencha nome, preço e vigência do lote.");
  }
  if (fim <= inicio) {
    erroVisivel(eventoId, "O fim do lote precisa ser depois do início.");
  }

  await db.insert(lotes).values({
    eventoId,
    nome,
    precoCentavos: preco,
    precoSegundaInscricaoCentavos: precoSegunda,
    inicio,
    fim,
  });
  revalidatePath(`/organizador/eventos/${eventoId}`);
}

export async function excluirLote(eventoId: string, loteId: string) {
  const { db } = await eventoDoOrganizador(eventoId);
  await db
    .delete(lotes)
    .where(and(eq(lotes.id, loteId), eq(lotes.eventoId, eventoId)));
  revalidatePath(`/organizador/eventos/${eventoId}`);
}

export async function encerrarInscricoes(eventoId: string) {
  const { db, evento } = await eventoDoOrganizador(eventoId);
  if (evento.status !== "publicado") {
    erroVisivel(eventoId, "Só eventos publicados podem ter inscrições encerradas.");
  }
  await db
    .update(eventos)
    .set({ status: "inscricoes_encerradas" })
    .where(eq(eventos.id, eventoId));
  revalidatePath(`/organizador/eventos/${eventoId}`);
}

export async function gerarChave(eventoId: string, categoriaId: string) {
  const { db, usuario } = await eventoDoOrganizador(eventoId);
  let chave;
  try {
    chave = await gerarChaveParaCategoria(db, categoriaId);
  } catch (e) {
    redirect(
      `/organizador/eventos/${eventoId}/chaves?erro=${encodeURIComponent(
        e instanceof Error ? e.message : "Erro ao gerar a chave",
      )}`,
    );
  }
  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "chave",
    entidadeId: chave.id,
    acao: "chave_gerada",
    dadosNovos: { categoriaId, seed: chave.seedSorteio },
  });
  revalidatePath(`/organizador/eventos/${eventoId}/chaves`);
}

export async function publicarChaves(eventoId: string) {
  const { db, usuario } = await eventoDoOrganizador(eventoId);

  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, eventoId),
  });
  const todas = await Promise.all(
    cats.map((c) =>
      db.query.chaves.findFirst({ where: eq(chaves.categoriaId, c.id) }),
    ),
  );
  const rascunhos = todas.filter((c) => c?.status === "rascunho");
  if (!rascunhos.length) {
    redirect(
      `/organizador/eventos/${eventoId}/chaves?erro=${encodeURIComponent("Nenhuma chave em rascunho para publicar")}`,
    );
  }

  for (const chave of rascunhos) {
    await db
      .update(chaves)
      .set({ status: "publicada", publicadaEm: new Date() })
      .where(eq(chaves.id, chave!.id));
    await db.insert(auditoria).values({
      usuarioId: usuario.id,
      entidade: "chave",
      entidadeId: chave!.id,
      acao: "chave_publicada",
    });
  }
  revalidatePath(`/organizador/eventos/${eventoId}/chaves`);
}

export async function lancarResultado(
  eventoId: string,
  chaveId: string,
  formData: FormData,
) {
  const { db, usuario } = await eventoDoOrganizador(eventoId);

  const lutaId = String(formData.get("lutaId") ?? "");
  const vencedorId = String(formData.get("vencedorId") ?? "");
  const metodo = String(formData.get("metodo") ?? "pontos") as MetodoVitoria;
  const num = (campo: string) => {
    const v = formData.get(campo);
    return v ? Number(v) : undefined;
  };

  await registrarResultadoNoBanco(db, chaveId, lutaId, vencedorId, metodo, {
    pontos1: num("pontos1"),
    vantagens1: num("vantagens1"),
    punicoes1: num("punicoes1"),
    pontos2: num("pontos2"),
    vantagens2: num("vantagens2"),
    punicoes2: num("punicoes2"),
    nomeFinalizacao: String(formData.get("nomeFinalizacao") ?? "") || undefined,
  });

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "luta",
    entidadeId: lutaId,
    acao: "resultado_lancado",
    dadosNovos: { vencedorId, metodo },
  });

  revalidatePath(`/organizador/eventos/${eventoId}/chaves/${chaveId}`);
}

export async function publicarEvento(eventoId: string) {
  const { db, evento } = await eventoDoOrganizador(eventoId);
  if (evento.status !== "rascunho") erroVisivel(eventoId, "Evento já publicado");

  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, eventoId),
  });
  const lts = await db.query.lotes.findMany({
    where: eq(lotes.eventoId, eventoId),
  });
  if (!cats.length) {
    erroVisivel(
      eventoId,
      "Para publicar, gere ao menos 1 categoria (use o Gerador de grade CBJJ abaixo).",
    );
  }
  if (!lts.length) {
    erroVisivel(eventoId, "Para publicar, crie ao menos 1 lote de inscrição.");
  }

  await db
    .update(eventos)
    .set({ status: "publicado" })
    .where(eq(eventos.id, eventoId));
  revalidatePath(`/organizador/eventos/${eventoId}`);
}

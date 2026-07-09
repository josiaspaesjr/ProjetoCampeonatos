"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  areas,
  auditoria,
  categorias,
  chaves,
  cupons,
  eventos,
  inscricoes,
  lotes,
  lutas,
  pagamentos,
} from "@/db/schema";
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
import { lerRegulamentoDoForm } from "@/lib/regulamento";

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

/** "70", "70,00" ou "R$ 70,00" → centavos; nulo se vazio/inválido */
function precoParaCentavos(bruto: FormDataEntryValue | null): number | null {
  const limpo = String(bruto ?? "")
    .replace(/[^\d,.]/g, "")
    .replace(",", ".");
  if (!limpo) return null;
  const reais = Number(limpo);
  if (!Number.isFinite(reais) || reais <= 0) return null;
  return Math.round(reais * 100);
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

  const modalidade = String(formData.get("modalidade") ?? "gi_nogi");
  const inscricoesFecham = formData.get("inscricoesFecham")
    ? new Date(String(formData.get("inscricoesFecham")))
    : null;

  const [evento] = await db
    .insert(eventos)
    .values({
      organizadorId: usuario.id,
      nome,
      slug,
      dataInicio,
      cidade: String(formData.get("cidade") ?? "") || null,
      uf: String(formData.get("uf") ?? "").toUpperCase() || null,
      endereco: String(formData.get("endereco") ?? "") || null,
      descricao: String(formData.get("descricao") ?? "") || null,
      bannerUrl: String(formData.get("bannerUrl") ?? "") || null,
      circuito: String(formData.get("circuito") ?? "") || null,
      modalidade: (["gi_nogi", "gi", "nogi"].includes(modalidade)
        ? modalidade
        : "gi_nogi") as "gi_nogi" | "gi" | "nogi",
      // nº de áreas e faixas vêm de outras partes (Áreas e grade de categorias)
      dataPesagem: String(formData.get("dataPesagem") ?? "") || null,
      moeda: String(formData.get("moeda") ?? "BRL"),
      inscricoesFecham,
      regulamento: lerRegulamentoDoForm(formData),
    })
    .returning();

  // preço informado na criação vira o 1º lote (a regra de preço vive em lotes)
  const preco = precoParaCentavos(formData.get("preco"));
  if (preco) {
    const fimLote =
      inscricoesFecham ?? new Date(`${dataInicio}T23:59:59`);
    await db.insert(lotes).values({
      eventoId: evento.id,
      nome: "1º lote",
      precoCentavos: preco,
      precoSegundaInscricaoCentavos: precoParaCentavos(formData.get("precoSegunda")),
      inicio: new Date(),
      fim: fimLote,
    });
  }

  redirect(`/organizador/eventos/${evento.id}`);
}

/**
 * Exclusão definitiva de um evento — só rascunhos, e só se ninguém se
 * inscreveu nem pagou nada. Eventos publicados não podem ser apagados
 * (encerre as inscrições em vez disso); a exclusão fica na auditoria.
 */
export async function excluirEvento(eventoId: string) {
  const { db, usuario, evento } = await eventoDoOrganizador(eventoId);

  if (evento.status !== "rascunho") {
    erroVisivel(
      eventoId,
      "Só eventos em rascunho podem ser excluídos — este já foi publicado.",
    );
  }

  const [inscritos, pagos] = await Promise.all([
    db.query.inscricoes.findMany({ where: eq(inscricoes.eventoId, eventoId) }),
    db.query.pagamentos.findMany({ where: eq(pagamentos.eventoId, eventoId) }),
  ]);
  if (inscritos.length || pagos.length) {
    erroVisivel(
      eventoId,
      "Este evento já tem inscrições ou pagamentos registrados e não pode ser excluído.",
    );
  }

  // filhos primeiro (sem cascade no schema): chaves/lutas de categorias,
  // depois categorias, lotes, cupons e áreas
  const cats = await db.query.categorias.findMany({
    where: eq(categorias.eventoId, eventoId),
  });
  if (cats.length) {
    const chavesDoEvento = await db.query.chaves.findMany({
      where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
    });
    if (chavesDoEvento.length) {
      await db.delete(lutas).where(
        inArray(lutas.chaveId, chavesDoEvento.map((c) => c.id)),
      );
      await db.delete(chaves).where(
        inArray(chaves.id, chavesDoEvento.map((c) => c.id)),
      );
    }
    await db.delete(categorias).where(eq(categorias.eventoId, eventoId));
  }
  await db.delete(lotes).where(eq(lotes.eventoId, eventoId));
  await db.delete(cupons).where(eq(cupons.eventoId, eventoId));
  await db.delete(areas).where(eq(areas.eventoId, eventoId));
  await db.delete(eventos).where(eq(eventos.id, eventoId));

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "evento",
    entidadeId: eventoId,
    acao: "evento_excluido",
    dadosAnteriores: { nome: evento.nome, slug: evento.slug },
  });

  revalidatePath("/organizador");
  redirect("/organizador");
}

/**
 * Edição do cadastro do evento (drawer "Editar evento"). Renomear o evento
 * regenera o slug da página pública, como no fluxo de criação.
 */
export async function editarEvento(eventoId: string, formData: FormData) {
  const { db, evento } = await eventoDoOrganizador(eventoId);

  const nome = String(formData.get("nome") ?? "").trim();
  const dataInicio = String(formData.get("dataInicio") ?? "");
  if (!nome || !dataInicio) {
    erroVisivel(eventoId, "Nome e data do evento são obrigatórios.");
  }

  let slug = evento.slug;
  if (nome !== evento.nome) {
    const base = slugify(nome);
    if (base !== evento.slug) {
      const existentes = await db.query.eventos.findMany({
        where: eq(eventos.slug, base),
      });
      slug =
        existentes.some((e) => e.id !== eventoId)
          ? `${base}-${Date.now().toString(36)}`
          : base;
    }
  }

  const modalidade = String(formData.get("modalidade") ?? "gi_nogi");

  await db
    .update(eventos)
    .set({
      nome,
      slug,
      dataInicio,
      cidade: String(formData.get("cidade") ?? "") || null,
      uf: String(formData.get("uf") ?? "").toUpperCase() || null,
      endereco: String(formData.get("endereco") ?? "") || null,
      descricao: String(formData.get("descricao") ?? "") || null,
      bannerUrl: String(formData.get("bannerUrl") ?? "") || null,
      circuito: String(formData.get("circuito") ?? "") || null,
      modalidade: (["gi_nogi", "gi", "nogi"].includes(modalidade)
        ? modalidade
        : "gi_nogi") as "gi_nogi" | "gi" | "nogi",
      // numAreas e faixas não são editados aqui — vivem na seção Áreas e na
      // grade de categorias
      dataPesagem: String(formData.get("dataPesagem") ?? "") || null,
      moeda: String(formData.get("moeda") ?? "BRL"),
      inscricoesFecham: formData.get("inscricoesFecham")
        ? new Date(String(formData.get("inscricoesFecham")))
        : null,
      regulamento: lerRegulamentoDoForm(formData),
    })
    .where(eq(eventos.id, eventoId));

  revalidatePath(`/organizador/eventos/${eventoId}`);
  revalidatePath(`/evento/${slug}`);
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

/**
 * Configuração comercial/operacional da categoria: preço próprio (entry, ex.:
 * absoluto) e duração estimada por luta (minutos, para o cronograma). Campos
 * vazios ou zero voltam ao padrão (lote vigente / tabela CBJJ da faixa).
 */
export async function configurarCategoria(
  eventoId: string,
  categoriaId: string,
  formData: FormData,
) {
  const { db } = await eventoDoOrganizador(eventoId);

  const brutoPreco = String(formData.get("preco") ?? "").trim().replace(",", ".");
  let precoCentavos: number | null = null;
  if (brutoPreco) {
    const reais = Number(brutoPreco);
    if (!Number.isFinite(reais) || reais < 0) {
      erroVisivel(eventoId, "Preço inválido — use um valor em reais, ex.: 90 ou 90,00");
    }
    precoCentavos = reais > 0 ? Math.round(reais * 100) : null;
  }

  const brutoDuracao = String(formData.get("duracaoMin") ?? "").trim().replace(",", ".");
  let duracaoLutaSegundos: number | null = null;
  if (brutoDuracao) {
    const minutos = Number(brutoDuracao);
    if (!Number.isFinite(minutos) || minutos < 0 || minutos > 60) {
      erroVisivel(eventoId, "Duração inválida — minutos por luta, ex.: 6");
    }
    duracaoLutaSegundos = minutos > 0 ? Math.round(minutos * 60) : null;
  }

  await db
    .update(categorias)
    .set({ precoCentavos, duracaoLutaSegundos })
    .where(and(eq(categorias.id, categoriaId), eq(categorias.eventoId, eventoId)));
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

/**
 * Gera em lote as chaves de todas as categorias com 2+ confirmados que ainda
 * não têm chave. Formato automático por tamanho: até 3 atletas → round robin
 * (todos contra todos), 4+ → eliminação simples. Rascunhos existentes são
 * preservados — regenere individualmente se quiser trocar o sorteio.
 */
export async function gerarChavesEmLote(eventoId: string) {
  const { db, usuario } = await eventoDoOrganizador(eventoId);

  const [cats, confirmadas] = await Promise.all([
    db.query.categorias.findMany({ where: eq(categorias.eventoId, eventoId) }),
    db.query.inscricoes.findMany({
      where: and(
        eq(inscricoes.eventoId, eventoId),
        eq(inscricoes.status, "confirmada"),
      ),
    }),
  ]);
  const contagem = new Map<string, number>();
  for (const i of confirmadas) {
    contagem.set(i.categoriaId, (contagem.get(i.categoriaId) ?? 0) + 1);
  }

  const existentes = new Set(
    cats.length
      ? (
          await db.query.chaves.findMany({
            where: inArray(chaves.categoriaId, cats.map((c) => c.id)),
          })
        ).map((c) => c.categoriaId)
      : [],
  );

  const pendentes = cats.filter(
    (c) => (contagem.get(c.id) ?? 0) >= 2 && !existentes.has(c.id),
  );
  if (!pendentes.length) {
    redirect(
      `/organizador/eventos/${eventoId}/chaves?erro=${encodeURIComponent(
        "Nenhuma categoria aguardando chave (2+ confirmados e sem chave gerada)",
      )}`,
    );
  }

  const falhas: string[] = [];
  for (const cat of pendentes) {
    try {
      const chave = await gerarChaveParaCategoria(db, cat.id, "auto");
      await db.insert(auditoria).values({
        usuarioId: usuario.id,
        entidade: "chave",
        entidadeId: chave.id,
        acao: "chave_gerada_em_lote",
        dadosNovos: { categoriaId: cat.id, formato: chave.formato, seed: chave.seedSorteio },
      });
    } catch (e) {
      falhas.push(`${cat.nome}: ${e instanceof Error ? e.message : "erro"}`);
    }
  }

  revalidatePath(`/organizador/eventos/${eventoId}/chaves`);
  if (falhas.length) {
    redirect(
      `/organizador/eventos/${eventoId}/chaves?erro=${encodeURIComponent(
        `Geradas ${pendentes.length - falhas.length} chave(s); falhas — ${falhas.join(" · ")}`,
      )}`,
    );
  }
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

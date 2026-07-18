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
  eventoDias,
  eventos,
  inscricoes,
  lotes,
  lutas,
  pagamentos,
} from "@/db/schema";
import { getUsuarioAtual } from "@/lib/auth";
import { ehDonoDoEvento, eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import {
  gerarChaveParaCategoria,
  registrarResultadoNoBanco,
  salvarNotasVotacao,
} from "@/lib/chaves/persistencia";
import type { FormatoSelecionavel, MetodoVitoria } from "@/lib/bracket";
import {
  gerarGrade,
  type Faixa,
  type SelecaoGrade,
  type Sexo,
} from "@/lib/categorias/cbjj";
import { publicarEventoCore } from "@/lib/eventos/publicacao";
import {
  lerDiasDoForm,
  persistirDiasEvento,
  validarDias,
} from "@/lib/eventos/dias-form";
import { lerRegulamentoDoForm } from "@/lib/regulamento";
import { GRUPOS_PRECO_PRESETS, type LoteVariacao } from "@/lib/lotes/preco";
import { diaLocalYmd, loteConflitante, ymdParaBR } from "@/lib/lotes/vigencia";

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

/** erros do formulário de lotes voltam para a própria página de Lotes */
function erroLote(eventoId: string, mensagem: string): never {
  redirect(
    `/organizador/eventos/${eventoId}/lotes?erro=${encodeURIComponent(mensagem)}`,
  );
}

async function eventoDoOrganizador(eventoId: string) {
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const evento = await eventoGerenciavel(db, eventoId, usuario.id);
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

/** inscrições não podem fechar depois do último dia do evento */
function inscricoesFechamValidas(
  inscricoesFecham: Date | null,
  ultimaData: string,
): boolean {
  if (!inscricoesFecham) return true;
  return inscricoesFecham <= new Date(`${ultimaData}T23:59:59`);
}

export async function criarEvento(formData: FormData) {
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const erros = (await getDicionario()).admin.erros;

  const nome = String(formData.get("nome") ?? "").trim();
  const dias = lerDiasDoForm(formData);
  const erroDias = validarDias(dias);
  if (!nome) throw new Error(erros.nomeDataObrigatorios);
  if (erroDias) throw new Error(erros[erroDias]);
  // dataInicio/dataFim derivam dos dias (min/max)
  const dataInicio = dias[0].data;
  const dataFim = dias[dias.length - 1].data;

  const base = slugify(nome);
  const existentes = await db.query.eventos.findMany({
    where: eq(eventos.slug, base),
  });
  const slug = existentes.length ? `${base}-${Date.now().toString(36)}` : base;

  const modalidade = String(formData.get("modalidade") ?? "gi_nogi");
  const inscricoesFecham = formData.get("inscricoesFecham")
    ? new Date(String(formData.get("inscricoesFecham")))
    : null;
  if (!inscricoesFechamValidas(inscricoesFecham, dataFim)) {
    throw new Error(erros.inscricoesFecham);
  }

  const [evento] = await db
    .insert(eventos)
    .values({
      organizadorId: usuario.id,
      nome,
      slug,
      dataInicio,
      dataFim,
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
      dataGeracaoChaves:
        String(formData.get("dataGeracaoChaves") ?? "") || null,
      moeda: String(formData.get("moeda") ?? "BRL"),
      inscricoesFecham,
      regulamento: lerRegulamentoDoForm(formData),
    })
    .returning();

  // grava os dias do evento (janelas usadas pelo gerador de áreas/cronograma)
  await persistirDiasEvento(db, evento.id, dias);

  // preço informado na criação vira o 1º lote (a regra de preço vive em lotes)
  const preco = precoParaCentavos(formData.get("preco"));
  if (preco) {
    const fimLote =
      inscricoesFecham ?? new Date(`${dataFim}T23:59:59`);
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
  // só o dono exclui o evento — colaboradores não
  if (!ehDonoDoEvento(evento, usuario.id)) {
    throw new Error("Apenas o dono do evento pode excluí-lo");
  }
  const erros = (await getDicionario()).admin.erros;

  if (evento.status !== "rascunho") {
    erroVisivel(eventoId, erros.soRascunhoExcluir);
  }

  const [inscritos, pagos] = await Promise.all([
    db.query.inscricoes.findMany({ where: eq(inscricoes.eventoId, eventoId) }),
    db.query.pagamentos.findMany({ where: eq(pagamentos.eventoId, eventoId) }),
  ]);
  if (inscritos.length || pagos.length) {
    erroVisivel(eventoId, erros.eventoComInscricoes);
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
  await db.delete(eventoDias).where(eq(eventoDias.eventoId, eventoId));
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
  const erros = (await getDicionario()).admin.erros;

  const nome = String(formData.get("nome") ?? "").trim();
  const dias = lerDiasDoForm(formData);
  const erroDias = validarDias(dias);
  if (!nome) erroVisivel(eventoId, erros.nomeDataObrigatorios);
  if (erroDias) erroVisivel(eventoId, erros[erroDias]);
  const dataInicio = dias[0].data;
  const dataFim = dias[dias.length - 1].data;

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
  const inscricoesFecham = formData.get("inscricoesFecham")
    ? new Date(String(formData.get("inscricoesFecham")))
    : null;
  if (!inscricoesFechamValidas(inscricoesFecham, dataFim)) {
    erroVisivel(eventoId, erros.inscricoesFecham);
  }

  await db
    .update(eventos)
    .set({
      nome,
      slug,
      dataInicio,
      dataFim,
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
      dataGeracaoChaves:
        String(formData.get("dataGeracaoChaves") ?? "") || null,
      moeda: String(formData.get("moeda") ?? "BRL"),
      inscricoesFecham,
      regulamento: lerRegulamentoDoForm(formData),
    })
    .where(eq(eventos.id, eventoId));

  // substitui os dias do evento (janelas do gerador de áreas/cronograma)
  await persistirDiasEvento(db, eventoId, dias);

  revalidatePath(`/organizador/eventos/${eventoId}`);
  revalidatePath(`/evento/${slug}`);
}

export async function gerarCategoriasCbjj(eventoId: string, formData: FormData) {
  const { db, evento } = await eventoDoOrganizador(eventoId);
  const erros = (await getDicionario()).admin.erros;

  // A modalidade do evento manda na tabela de peso: Gi → com kimono, No-Gi →
  // sem kimono. Só o evento "gi_nogi" (ambos) respeita a escolha do gerador.
  const comKimono =
    evento.modalidade === "gi"
      ? true
      : evento.modalidade === "nogi"
        ? false
        : formData.get("comKimono") !== "nogi";

  const selecao: SelecaoGrade = {
    classes: formData.getAll("classes").map(String),
    sexos: formData.getAll("sexos").map(String) as Sexo[],
    faixas: formData.getAll("faixas").map(String) as Faixa[],
    incluirAbsoluto: formData.get("incluirAbsoluto") === "on",
    comKimono,
  };

  const grade = gerarGrade(selecao);
  if (!grade.length) {
    erroVisivel(eventoId, erros.selecaoVazia);
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
  const erros = (await getDicionario()).admin.erros;

  const inscritos = await db.query.inscricoes.findMany({
    where: eq(inscricoes.categoriaId, categoriaId),
  });
  if (inscritos.length) {
    erroVisivel(eventoId, erros.categoriaComInscritos);
  }

  await db
    .delete(categorias)
    .where(and(eq(categorias.id, categoriaId), eq(categorias.eventoId, eventoId)));
  revalidatePath(`/organizador/eventos/${eventoId}`);
}

/**
 * Define o grupo de preço de um bloco de categorias (mesma classe de idade +
 * sexo). O grupo casa com o `nome` de uma variação do lote; string vazia limpa.
 */
export async function definirGrupoPreco(eventoId: string, formData: FormData) {
  const { db } = await eventoDoOrganizador(eventoId);
  const erros = (await getDicionario()).admin.erros;

  const classeIdade = String(formData.get("classeIdade") ?? "");
  const sexo = String(formData.get("sexo") ?? "");
  const grupo = String(formData.get("grupo") ?? "").trim() || null;
  if (!classeIdade || (sexo !== "masculino" && sexo !== "feminino")) {
    erroVisivel(eventoId, erros.blocoInvalido);
  }
  if (grupo && !(GRUPOS_PRECO_PRESETS as readonly string[]).includes(grupo)) {
    erroVisivel(eventoId, erros.grupoInvalido);
  }

  await db
    .update(categorias)
    .set({ grupoPreco: grupo })
    .where(
      and(
        eq(categorias.eventoId, eventoId),
        eq(categorias.classeIdade, classeIdade),
        eq(categorias.sexo, sexo as "masculino" | "feminino"),
      ),
    );
  revalidatePath(`/organizador/eventos/${eventoId}/categorias`);
}

export async function criarLote(eventoId: string, formData: FormData) {
  const { db } = await eventoDoOrganizador(eventoId);
  const erros = (await getDicionario()).admin.erros;

  const nome = String(formData.get("nome") ?? "").trim();
  const preco = Math.round(Number(formData.get("preco") ?? 0) * 100);
  const precoSegunda = formData.get("precoSegunda")
    ? Math.round(Number(formData.get("precoSegunda")) * 100)
    : null;
  // datas vêm como dia (yyyy-mm-dd): início às 00:00 e fim às 23:59:59 do dia,
  // para o lote valer o dia inteiro do "fim" (âncora em horário local)
  const inicioStr = String(formData.get("inicio") ?? "");
  const fimStr = String(formData.get("fim") ?? "");
  const inicio = new Date(
    inicioStr.includes("T") ? inicioStr : `${inicioStr}T00:00:00`,
  );
  const fim = new Date(fimStr.includes("T") ? fimStr : `${fimStr}T23:59:59`);

  if (!nome || !preco || isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
    erroLote(eventoId, erros.loteCampos);
  }
  if (fim <= inicio) {
    erroLote(eventoId, erros.loteFimAntesInicio);
  }

  // o período não pode cair dentro (nem cruzar) o de outro lote: cada dia
  // pertence a no máximo um lote, senão o preço vigente por data fica ambíguo
  const existentes = await db.query.lotes.findMany({
    where: eq(lotes.eventoId, eventoId),
  });
  const conflito = loteConflitante(
    { inicio: inicioStr, fim: fimStr },
    existentes.map((l) => ({
      nome: l.nome,
      inicio: diaLocalYmd(l.inicio),
      fim: diaLocalYmd(l.fim),
    })),
  );
  if (conflito) {
    erroLote(
      eventoId,
      `${erros.loteConflitoPre} "${conflito.nome}" (${ymdParaBR(conflito.inicio)} → ${ymdParaBR(conflito.fim)}). ${erros.loteConflitoPos}`,
    );
  }

  // pacotes de preço nomeados (opcional): linhas varNome/varPreco pareadas por
  // índice — o formulário sempre emite os dois campos por linha
  const varNomes = formData.getAll("varNome").map((v) => String(v).trim());
  const varPrecos = formData.getAll("varPreco");
  const variacoes: LoteVariacao[] = [];
  for (let i = 0; i < varNomes.length; i++) {
    const nomeVar = varNomes[i];
    const centavos = precoParaCentavos(varPrecos[i] ?? null);
    if (!nomeVar && centavos == null) continue; // linha em branco
    if (!nomeVar || centavos == null) {
      erroLote(eventoId, erros.pacoteCampos);
    }
    if (!(GRUPOS_PRECO_PRESETS as readonly string[]).includes(nomeVar)) {
      erroLote(eventoId, `${erros.grupoInvalidoNome} "${nomeVar}".`);
    }
    if (variacoes.some((v) => v.nome === nomeVar)) {
      erroLote(eventoId, `${erros.grupoRepetido} "${nomeVar}".`);
    }
    variacoes.push({ nome: nomeVar, precoCentavos: centavos });
  }

  await db.insert(lotes).values({
    eventoId,
    nome,
    precoCentavos: preco,
    precoSegundaInscricaoCentavos: precoSegunda,
    variacoes: variacoes.length ? variacoes : null,
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
    erroVisivel(
      eventoId,
      (await getDicionario()).admin.erros.soPublicadosEncerram,
    );
  }
  await db
    .update(eventos)
    .set({ status: "inscricoes_encerradas" })
    .where(eq(eventos.id, eventoId));
  revalidatePath(`/organizador/eventos/${eventoId}`);
}

export async function gerarChave(
  eventoId: string,
  categoriaId: string,
  formato: FormatoSelecionavel = "auto",
  numJurados?: number,
) {
  const { db, usuario } = await eventoDoOrganizador(eventoId);
  let chave;
  try {
    chave = await gerarChaveParaCategoria(db, categoriaId, formato, { numJurados });
  } catch (e) {
    const erros = (await getDicionario()).admin.erros;
    const codigo = e instanceof Error ? e.message : "";
    redirect(
      `/organizador/eventos/${eventoId}/chaves?erro=${encodeURIComponent(
        erros.chave[codigo] ?? erros.chaveGerarFalhou,
      )}`,
    );
  }
  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "chave",
    entidadeId: chave.id,
    acao: "chave_gerada",
    dadosNovos: { categoriaId, formato: chave.formato, seed: chave.seedSorteio },
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
  const dic = await getDicionario();

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
        dic.admin.erros.nenhumaAguardandoChave,
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
      const codigo = e instanceof Error ? e.message : "";
      falhas.push(
        `${cat.nome}: ${dic.admin.erros.chave[codigo] ?? dic.admin.erros.chaveGerarFalhou}`,
      );
    }
  }

  revalidatePath(`/organizador/eventos/${eventoId}/chaves`);
  if (falhas.length) {
    const geradas = pendentes.length - falhas.length;
    const ch = dic.admin.chaves;
    redirect(
      `/organizador/eventos/${eventoId}/chaves?erro=${encodeURIComponent(
        `${dic.admin.erros.chavesGeradasPre} ${geradas} ${geradas === 1 ? ch.chaveSing : ch.chavePlur}; ${dic.admin.erros.chavesComFalhas} ${falhas.join(" · ")}`,
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
      `/organizador/eventos/${eventoId}/chaves?erro=${encodeURIComponent(
        (await getDicionario()).admin.erros.nenhumaRascunhoPublicar,
      )}`,
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

/** Salva as notas dos jurados de uma apresentação (votação por jurados). */
export async function salvarNotas(
  eventoId: string,
  chaveId: string,
  formData: FormData,
) {
  const { db, usuario } = await eventoDoOrganizador(eventoId);
  const lutaId = String(formData.get("lutaId") ?? "");
  const notas = formData
    .getAll("nota")
    .map((v) => parseFloat(String(v).replace(",", ".")))
    .filter((n) => !Number.isNaN(n));

  await salvarNotasVotacao(db, chaveId, lutaId, notas);

  await db.insert(auditoria).values({
    usuarioId: usuario.id,
    entidade: "luta",
    entidadeId: lutaId,
    acao: "notas_lancadas",
    dadosNovos: { notas },
  });

  revalidatePath(`/organizador/eventos/${eventoId}/chaves/${chaveId}`);
}

export async function publicarEvento(eventoId: string) {
  const { db } = await eventoDoOrganizador(eventoId);
  // publica com o mínimo (categoria + lote); atletas/lutas/chaves/áreas ficam
  // para depois — a regra de requisitos vive em publicarEventoCore (testada).
  try {
    await publicarEventoCore(db, eventoId);
  } catch (e) {
    const erros = (await getDicionario()).admin.erros;
    const codigo = e instanceof Error ? e.message : "";
    erroVisivel(eventoId, erros.publicar[codigo] ?? erros.publicarFalhou);
  }
  revalidatePath(`/organizador/eventos/${eventoId}`);
}

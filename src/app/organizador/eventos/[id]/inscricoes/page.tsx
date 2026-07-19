import { notFound } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, inscricoes, usuarios } from "@/db/schema";
import { BotaoAcao } from "@/components/ui/botao-acao";
import { NativeSelect } from "@/components/ui/native-select";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { formatarCep, formatarCpf } from "@/lib/cpf";
import { fundirCategorias } from "./actions";
import {
  PainelInscricoes,
  type CategoriaAberta,
  type LinhaInscricao,
} from "./painel-inscricoes";

export default async function PaginaInscricoes({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const usuario = await getUsuarioAtual();
  const dic = await getDicionario();
  const t = dic.admin.inscricoes;
  const ov = dic.admin.overview;

  const evento = await eventoGerenciavel(db, id, usuario.id);
  if (!evento) notFound();

  const [lista, cats] = await Promise.all([
    db.query.inscricoes.findMany({
      where: eq(inscricoes.eventoId, id),
      orderBy: desc(inscricoes.criadoEm),
    }),
    db.query.categorias.findMany({
      where: eq(categorias.eventoId, id),
      orderBy: asc(categorias.nome),
    }),
  ]);
  const abertas = cats.filter((c) => c.status === "aberta");
  const nomeCategoria = new Map(cats.map((c) => [c.id, c.nome]));

  // contadores do topo: inscritos ativos = confirmadas + pendentes; as
  // canceladas/reembolsadas aparecem na lista, mas contam à parte ("inativas").
  const nConfirmadas = lista.filter((i) => i.status === "confirmada").length;
  const nPendentes = lista.filter((i) => i.status === "pendente_pagamento").length;
  const nAtivas = nConfirmadas + nPendentes;
  const nInativas = lista.length - nAtivas;
  const contar = (n: number, sing: string, plur: string) =>
    `${n} ${n === 1 ? sing : plur}`;

  // CPF/endereço ficam no perfil (usuarios); carrega em lote os das inscrições
  const usuarioIds = [...new Set(lista.map((i) => i.usuarioId))];
  const dadosUsuarios = usuarioIds.length
    ? await db.query.usuarios.findMany({
        where: inArray(usuarios.id, usuarioIds),
        columns: {
          id: true,
          cpf: true,
          enderecoCep: true,
          enderecoLogradouro: true,
          enderecoNumero: true,
          enderecoComplemento: true,
          enderecoBairro: true,
          enderecoCidade: true,
          enderecoUf: true,
        },
      })
    : [];
  const perfilPorUsuario = new Map(dadosUsuarios.map((u) => [u.id, u]));

  // linhas serializadas para o painel client (filtro + busca instantâneos)
  const linhas: LinhaInscricao[] = lista.map((i) => {
    const u = perfilPorUsuario.get(i.usuarioId);
    const endereco = u
      ? [
          [u.enderecoLogradouro, u.enderecoNumero].filter(Boolean).join(", "),
          u.enderecoComplemento,
          u.enderecoBairro,
          [u.enderecoCidade, u.enderecoUf].filter(Boolean).join("/"),
          u.enderecoCep ? `CEP ${formatarCep(u.enderecoCep)}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "";
    const cpfTxt = u && u.cpf ? `${dic.inscricao.cpf} ${formatarCpf(u.cpf)}` : "";
    const docLinha = [cpfTxt, endereco].filter(Boolean).join(" · ");
    const categoriaNome = nomeCategoria.get(i.categoriaId) ?? "";
    return {
      id: i.id,
      nome: i.nomeAtleta,
      status: i.status,
      categoriaId: i.categoriaId,
      categoriaNome,
      faixa: i.faixa,
      academiaNome: i.academiaNome,
      docLinha,
      busca: [i.nomeAtleta, i.academiaNome, categoriaNome, i.faixa, docLinha]
        .filter(Boolean)
        .join(" "),
    };
  });
  const abertasDTO: CategoriaAberta[] = abertas.map((c) => ({
    id: c.id,
    nome: c.nome,
  }));

  const ativasPorCategoria = new Map<string, number>();
  for (const i of lista) {
    if (i.status === "confirmada" || i.status === "pendente_pagamento") {
      ativasPorCategoria.set(
        i.categoriaId,
        (ativasPorCategoria.get(i.categoriaId) ?? 0) + 1,
      );
    }
  }
  const esvaziadas = abertas.filter(
    (c) =>
      (ativasPorCategoria.get(c.id) ?? 0) > 0 &&
      (ativasPorCategoria.get(c.id) ?? 0) < c.minInscritos,
  );

  return (
    <div className="space-y-8">
      <p className="font-cond text-[15px] uppercase tracking-[0.05em] text-muted-2">
        <span className="text-foreground">{nAtivas}</span>{" "}
        {nAtivas === 1 ? t.inscricaoSing : t.inscricaoPlur}
        {" · "}
        <span className="text-success">
          {contar(nConfirmadas, ov.confirmada, ov.confirmadas)}
        </span>
        {" · "}
        <span className="text-warning-foreground">
          {contar(nPendentes, ov.pendente, ov.pendentes)}
        </span>
        {nInativas > 0 && (
          <>
            {" · "}
            <span className="text-muted-3">
              {contar(nInativas, ov.inativa, ov.inativas)}
            </span>
          </>
        )}
      </p>

      {esvaziadas.length > 0 && (
        <section className="rounded-xl border border-warning/40 bg-warning/15 p-5">
          <p className="font-semibold text-warning-foreground">
            {t.abaixoMinimo}
          </p>
          <p className="mt-1 text-xs text-warning-foreground/80">
            {t.abaixoMinimoDesc}
          </p>
          <ul className="mt-3 space-y-2">
            {esvaziadas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 text-sm">
                <span>
                  {c.nome}{" "}
                  <span className="text-warning-foreground/80">
                    ({ativasPorCategoria.get(c.id)} {t.de} {c.minInscritos}{" "}
                    {t.min})
                  </span>
                </span>
                <form
                  action={fundirCategorias.bind(null, id, c.id)}
                  className="flex items-center gap-2"
                >
                  <NativeSelect name="destinoId" required className="h-8 w-auto text-xs">
                    <option value="">{t.fundirEm}</option>
                    {abertas
                      .filter((d) => d.id !== c.id && d.sexo === c.sexo)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nome}
                        </option>
                      ))}
                  </NativeSelect>
                  <BotaoAcao size="sm">{t.fundir}</BotaoAcao>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PainelInscricoes eventoId={id} linhas={linhas} abertas={abertasDTO} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorias, inscricoes, usuarios } from "@/db/schema";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { AcaoTexto, BotaoAcao } from "@/components/ui/botao-acao";
import { SeletorAcademia } from "@/components/inscricao/seletor-academia";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { getUsuarioAtual } from "@/lib/auth";
import { eventoGerenciavel } from "@/lib/eventos/acesso";
import { getDicionario } from "@/lib/i18n/server";
import { FAIXAS } from "@/lib/categorias/cbjj";
import { formatarCep, formatarCpf } from "@/lib/cpf";
import {
  cancelarInscricao,
  fundirCategorias,
  inscricaoManual,
  moverInscricao,
  reembolsarInscricao,
} from "./actions";

const VARIANTE_STATUS: Record<string, BadgeProps["variant"]> = {
  pendente_pagamento: "warning",
  confirmada: "success",
  cancelada: "secondary",
  reembolsada: "secondary",
};

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
    <div className="space-y-10">
      <p className="font-cond text-[15px] uppercase tracking-[0.05em] text-muted-2">
        {lista.length}{" "}
        {lista.length === 1 ? t.inscricaoSing : t.inscricaoPlur} {t.noTotal}
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

      <section>
        <ul className="divide-y divide-border rounded-xl border bg-card">
          {lista.map((i) => {
            const rotulo = dic.admin.statusInscricao[i.status] ?? i.status;
            const variante = VARIANTE_STATUS[i.status] ?? ("outline" as const);
            const ativa = i.status === "confirmada" || i.status === "pendente_pagamento";
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
            const cpfTxt =
              u && u.cpf ? `${dic.inscricao.cpf} ${formatarCpf(u.cpf)}` : "";
            const docLinha = [cpfTxt, endereco].filter(Boolean).join(" · ");
            return (
              <li
                key={i.id}
                className="flex flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {i.nomeAtleta}
                      <span className="ml-2 font-normal capitalize text-muted-foreground">
                        {dic.evento.faixaNomes[
                          i.faixa as keyof typeof dic.evento.faixaNomes
                        ] ?? i.faixa}
                        {i.academiaNome ? ` · ${i.academiaNome}` : ""}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nomeCategoria.get(i.categoriaId)}
                    </p>
                    {docLinha && (
                      <p className="mt-0.5 text-xs text-muted-foreground/70">
                        {docLinha}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 max-sm:w-full">
                  <Badge variant={variante}>{rotulo}</Badge>

                  {ativa && (
                    <form
                      action={moverInscricao.bind(null, id, i.id)}
                      className="flex items-center gap-1 max-sm:flex-1"
                    >
                      <NativeSelect
                        name="categoriaId"
                        required
                        defaultValue=""
                        className="h-8 w-full text-xs sm:w-44"
                      >
                        <option value="" disabled>
                          {t.moverPara}
                        </option>
                        {abertas
                          .filter((c) => c.id !== i.categoriaId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                      </NativeSelect>
                      <BotaoAcao variant="outline" size="sm">
                        OK
                      </BotaoAcao>
                    </form>
                  )}

                  {i.status === "pendente_pagamento" && (
                    <form action={cancelarInscricao.bind(null, id, i.id)}>
                      <AcaoTexto className="text-xs text-destructive hover:underline">
                        {t.cancelarAcao}
                      </AcaoTexto>
                    </form>
                  )}
                  {i.status === "confirmada" && (
                    <form action={reembolsarInscricao.bind(null, id, i.id)}>
                      <AcaoTexto className="text-xs text-destructive hover:underline">
                        {t.reembolsar}
                      </AcaoTexto>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
          {lista.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              {t.nenhumaAinda}
            </li>
          )}
        </ul>
      </section>

      <section className="max-w-2xl">
        <h2 className="text-lg font-bold">{t.inscricaoManual}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t.manualDesc}</p>
        <Card className="mt-4">
          <CardContent className="p-5">
            <form action={inscricaoManual.bind(null, id)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  name="nome"
                  required
                  placeholder={dic.inscricao.nomeCompleto}
                />
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder={dic.inscricao.email}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Input name="dataNascimento" type="date" required />
                <NativeSelect name="sexo" required defaultValue="">
                  <option value="" disabled>
                    {dic.inscricao.sexo}
                  </option>
                  <option value="masculino">{dic.inscricao.masculino}</option>
                  <option value="feminino">{dic.inscricao.feminino}</option>
                </NativeSelect>
                <NativeSelect name="faixa" required defaultValue="">
                  <option value="" disabled>
                    {dic.inscricao.faixa}
                  </option>
                  {FAIXAS.map((f) => (
                    <option key={f} value={f}>
                      {dic.evento.faixaNomes[
                        f as keyof typeof dic.evento.faixaNomes
                      ] ?? f}
                    </option>
                  ))}
                </NativeSelect>
                <SeletorAcademia name="academiaId" />
              </div>
              <NativeSelect name="categoriaId" required defaultValue="">
                <option value="" disabled>
                  {dic.inscricao.categoria}
                </option>
                {abertas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </NativeSelect>
              <BotaoAcao>{t.inscreverManualmente}</BotaoAcao>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

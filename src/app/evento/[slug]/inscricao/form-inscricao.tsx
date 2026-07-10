"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eyebrow } from "@/components/marca";
import { Spinner } from "@/components/ui/botao-acao";
import { PassosInscricao } from "@/components/inscricao/passos";
import { ResumoEvento } from "@/components/inscricao/resumo-evento";
import { SeletorAcademia } from "@/components/inscricao/seletor-academia";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CLASSES_IDADE, FAIXAS } from "@/lib/categorias/cbjj";
import {
  categoriaCompativel,
  idadeNoAnoDoEvento,
} from "@/lib/categorias/elegibilidade";
import { precoDoGrupoCentavos, type LoteVariacao } from "@/lib/lotes/preco";
import { cn } from "@/lib/utils";

export interface CategoriaOpcao {
  id: string;
  nome: string;
  sexo: string;
  faixa: string | null;
  idadeMin: number | null;
  idadeMax: number | null;
  /** preço próprio da categoria em centavos; nulo = preço do lote */
  precoCentavos: number | null;
  /** grupo de preço (casa com uma variação do lote); nulo = preço base */
  grupoPreco: string | null;
}

export interface EventoResumo {
  nome: string;
  slug: string;
  meta: string;
  badge?: string;
  bannerUrl: string | null;
  precoCentavos: number;
  precoSegundaCentavos: number | null;
  /** pacotes de preço nomeados do lote vigente */
  variacoes: LoteVariacao[] | null;
  moeda: string;
}

interface Props {
  dataEvento: string;
  categorias: CategoriaOpcao[];
  evento: EventoResumo;
  acao: (formData: FormData) => Promise<void>;
  perfil?: {
    nome?: string;
    email?: string;
    dataNascimento?: string;
    sexo?: string;
    faixa?: string;
    academiaId?: string;
    academiaNome?: string;
  };
}

function divisaoDaIdade(idade: number): string | null {
  const classe = [...CLASSES_IDADE]
    .reverse()
    .find((c) => idade >= c.idadeMin && (c.idadeMax == null || idade <= c.idadeMax));
  return classe?.nome ?? null;
}

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function BotaoContinuar({ habilitado }: { habilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!habilitado || pending}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 px-[26px] py-3 font-cond text-lg font-bold uppercase tracking-[0.04em] transition-colors",
        habilitado
          ? "cursor-pointer bg-brand text-white hover:bg-[#d5261d]"
          : "cursor-not-allowed bg-brand/30 text-white/50",
      )}
    >
      {pending && <Spinner className="h-4 w-4" />}
      {pending ? "Enviando…" : "Continuar para o pagamento →"}
    </button>
  );
}

export function FormInscricao({ dataEvento, categorias, evento, acao, perfil }: Props) {
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [email, setEmail] = useState(perfil?.email ?? "");
  const [sexo, setSexo] = useState(perfil?.sexo ?? "");
  const [faixa, setFaixa] = useState(perfil?.faixa ?? "");
  const [nascimento, setNascimento] = useState(perfil?.dataNascimento ?? "");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const perfilCompleto = !!(sexo && faixa && nascimento);

  const compativeis = useMemo(() => {
    if (!perfilCompleto) return [];
    const idade = idadeNoAnoDoEvento(nascimento, dataEvento);
    return categorias.filter((c) => categoriaCompativel(c, { sexo, faixa, idade }));
  }, [perfilCompleto, sexo, faixa, nascimento, categorias, dataEvento]);

  const categoriaEscolhida = compativeis.find((c) => c.id === categoriaId) ?? null;
  const divisao = nascimento
    ? divisaoDaIdade(idadeNoAnoDoEvento(nascimento, dataEvento))
    : null;
  const podeContinuar = !!(nome && email && perfilCompleto && categoriaEscolhida);

  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: evento.moeda,
    maximumFractionDigits: 0,
  });
  // preço próprio (entry) ou preço do grupo da categoria; senão o base do lote
  const precoDaCategoria = (c: CategoriaOpcao): number | null =>
    c.precoCentavos ?? precoDoGrupoCentavos(evento.variacoes, c.grupoPreco);
  const precoExibido =
    (categoriaEscolhida && precoDaCategoria(categoriaEscolhida)) ??
    evento.precoCentavos;

  const aoMudarPerfil =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setCategoriaId(null);
    };

  const labelCls =
    "mb-[9px] block font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-2";

  return (
    <div className="grid flex-1 items-stretch lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* PASSO 1 — DADOS */}
      <div className="px-6 py-12 md:px-16">
        <PassosInscricao atual={1} />

        <Eyebrow className="mb-2 tracking-[0.14em]">Passo 1 · Seus dados</Eyebrow>
        <h1 className="disp mb-1.5 text-[clamp(44px,5vw,64px)]">
          Inscrição · {evento.nome}
        </h1>
        <p className="mb-[34px] max-w-[480px] text-base font-medium text-muted-2">
          Só mostramos categorias compatíveis com seu perfil. Pagamento na
          próxima etapa.
        </p>

        <form
          action={async (fd) => {
            setErro(null);
            try {
              await acao(fd);
            } catch (e) {
              // redirect() do Next lança um erro especial que deve propagar
              if (e && typeof e === "object" && "digest" in e) throw e;
              setErro(e instanceof Error ? e.message : "Erro ao processar inscrição");
            }
          }}
          className="flex max-w-[640px] flex-col gap-[26px]"
        >
          {erro && (
            <p className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erro}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="insc-nome">
                Nome completo *
              </label>
              <Input
                id="insc-nome"
                name="nome"
                required
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="insc-email">
                E-mail *
              </label>
              <Input
                id="insc-email"
                name="email"
                type="email"
                required
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="insc-nascimento">
                Nascimento *
              </label>
              <Input
                id="insc-nascimento"
                name="dataNascimento"
                type="date"
                required
                value={nascimento}
                onChange={(e) => aoMudarPerfil(setNascimento)(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="insc-sexo">
                Sexo *
              </label>
              <NativeSelect
                id="insc-sexo"
                name="sexo"
                required
                value={sexo}
                onChange={(e) => aoMudarPerfil(setSexo)(e.target.value)}
                className={sexo ? "" : "text-muted-3"}
              >
                <option value="">Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </NativeSelect>
            </div>
            <div>
              <label className={labelCls} htmlFor="insc-faixa">
                Faixa *
              </label>
              <NativeSelect
                id="insc-faixa"
                name="faixa"
                required
                value={faixa}
                onChange={(e) => aoMudarPerfil(setFaixa)(e.target.value)}
                className={faixa ? "" : "text-muted-3"}
              >
                <option value="">Selecione</option>
                {FAIXAS.map((f) => (
                  <option key={f} value={f}>
                    {capitalizar(f)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="insc-academia">
              Academia / equipe
            </label>
            <SeletorAcademia
              id="insc-academia"
              name="academiaId"
              defaultId={perfil?.academiaId}
              defaultNome={perfil?.academiaNome}
            />
          </div>

          <div>
            <span className={labelCls}>Categoria *</span>
            {perfilCompleto ? (
              compativeis.length ? (
                <div className="flex flex-col gap-2">
                  {compativeis.map((c) => {
                    const sel = c.id === categoriaId;
                    const precoCat = precoDaCategoria(c);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoriaId(c.id)}
                        className={cn(
                          "flex items-center justify-between border px-4 py-3 text-left font-cond text-lg font-semibold uppercase tracking-[0.02em] transition-colors",
                          sel
                            ? "border-brand bg-brand text-white"
                            : "border-white/12 bg-raised text-text-2 hover:border-brand/50",
                        )}
                      >
                        <span>{c.nome}</span>
                        <span
                          className={cn(
                            "font-cond text-[13px] normal-case",
                            sel ? "text-white/70" : "text-muted-3",
                          )}
                        >
                          {sel
                            ? "selecionada"
                            : precoCat != null
                              ? fmt.format(precoCat / 100)
                              : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="border border-dashed border-white/16 p-5 font-cond text-[13px] text-warning-foreground">
                  Nenhuma categoria compatível com seu perfil neste evento.
                </p>
              )
            ) : (
              <p className="border border-dashed border-white/16 p-5 font-cond text-[13px] text-muted-3">
                Preencha nascimento, sexo e faixa para ver suas categorias.
              </p>
            )}
            <input type="hidden" name="categoriaId" value={categoriaId ?? ""} />
          </div>

          <div className="mt-2 flex gap-4">
            <Link
              href={`/evento/${evento.slug}`}
              className="border border-white/18 px-[26px] py-3 font-cond text-[17px] font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/40"
            >
              Voltar
            </Link>
            <BotaoContinuar habilitado={podeContinuar} />
          </div>
        </form>
      </div>

      {/* RESUMO */}
      <ResumoEvento
        nomeEvento={evento.nome}
        meta={evento.meta}
        badge={evento.badge}
        bannerUrl={evento.bannerUrl}
        linhas={[
          { k: "Atleta", v: nome || null },
          { k: "Faixa", v: faixa ? capitalizar(faixa) : null, dourado: true },
          { k: "Divisão", v: divisao },
          { k: "Categoria", v: categoriaEscolhida?.nome ?? null, dourado: true },
        ]}
        precoRotulo="Taxa de inscrição"
        precoValor={fmt.format(precoExibido / 100)}
        notaRodape={
          evento.precoSegundaCentavos != null
            ? `Segunda categoria: +${fmt.format(evento.precoSegundaCentavos / 100)} · Pix`
            : "Pagamento via Pix na próxima etapa"
        }
      />
    </div>
  );
}

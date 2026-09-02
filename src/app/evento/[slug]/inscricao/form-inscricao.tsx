"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { Eyebrow } from "@/components/marca";
import { Spinner } from "@/components/ui/botao-acao";
import { PassosInscricao } from "@/components/inscricao/passos";
import { ResumoEvento } from "@/components/inscricao/resumo-evento";
import { SeletorAcademia } from "@/components/inscricao/seletor-academia";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CLASSES_IDADE, FAIXAS } from "@/lib/categorias/cbjj";
import { PAISES, nomePaisLocale } from "@/lib/paises";
import { formatarCep, formatarCpf, soDigitos, validarCpf } from "@/lib/cpf";
import { buscarCep } from "@/lib/cep";
import {
  absolutoDaCategoria,
  categoriaCompativel,
  idadeNoAnoDoEvento,
} from "@/lib/categorias/elegibilidade";
import { precoInscricaoCentavos, type LoteVariacao } from "@/lib/lotes/preco";
import { cn } from "@/lib/utils";
import { useDic, useIdioma } from "@/lib/i18n/client";

export interface CategoriaOpcao {
  id: string;
  nome: string;
  /** absoluto é oferecido à parte (pergunta), não na lista de categorias */
  tipo: "peso" | "absoluto" | "custom";
  /** classe CBJJ (adulto, master1…) — casa o absoluto com a categoria de peso */
  classeIdade: string;
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
  /** consulta se o CPF já tem conta; ausente quando o atleta já está logado */
  verificarCpf?: (cpf: string) => Promise<boolean>;
  perfil?: {
    nome?: string;
    email?: string;
    dataNascimento?: string;
    sexo?: string;
    faixa?: string;
    academiaId?: string;
    academiaNome?: string;
    pais?: string;
    cpf?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
}

/** id da classe de idade (para traduzir no resumo); nulo se fora das faixas */
function divisaoDaIdade(idade: number): string | null {
  const classe = [...CLASSES_IDADE]
    .reverse()
    .find((c) => idade >= c.idadeMin && (c.idadeMax == null || idade <= c.idadeMax));
  return classe?.id ?? null;
}

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** ordem canônica das classes de idade (kids → adulto → masters) */
const ORDEM_CLASSES = CLASSES_IDADE.map((c) => c.id);

/**
 * Só o trecho de peso do nome da categoria. Dentro do select já se sabe a
 * classe, o sexo e a faixa, então "Adulto / Masculino / Azul / Leve (até 76kg)"
 * vira "Leve (até 76kg)". Nome sem barras (custom) fica inteiro.
 */
const rotuloPeso = (nome: string) => nome.split(" / ").pop() ?? nome;

function BotoesEnvio({
  habilitado,
  enviando,
  aoEnviar,
}: {
  habilitado: boolean;
  /** qual intent foi clicado, para mostrar o spinner no botão certo */
  enviando: "pagar_agora" | "pagar_depois" | null;
  aoEnviar: (intent: "pagar_agora" | "pagar_depois") => void;
}) {
  const { pending } = useFormStatus();
  const di = useDic().inscricao;
  const bloqueado = !habilitado || pending;

  return (
    <div className="flex flex-1 flex-col gap-3 sm:flex-row">
      <button
        type="submit"
        name="intent"
        value="pagar_agora"
        disabled={bloqueado}
        onClick={() => aoEnviar("pagar_agora")}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 px-[26px] py-3 font-cond text-lg font-bold uppercase tracking-[0.04em] transition-colors",
          bloqueado
            ? "cursor-not-allowed bg-brand/30 text-white/50"
            : "cursor-pointer bg-brand text-white hover:bg-[#d5261d]",
        )}
      >
        {pending && enviando === "pagar_agora" && <Spinner className="h-4 w-4" />}
        {pending && enviando === "pagar_agora"
          ? di.enviando
          : `${di.pagarAgora} →`}
      </button>
      <button
        type="submit"
        name="intent"
        value="pagar_depois"
        disabled={bloqueado}
        onClick={() => aoEnviar("pagar_depois")}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 px-[26px] py-3 font-cond text-lg font-bold uppercase tracking-[0.04em] transition-colors",
          bloqueado
            ? "cursor-not-allowed border border-white/12 text-white/40"
            : "cursor-pointer border border-white/25 text-foreground hover:border-white/50",
        )}
      >
        {pending && enviando === "pagar_depois" && <Spinner className="h-4 w-4" />}
        {pending && enviando === "pagar_depois" ? di.salvando : di.pagarDepois}
      </button>
    </div>
  );
}

export function FormInscricao({
  dataEvento,
  categorias,
  evento,
  acao,
  verificarCpf,
  perfil,
}: Props) {
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [email, setEmail] = useState(perfil?.email ?? "");
  const [sexo, setSexo] = useState(perfil?.sexo ?? "");
  const [faixa, setFaixa] = useState(perfil?.faixa ?? "");
  const [nascimento, setNascimento] = useState(perfil?.dataNascimento ?? "");
  const [pais, setPais] = useState(perfil?.pais ?? "BR");
  const [cpf, setCpf] = useState(perfil?.cpf ? formatarCpf(perfil.cpf) : "");
  const [cep, setCep] = useState(perfil?.cep ? formatarCep(perfil.cep) : "");
  const [logradouro, setLogradouro] = useState(perfil?.logradouro ?? "");
  const [numero, setNumero] = useState(perfil?.numero ?? "");
  const [complemento, setComplemento] = useState(perfil?.complemento ?? "");
  const [bairro, setBairro] = useState(perfil?.bairro ?? "");
  const [cidade, setCidade] = useState(perfil?.cidade ?? "");
  const [uf, setUf] = useState(perfil?.uf ?? "");
  const [cepStatus, setCepStatus] = useState<
    "idle" | "carregando" | "nao_encontrado" | "erro"
  >("idle");
  const cepAbortRef = useRef<AbortController | null>(null);
  const ultimoCepRef = useRef("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  // conta já existente para o CPF: bloqueia com modal pedindo login
  const [cpfComConta, setCpfComConta] = useState(false);
  const [cpfChecando, setCpfChecando] = useState(false);
  const cpfCheckadoRef = useRef("");
  const [classeId, setClasseId] = useState<string | null>(null);
  // null = ainda não respondeu; o absoluto é um adicional, cobrado como 2ª inscrição
  const [querAbsoluto, setQuerAbsoluto] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<"pagar_agora" | "pagar_depois" | null>(
    null,
  );
  const { locale, dic } = useIdioma();
  const di = dic.inscricao;
  const nomeFaixa = dic.evento.faixaNomes as Record<string, string>;

  const perfilCompleto = !!(sexo && faixa && nascimento);

  const compativeis = useMemo(() => {
    if (!perfilCompleto) return [];
    const idade = idadeNoAnoDoEvento(nascimento, dataEvento);
    return categorias.filter((c) => categoriaCompativel(c, { sexo, faixa, idade }));
  }, [perfilCompleto, sexo, faixa, nascimento, categorias, dataEvento]);

  // o absoluto sai da lista de categorias e vira uma pergunta à parte
  const pesos = compativeis.filter((c) => c.tipo !== "absoluto");
  const absolutos = compativeis.filter((c) => c.tipo === "absoluto");

  const divisaoId = nascimento
    ? divisaoDaIdade(idadeNoAnoDoEvento(nascimento, dataEvento))
    : null;

  // classes de idade disponíveis, na ordem canônica CBJJ (adulto antes dos
  // masters) — um master pode descer para o adulto, então costuma ter mais de
  // uma opção
  const classes = ORDEM_CLASSES.filter((id) =>
    pesos.some((c) => c.classeIdade === id),
  );
  // sem escolha explícita, vale a classe natural da idade; e com uma só
  // compatível, nem faz sentido pedir para escolher
  const classeEfetiva =
    (classeId && classes.includes(classeId) ? classeId : null) ??
    (divisaoId && classes.includes(divisaoId) ? divisaoId : null) ??
    (classes.length === 1 ? classes[0] : null);

  const pesosDaClasse = pesos.filter((c) => c.classeIdade === classeEfetiva);
  // buscar na classe (e não em `pesos`) invalida sozinho a categoria quando a
  // classe muda por baixo — sem precisar de efeito
  const categoriaEscolhida = pesosDaClasse.find((c) => c.id === categoriaId) ?? null;

  const absolutoEscolhido =
    querAbsoluto && categoriaEscolhida
      ? absolutoDaCategoria(absolutos, categoriaEscolhida.classeIdade)
      : null;
  const divisao = divisaoId
    ? (dic.classesIdade[divisaoId] ?? divisaoId)
    : null;
  // CPF só é exigido para atletas do Brasil (documento nacional); endereço
  // (menos complemento) é obrigatório para todos.
  const ehBrasil = pais === "BR";
  const cpfValido = !ehBrasil || validarCpf(cpf);
  const enderecoCompleto = !!(cep && logradouro && numero && bairro && cidade && uf);
  const podeContinuar = !!(
    nome &&
    email &&
    perfilCompleto &&
    categoriaEscolhida &&
    // com absoluto no evento, sim/não precisa estar respondido
    (absolutos.length === 0 || querAbsoluto !== null) &&
    cpfValido &&
    !cpfComConta &&
    enderecoCompleto
  );

  // Nascimento mora na seção 1 e o aviso aparece na 2 — então ele diz o que
  // falta e, quando o campo está na outra seção, onde procurar.
  const faltando = [
    !nascimento && `${di.nascimento} (${di.emSecao} ${di.secaoPessoais})`,
    !sexo && di.sexo,
    !faixa && di.faixa,
  ].filter((x): x is string => !!x);
  const avisoFaltando = `${di.preenchaPre} ${
    faltando.length > 1
      ? `${faltando.slice(0, -1).join(", ")} ${di.conectorE} ${faltando.at(-1)}`
      : faltando[0]
  } ${di.preenchaPos}`;

  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: evento.moeda,
    maximumFractionDigits: 0,
  });
  // mesmo cálculo da server action, para os dois lados nunca divergirem
  const precoDaCategoria = (c: CategoriaOpcao, ehSegundaInscricao: boolean) =>
    precoInscricaoCentavos({
      categoriaPrecoCentavos: c.precoCentavos,
      grupoPreco: c.grupoPreco,
      loteVariacoes: evento.variacoes,
      lotePrecoCentavos: evento.precoCentavos,
      lotePrecoSegundaCentavos: evento.precoSegundaCentavos,
      ehSegundaInscricao,
    });
  const precoCategoria = categoriaEscolhida
    ? precoDaCategoria(categoriaEscolhida, false)
    : evento.precoCentavos;
  // o absoluto entra como 2ª inscrição — é o preço de segunda do lote
  const precoAbsoluto = absolutoEscolhido
    ? precoDaCategoria(absolutoEscolhido, true)
    : 0;
  // quanto custa somar o absoluto, mesmo antes de escolher a categoria de peso
  const precoAbsolutoPrevisto = absolutos.length
    ? precoDaCategoria(absolutos[0], true)
    : 0;
  const precoTotal = precoCategoria + precoAbsoluto;

  const aoMudarPerfil =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setClasseId(null);
      setCategoriaId(null);
      setQuerAbsoluto(null);
    };

  // Ao completar os 8 dígitos do CEP (só Brasil), consulta o ViaCEP e
  // preenche endereço/bairro/cidade/UF. Número e complemento seguem manuais.
  async function buscarEnderecoPorCep(digitos: string) {
    ultimoCepRef.current = digitos;
    cepAbortRef.current?.abort();
    const ctrl = new AbortController();
    cepAbortRef.current = ctrl;
    setCepStatus("carregando");
    try {
      const end = await buscarCep(digitos, ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (!end) {
        setCepStatus("nao_encontrado");
        return;
      }
      setCepStatus("idle");
      // CEPs "gerais" vêm sem logradouro/bairro; não apagar o que já existe.
      if (end.logradouro) setLogradouro(end.logradouro);
      if (end.bairro) setBairro(end.bairro);
      if (end.cidade) setCidade(end.cidade);
      if (end.uf) setUf(end.uf);
      // leva o foco pro que ainda falta preencher
      document.getElementById("insc-numero")?.focus();
    } catch (e) {
      if (ctrl.signal.aborted || (e as Error)?.name === "AbortError") return;
      setCepStatus("erro");
    }
  }

  /**
   * Assim que o CPF fica válido, pergunta ao servidor se já existe conta. Ter
   * conta e continuar preenchendo daria numa inscrição na conta errada, então
   * a tela para aqui e pede login. Só consulta uma vez por CPF.
   */
  async function aoMudarCpf(valor: string) {
    const formatado = formatarCpf(valor);
    setCpf(formatado);
    const digitos = soDigitos(formatado);
    if (!verificarCpf || !validarCpf(digitos)) {
      cpfCheckadoRef.current = "";
      return;
    }
    if (digitos === cpfCheckadoRef.current) return;
    cpfCheckadoRef.current = digitos;
    setCpfChecando(true);
    try {
      const existe = await verificarCpf(digitos);
      // ignora resposta de um CPF que já não é o digitado
      if (cpfCheckadoRef.current !== digitos) return;
      setCpfComConta(existe);
    } finally {
      setCpfChecando(false);
    }
  }

  function aoMudarCep(valor: string) {
    const formatado = formatarCep(valor);
    setCep(formatado);
    const digitos = soDigitos(formatado);
    if (ehBrasil && digitos.length === 8) {
      if (digitos !== ultimoCepRef.current) buscarEnderecoPorCep(digitos);
    } else {
      ultimoCepRef.current = "";
      if (cepStatus !== "idle") setCepStatus("idle");
    }
  }

  const labelCls =
    "mb-[9px] block font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-2";

  return (
    <div className="grid flex-1 items-stretch lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* PASSO 1 — DADOS */}
      <div className="px-6 py-12 md:px-16">
        <PassosInscricao
          atual={1}
          rotulos={[di.passos.dados, di.passos.pagamento, di.passos.confirmacao]}
        />

        <Eyebrow className="mb-2 tracking-[0.14em]">{di.passo1}</Eyebrow>
        <h1 className="disp mb-1.5 text-[clamp(44px,5vw,64px)]">
          {di.titulo} · {evento.nome}
        </h1>
        <p className="mb-[34px] max-w-[480px] text-base font-medium text-muted-2">
          {di.subtitulo}
        </p>

        <form
          action={async (fd) => {
            setErro(null);
            try {
              await acao(fd);
            } catch (e) {
              // redirect() do Next lança um erro especial que deve propagar
              if (e && typeof e === "object" && "digest" in e) throw e;
              setEnviando(null);
              setErro(e instanceof Error ? e.message : di.erroGenerico);
            }
          }}
          className="flex flex-col gap-6"
        >
          {erro && (
            <p className="border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erro}
            </p>
          )}

          {/* 1 — DADOS PESSOAIS */}
          <Secao numero="1" titulo={di.secaoPessoais}>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {ehBrasil && (
                <Campo id="insc-cpf" rotulo={`${di.cpf} *`}>
                  <Input
                    id="insc-cpf"
                    name="cpf"
                    inputMode="numeric"
                    required
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={cpf}
                    onChange={(e) => aoMudarCpf(e.target.value)}
                    aria-invalid={!!cpf && !cpfValido}
                    aria-busy={cpfChecando}
                  />
                  {cpfChecando && (
                    <p className="mt-1.5 flex items-center gap-1.5 font-cond text-[13px] text-muted-3">
                      <Spinner className="h-3 w-3" /> {di.cpfVerificando}
                    </p>
                  )}
                  {!cpfChecando && !!cpf && !cpfValido && (
                    <p className="mt-1.5 font-cond text-[13px] text-destructive">
                      {di.cpfInvalido}
                    </p>
                  )}
                </Campo>
              )}
              <Campo className="sm:col-span-2" id="insc-nome" rotulo={`${di.nomeCompleto} *`}>
                <Input
                  id="insc-nome"
                  name="nome"
                  required
                  placeholder={di.seuNome}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </Campo>
              <Campo className="xl:col-span-2" id="insc-email" rotulo={`${di.email} *`}>
                <Input
                  id="insc-email"
                  name="email"
                  type="email"
                  required
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Campo>

              <Campo id="insc-nascimento" rotulo={`${di.nascimento} *`}>
                <Input
                  id="insc-nascimento"
                  name="dataNascimento"
                  type="date"
                  required
                  value={nascimento}
                  onChange={(e) => aoMudarPerfil(setNascimento)(e.target.value)}
                />
              </Campo>
              <Campo id="insc-pais" rotulo={`${di.pais} *`}>
                <NativeSelect
                  id="insc-pais"
                  name="pais"
                  required
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                >
                  {PAISES.map((pa) => (
                    <option key={pa.codigo} value={pa.codigo}>
                      {nomePaisLocale(pa.codigo, locale)}
                    </option>
                  ))}
                </NativeSelect>
              </Campo>

              <Campo id="insc-cep" rotulo={`${di.cep} *`}>
                <Input
                  id="insc-cep"
                  name="cep"
                  inputMode="numeric"
                  required
                  placeholder="00000-000"
                  maxLength={9}
                  value={cep}
                  onChange={(e) => aoMudarCep(e.target.value)}
                  aria-busy={cepStatus === "carregando"}
                />
                {cepStatus === "carregando" && (
                  <p className="mt-1.5 flex items-center gap-1.5 font-cond text-[13px] text-muted-3">
                    <Spinner className="h-3 w-3" /> {di.cepBuscando}
                  </p>
                )}
                {cepStatus === "nao_encontrado" && (
                  <p className="mt-1.5 font-cond text-[13px] text-destructive">
                    {di.cepNaoEncontrado}
                  </p>
                )}
                {cepStatus === "erro" && (
                  <p className="mt-1.5 font-cond text-[13px] text-warning-foreground">
                    {di.cepErro}
                  </p>
                )}
              </Campo>
              <Campo
                className="xl:col-span-2"
                id="insc-logradouro"
                rotulo={`${di.logradouro} *`}
              >
                <Input
                  id="insc-logradouro"
                  name="logradouro"
                  required
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                />
              </Campo>
              <Campo id="insc-numero" rotulo={`${di.numero} *`}>
                <Input
                  id="insc-numero"
                  name="numero"
                  required
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </Campo>

              <Campo id="insc-complemento" rotulo={di.complemento}>
                <Input
                  id="insc-complemento"
                  name="complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
              </Campo>
              <Campo className="xl:col-span-2" id="insc-bairro" rotulo={`${di.bairro} *`}>
                <Input
                  id="insc-bairro"
                  name="bairro"
                  required
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
              </Campo>
              <Campo id="insc-cidade" rotulo={`${di.cidade} *`}>
                <Input
                  id="insc-cidade"
                  name="cidade"
                  required
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </Campo>
              <Campo id="insc-uf" rotulo={`${di.uf} *`}>
                <Input
                  id="insc-uf"
                  name="uf"
                  required
                  maxLength={2}
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                />
              </Campo>
            </div>
          </Secao>

          {/* 2 — DADOS DO ATLETA */}
          <Secao numero="2" titulo={di.secaoAtleta}>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <Campo id="insc-sexo" rotulo={`${di.sexo} *`}>
                <NativeSelect
                  id="insc-sexo"
                  name="sexo"
                  required
                  value={sexo}
                  onChange={(e) => aoMudarPerfil(setSexo)(e.target.value)}
                  className={sexo ? "" : "text-muted-3"}
                >
                  <option value="">{di.selecione}</option>
                  <option value="masculino">{di.masculino}</option>
                  <option value="feminino">{di.feminino}</option>
                </NativeSelect>
              </Campo>
              <Campo id="insc-faixa" rotulo={`${di.faixa} *`}>
                <NativeSelect
                  id="insc-faixa"
                  name="faixa"
                  required
                  value={faixa}
                  onChange={(e) => aoMudarPerfil(setFaixa)(e.target.value)}
                  className={faixa ? "" : "text-muted-3"}
                >
                  <option value="">{di.selecione}</option>
                  {FAIXAS.map((f) => (
                    <option key={f} value={f}>
                      {nomeFaixa[f] ?? capitalizar(f)}
                    </option>
                  ))}
                </NativeSelect>
              </Campo>
              <Campo
                className="sm:col-span-1 xl:col-span-2"
                id="insc-academia"
                rotulo={di.academiaEquipe}
              >
                <SeletorAcademia
                  id="insc-academia"
                  name="academiaId"
                  defaultId={perfil?.academiaId}
                  defaultNome={perfil?.academiaNome}
                />
              </Campo>

              {/* ABSOLUTO — antes das categorias: é um adicional, não uma opção
                  da lista, e sai pelo preço de 2ª inscrição do lote */}
              {absolutos.length > 0 && (
                <div className="sm:col-span-2 xl:col-span-4">
                  <span className={labelCls}>{di.absolutoPergunta} *</span>
                  <div className="flex max-w-[420px] gap-2">
                    {(
                      [
                        [true, di.sim],
                        [false, di.nao],
                      ] as const
                    ).map(([valor, rotulo]) => (
                      <button
                        key={rotulo}
                        type="button"
                        onClick={() => setQuerAbsoluto(valor)}
                        className={cn(
                          "flex-1 border px-4 py-3 font-cond text-lg font-semibold uppercase tracking-[0.02em] transition-colors",
                          querAbsoluto === valor
                            ? "border-brand bg-brand text-white"
                            : "border-white/12 bg-raised text-text-2 hover:border-brand/50",
                        )}
                      >
                        {rotulo}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 font-cond text-[13px] text-muted-3">
                    {di.absolutoNota}
                    {precoAbsolutoPrevisto > 0 &&
                      ` · +${fmt.format(precoAbsolutoPrevisto / 100)}`}
                  </p>
                </div>
              )}

              {perfilCompleto && pesos.length > 0 ? (
                <>
                  <Campo
                    className="sm:col-span-1 xl:col-span-2"
                    id="insc-classe"
                    rotulo={`${di.classeIdade} *`}
                  >
                    <NativeSelect
                      id="insc-classe"
                      value={classeEfetiva ?? ""}
                      onChange={(e) => {
                        setClasseId(e.target.value || null);
                        setCategoriaId(null);
                      }}
                      className={classeEfetiva ? "" : "text-muted-3"}
                    >
                      <option value="">{di.selecione}</option>
                      {classes.map((id) => (
                        <option key={id} value={id}>
                          {dic.classesIdade[id] ?? id}
                        </option>
                      ))}
                    </NativeSelect>
                  </Campo>
                  <Campo
                    className="sm:col-span-1 xl:col-span-2"
                    id="insc-categoria"
                    rotulo={`${di.categoriaPeso} *`}
                  >
                    <NativeSelect
                      id="insc-categoria"
                      value={categoriaId ?? ""}
                      onChange={(e) => setCategoriaId(e.target.value || null)}
                      disabled={!classeEfetiva}
                      className={categoriaId ? "" : "text-muted-3"}
                    >
                      <option value="">{di.selecione}</option>
                      {pesosDaClasse.map((c) => (
                        <option key={c.id} value={c.id}>
                          {rotuloPeso(c.nome)} ·{" "}
                          {fmt.format(precoDaCategoria(c, false) / 100)}
                        </option>
                      ))}
                    </NativeSelect>
                  </Campo>
                </>
              ) : (
                <p className="border border-dashed border-white/16 p-5 font-cond text-[13px] text-muted-3 sm:col-span-2 xl:col-span-4">
                  {perfilCompleto ? di.semCategoriaCompat : avisoFaltando}
                </p>
              )}
            </div>

            <input type="hidden" name="categoriaId" value={categoriaId ?? ""} />
            <input
              type="hidden"
              name="absolutoId"
              value={absolutoEscolhido?.id ?? ""}
            />
          </Secao>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <Link
              href={`/evento/${evento.slug}`}
              className="flex items-center justify-center border border-white/18 px-[26px] py-3 font-cond text-[17px] font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/40"
            >
              {di.voltar}
            </Link>
            <BotoesEnvio
              habilitado={podeContinuar}
              enviando={enviando}
              aoEnviar={setEnviando}
            />
          </div>
        </form>
      </div>

      {cpfComConta && (
        <ModalContaExiste
          slug={evento.slug}
          aoFechar={() => {
            setCpfComConta(false);
            setCpf("");
            cpfCheckadoRef.current = "";
          }}
        />
      )}

      {/* RESUMO */}
      <ResumoEvento
        nomeEvento={evento.nome}
        meta={evento.meta}
        badge={evento.badge}
        bannerUrl={evento.bannerUrl}
        linhas={[
          { k: di.resumo.atleta, v: nome || null },
          {
            k: di.resumo.faixa,
            v: faixa ? (nomeFaixa[faixa] ?? capitalizar(faixa)) : null,
            dourado: true,
          },
          { k: di.resumo.divisao, v: divisao },
          {
            k: di.resumo.categoria,
            v: categoriaEscolhida?.nome ?? null,
            dourado: true,
          },
          ...(absolutos.length
            ? [
                {
                  k: di.resumo.absoluto,
                  v:
                    querAbsoluto === null
                      ? null
                      : querAbsoluto
                        ? `${di.sim} · +${fmt.format((precoAbsoluto || precoAbsolutoPrevisto) / 100)}`
                        : di.nao,
                  dourado: querAbsoluto === true,
                },
              ]
            : []),
        ]}
        precoRotulo={di.resumo.taxaInscricao}
        precoValor={fmt.format(precoTotal / 100)}
        notaRodape={
          evento.precoSegundaCentavos != null
            ? `${di.segundaCategoria}: +${fmt.format(evento.precoSegundaCentavos / 100)} · ${di.viaPix}`
            : di.viaPix
        }
      />
    </div>
  );
}

/** Bloco numerado do formulário (1 · Dados pessoais, 2 · Dados do atleta). */
function Secao({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-white/10 bg-surface p-6 md:p-7">
      <div className="mb-6 flex items-center gap-3 border-b border-white/8 pb-4">
        <span className="disp flex h-8 w-8 shrink-0 items-center justify-center bg-brand text-[20px] leading-none text-white">
          {numero}
        </span>
        <h2 className="disp text-[26px]">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

/** Rótulo + campo, empilhados — evita repetir a casca em cada um. */
function Campo({
  id,
  rotulo,
  className,
  children,
}: {
  id: string;
  rotulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label
        className="mb-[9px] block font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-2"
        htmlFor={id}
      >
        {rotulo}
      </label>
      {children}
    </div>
  );
}

/**
 * CPF já cadastrado: a inscrição para aqui. Continuar preencheria dados de uma
 * pessoa que já tem conta e gravaria a inscrição numa conta nova e paralela —
 * então as saídas são entrar (voltando para esta mesma inscrição) ou corrigir
 * o CPF.
 */
function ModalContaExiste({
  slug,
  aoFechar,
}: {
  slug: string;
  aoFechar: () => void;
}) {
  const di = useDic().inscricao;
  const tituloId = useId();
  const descId = useId();
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", onKey);
    fecharRef.current?.focus();
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [aoFechar]);

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4 animate-[fade-in_0.18s_ease]"
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descId}
        className="relative w-[min(440px,94vw)] border border-white/10 bg-surface animate-[pop-in_0.18s_cubic-bezier(0.16,1,0.3,1)]"
      >
        <span className="absolute inset-x-0 top-0 h-[3px] bg-brand" />
        <div className="p-6">
          <h2 id={tituloId} className="disp text-[26px] leading-none">
            {di.cpfContaTitulo}
          </h2>
          <p
            id={descId}
            className="mt-3 text-sm leading-normal text-muted-2"
          >
            {di.cpfContaDesc}
          </p>
          <div className="mt-6 flex gap-2.5">
            <button
              ref={fecharRef}
              type="button"
              onClick={aoFechar}
              className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center border border-white/16 px-4 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-text-2 transition-colors hover:border-white/35 hover:text-foreground"
            >
              {di.cpfContaFechar}
            </button>
            <Link
              href={`/entrar?next=${encodeURIComponent(`/evento/${slug}/inscricao`)}`}
              className="inline-flex h-10 flex-1 items-center justify-center bg-brand px-4 font-cond text-sm font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]"
            >
              {di.cpfContaBotao}
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

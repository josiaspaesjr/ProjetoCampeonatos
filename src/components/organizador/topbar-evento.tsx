"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CamposDataEvento } from "@/components/organizador/campos-data-evento";
import { RegulamentoCampos } from "@/components/organizador/regulamento-campos";
import { useNavMobile } from "@/components/organizador/nav-mobile-context";
import { useDic } from "@/lib/i18n/client";
import { Spinner } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export interface EventoEditavel {
  id: string;
  nome: string;
  slug: string;
  status: string;
  circuito: string;
  dataInicio: string;
  inscricoesFecham: string; // datetime-local ou ""
  cidade: string;
  uf: string;
  moeda: string;
  endereco: string;
  bannerUrl: string;
  modalidade: string;
  dataPesagem: string;
  dataGeracaoChaves: string;
  descricao: string;
  regulamento: Record<string, string>;
}

/** sufixo da rota → chave em dic.admin.nav (título da topbar) */
const SUFIXO_TITULO: [string, string][] = [
  ["/inscricoes", "inscricoes"],
  ["/categorias", "categorias"],
  ["/lotes", "lotesInscricao"],
  ["/areas", "areas"],
  ["/checkin", "checkin"],
  ["/chaves", "chaves"],
];

function BotaoSalvar() {
  const { pending } = useFormStatus();
  const c = useDic().admin.comum;
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-[46px] flex-[2] cursor-pointer items-center justify-center gap-2 bg-brand font-cond text-base font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d] disabled:opacity-60"
    >
      {pending && <Spinner className="h-3.5 w-3.5" />}
      {pending ? c.salvando : c.salvarAlteracoes}
    </button>
  );
}

/** Top bar do console + drawer lateral "Editar evento" (rascunho → salvar). */
export function TopbarEvento({
  evento,
  editar,
}: {
  evento: EventoEditavel;
  editar: (formData: FormData) => Promise<void>;
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  // key força o form a recriar (descarta o rascunho) a cada abertura
  const [geracao, setGeracao] = useState(0);
  const { setAberto: setMenuAberto } = useNavMobile();
  const dic = useDic().admin;
  const { campos, nav, comum, editar: ed } = dic;

  const chaveTitulo = SUFIXO_TITULO.find(([sufixo]) =>
    pathname.includes(sufixo),
  )?.[1];
  const titulo = chaveTitulo
    ? nav[chaveTitulo as keyof typeof nav]
    : nav.overview;

  const abrir = () => {
    setGeracao((g) => g + 1);
    setAberto(true);
  };

  const labelCls =
    "font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-2";

  return (
    <>
      <div className="sticky top-[57px] z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-white/8 bg-[#0A0A0B]/90 px-6 py-[18px] backdrop-blur-xl md:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label={comum.abrirMenu}
            className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[5px] border border-white/16 transition-colors hover:border-white/35 lg:hidden"
          >
            <span className="block h-[2px] w-5 bg-foreground" />
            <span className="block h-[2px] w-5 bg-foreground" />
            <span className="block h-[2px] w-5 bg-foreground" />
          </button>
          {/* line-height maior que o padrão do Teko para não cortar acentos
              dentro do truncate */}
          <h1
            className="disp truncate whitespace-nowrap text-[26px] md:text-[34px]"
            style={{ lineHeight: 1.15 }}
          >
            {titulo}
          </h1>
          <span className="hidden h-[22px] shrink-0 items-center border border-brand/50 bg-brand/14 px-2.5 font-cond text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-soft sm:inline-flex">
            {dic.status[evento.status] ?? evento.status}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 font-cond text-sm font-semibold uppercase tracking-[0.04em]">
          <Link
            href={`/evento/${evento.slug}`}
            target="_blank"
            className="inline-flex h-[38px] items-center border border-white/16 px-3 transition-colors hover:border-white/35 md:px-3.5"
          >
            <span className="hidden sm:inline">{ed.verPagina}&nbsp;</span>↗
          </Link>
          <button
            onClick={abrir}
            className="h-[38px] cursor-pointer border border-white/20 px-3 font-cond text-sm font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/40 md:px-3.5"
          >
            ✎<span className="hidden sm:inline">&nbsp;{ed.editarEvento}</span>
          </button>
        </div>
      </div>

      {/* DRAWER EDITAR EVENTO */}
      {aberto && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/60 animate-[fade-in_0.2s_ease]"
            onClick={() => setAberto(false)}
          />
          <div className="fixed right-0 top-0 z-[101] flex h-screen w-[min(480px,94vw)] flex-col border-l border-white/10 bg-[#0F0F10] animate-[drawer-in_0.28s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center justify-between border-b border-white/8 px-[26px] py-[22px]">
              <div>
                <div className="font-cond text-[13px] font-semibold uppercase tracking-[0.12em] text-brand">
                  {ed.eyebrow}
                </div>
                <div className="disp text-[34px]">{ed.titulo}</div>
              </div>
              <button
                onClick={() => setAberto(false)}
                className="h-[38px] w-[38px] cursor-pointer border border-white/16 text-lg text-foreground transition-colors hover:border-white/35"
                aria-label={comum.fechar}
              >
                ✕
              </button>
            </div>

            <form
              key={geracao}
              action={async (fd) => {
                await editar(fd);
                setAberto(false);
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-[26px] py-6">
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>{campos.nomeEvento}</label>
                  <Input name="nome" required defaultValue={evento.nome} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>{campos.circuito}</label>
                  <Input name="circuito" defaultValue={evento.circuito} />
                </div>
                <CamposDataEvento
                  gridClassName="grid grid-cols-1 gap-3.5 sm:grid-cols-2"
                  labelCls={labelCls}
                  fechamLabel={campos.inscricoesFecham}
                  defaultDataInicio={evento.dataInicio}
                  defaultInscricoesFecham={evento.inscricoesFecham}
                />
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1fr_80px_130px]">
                  <div className="flex flex-col gap-2">
                    <label className={labelCls}>{campos.cidade}</label>
                    <Input name="cidade" defaultValue={evento.cidade} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={labelCls}>{campos.uf}</label>
                    <Input
                      name="uf"
                      maxLength={2}
                      defaultValue={evento.uf}
                      className="uppercase"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={labelCls}>{campos.moeda}</label>
                    <NativeSelect name="moeda" defaultValue={evento.moeda}>
                      <option value="BRL">BRL</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </NativeSelect>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>{campos.endereco}</label>
                  <Input name="endereco" defaultValue={evento.endereco} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>{campos.imagemCapa}</label>
                  <Input
                    name="bannerUrl"
                    type="url"
                    defaultValue={evento.bannerUrl}
                  />
                </div>

                <div className="mt-2 border-t border-white/8 pt-4 font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-brand">
                  {campos.detalhesCompeticao}
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>{campos.modalidade}</label>
                  <NativeSelect
                    name="modalidade"
                    defaultValue={evento.modalidade}
                  >
                    <option value="gi_nogi">Gi + No-Gi</option>
                    <option value="gi">Gi</option>
                    <option value="nogi">No-Gi</option>
                  </NativeSelect>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>{campos.dataPesagem}</label>
                  <Input
                    name="dataPesagem"
                    type="date"
                    defaultValue={evento.dataPesagem}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>{campos.dataGeracaoChaves}</label>
                  <Input
                    name="dataGeracaoChaves"
                    type="date"
                    defaultValue={evento.dataGeracaoChaves}
                  />
                  <p className="text-xs font-medium text-muted-3">
                    {campos.dataGeracaoNota}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>{campos.descricao}</label>
                  <Textarea
                    name="descricao"
                    rows={5}
                    defaultValue={evento.descricao}
                  />
                </div>

                <div className="mt-2 border-t border-white/8 pt-4">
                  <div className="mb-3 font-cond text-[13px] font-semibold uppercase tracking-[0.1em] text-brand">
                    {campos.regulamento}
                  </div>
                  <RegulamentoCampos valores={evento.regulamento} />
                </div>
              </div>

              <div className="flex gap-3 border-t border-white/8 px-[26px] py-[18px]">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="h-[46px] flex-1 cursor-pointer border border-white/18 font-cond text-base font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/40"
                >
                  {comum.cancelar}
                </button>
                <BotaoSalvar />
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}

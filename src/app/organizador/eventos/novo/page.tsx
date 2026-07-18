import Link from "next/link";
import { SkewTexto } from "@/components/marca";
import { CamposDataEvento } from "@/components/organizador/campos-data-evento";
import { RegulamentoCampos } from "@/components/organizador/regulamento-campos";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { getDicionario } from "@/lib/i18n/server";
import { criarEvento } from "../actions";

const labelCls =
  "font-cond text-sm font-semibold uppercase tracking-[0.08em] text-muted-2";

function Obrigatorio() {
  return <span className="text-brand">*</span>;
}

export default async function NovoEvento() {
  const dic = await getDicionario();
  const dc = dic.admin.campos;
  const dn = dic.admin.novo;
  return (
    <div className="mx-auto w-full max-w-[900px] px-6 pb-[90px] pt-11 md:px-12">
      <Link
        href="/organizador"
        className="mb-[26px] inline-flex items-center gap-2 font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2 transition-colors hover:text-foreground"
      >
        ← {dn.voltar}
      </Link>

      <div className="relative mb-10 overflow-hidden">
        <div className="disp pointer-events-none absolute -top-4 left-0 text-[72px] text-white/4 sm:-top-8 sm:text-[110px]">
          {dn.deco}
        </div>
        <div className="relative mb-1 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
          {dn.criarEvento}
        </div>
        <h1 className="disp relative text-[clamp(40px,11vw,72px)]">
          {dn.configureEtapa}
        </h1>
        <p className="relative mt-1.5 max-w-[520px] text-base font-medium text-muted-2">
          {dn.subtitulo}
        </p>
      </div>

      <form action={criarEvento} className="flex flex-col gap-[26px]">
        <div className="flex flex-col gap-[9px]">
          <label className={labelCls} htmlFor="ev-banner">
            {dc.imagemCapa}
          </label>
          <Input
            id="ev-banner"
            name="bannerUrl"
            type="url"
            placeholder={dc.bannerPlaceholder}
            className="h-12"
          />
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className={labelCls} htmlFor="ev-nome">
            {dc.nomeEvento} <Obrigatorio />
          </label>
          <Input
            id="ev-nome"
            name="nome"
            required
            placeholder={dc.nomePlaceholder}
            className="h-12"
          />
        </div>

        <CamposDataEvento
          labelCls={labelCls}
          inputClassName="h-12"
          fechamLabel={dc.inscricoesFechamEm}
        />

        <div className="grid gap-[18px] sm:grid-cols-[1fr_90px_220px]">
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-cidade">
              {dc.cidade}
            </label>
            <Input
              id="ev-cidade"
              name="cidade"
              placeholder={dc.cidadePlaceholder}
              className="h-12"
            />
          </div>
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-uf">
              {dc.uf}
            </label>
            <Input
              id="ev-uf"
              name="uf"
              maxLength={2}
              placeholder="SP"
              className="h-12 uppercase"
            />
          </div>
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-moeda">
              {dc.moeda}
            </label>
            <NativeSelect id="ev-moeda" name="moeda" defaultValue="BRL" className="h-12">
              <option value="BRL">{dic.admin.moedas.brl}</option>
              <option value="USD">{dic.admin.moedas.usd}</option>
              <option value="EUR">{dic.admin.moedas.eur}</option>
            </NativeSelect>
          </div>
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className={labelCls} htmlFor="ev-endereco">
            {dc.endereco}
          </label>
          <Input
            id="ev-endereco"
            name="endereco"
            placeholder={dc.enderecoPlaceholder}
            className="h-12"
          />
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className={labelCls} htmlFor="ev-descricao">
            {dc.descricao}
          </label>
          <Textarea
            id="ev-descricao"
            name="descricao"
            rows={5}
            placeholder={dc.descricaoPlaceholder}
          />
        </div>

        {/* DETALHES DA COMPETIÇÃO */}
        <div className="mt-3.5 border-t border-white/8 pt-[22px] font-cond text-[15px] font-semibold uppercase tracking-[0.1em] text-brand">
          {dc.detalhesCompeticao}
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className={labelCls} htmlFor="ev-circuito">
            {dc.circuito}
          </label>
          <Input
            id="ev-circuito"
            name="circuito"
            placeholder={dc.circuitoPlaceholder}
            className="h-12"
          />
        </div>

        <div className="grid gap-[18px] sm:grid-cols-2">
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-modalidade">
              {dc.modalidade}
            </label>
            <NativeSelect
              id="ev-modalidade"
              name="modalidade"
              defaultValue="gi_nogi"
              className="h-12"
            >
              <option value="gi_nogi">{dic.evento.modalidades.gi_nogi}</option>
              <option value="gi">{dic.evento.modalidades.gi}</option>
              <option value="nogi">{dic.evento.modalidades.nogi}</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-pesagem">
              {dc.dataPesagem}
            </label>
            <Input id="ev-pesagem" name="dataPesagem" type="date" className="h-12" />
          </div>
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-geracao-chaves">
              {dc.dataGeracaoChaves}
            </label>
            <Input
              id="ev-geracao-chaves"
              name="dataGeracaoChaves"
              type="date"
              className="h-12"
            />
            <p className="text-[13px] font-medium text-muted-3">
              {dc.dataGeracaoNota}
            </p>
          </div>
        </div>

        {/* REGULAMENTO */}
        <div className="mt-3.5 border-t border-white/8 pt-[22px]">
          <div className="font-cond text-[15px] font-semibold uppercase tracking-[0.1em] text-brand">
            {dc.regulamento}
          </div>
          <p className="mt-1 mb-4 max-w-[560px] text-sm font-medium text-muted-2">
            {dn.regulamentoNota}
          </p>
          <RegulamentoCampos />
        </div>

        {/* AVISO */}
        <div className="mt-1.5 flex items-start gap-3 border border-brand/35 bg-brand/6 px-[18px] py-4">
          <span className="mt-1.5 h-2 w-2 shrink-0 -skew-x-9 bg-brand" />
          <p className="text-[15px] font-medium leading-normal text-text-2">
            {dn.avisoPre}{" "}
            <strong className="font-semibold text-foreground">
              {dn.avisoBold}
            </strong>{" "}
            {dn.avisoFim}
          </p>
        </div>

        {/* AÇÕES */}
        <div className="mt-1.5 flex justify-end gap-3.5 border-t border-white/8 pt-[26px]">
          <Link
            href="/organizador"
            className="inline-flex h-[50px] items-center border border-white/18 px-[26px] font-cond text-lg font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/40"
          >
            {dn.cancelar}
          </Link>
          <BotaoAcaoBruto className="inline-flex h-[50px] -skew-x-9 items-center bg-brand px-[30px] font-cond text-[19px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]">
            <SkewTexto>{dn.criarEventoBtn}</SkewTexto>
          </BotaoAcaoBruto>
        </div>
      </form>
    </div>
  );
}

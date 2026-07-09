import Link from "next/link";
import { SkewTexto } from "@/components/marca";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { criarEvento } from "../actions";

const labelCls =
  "font-cond text-sm font-semibold uppercase tracking-[0.08em] text-muted-2";

function Obrigatorio() {
  return <span className="text-brand">*</span>;
}

export default function NovoEvento() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-6 pb-[90px] pt-11 md:px-12">
      <Link
        href="/organizador"
        className="mb-[26px] inline-flex items-center gap-2 font-cond text-[15px] uppercase tracking-[0.06em] text-muted-2 transition-colors hover:text-foreground"
      >
        ← Voltar
      </Link>

      <div className="relative mb-10">
        <div className="disp pointer-events-none absolute -top-8 left-0 text-[110px] text-white/4">
          NOVO
        </div>
        <div className="relative mb-1 font-cond text-base font-semibold uppercase tracking-[0.14em] text-brand">
          Criar evento
        </div>
        <h1 className="disp relative text-[72px]">Configure sua etapa</h1>
        <p className="relative mt-1.5 max-w-[520px] text-base font-medium text-muted-2">
          Informações básicas do evento. Lotes, categorias, áreas e chaves você
          configura depois no painel.
        </p>
      </div>

      <form action={criarEvento} className="flex flex-col gap-[26px]">
        <div className="flex flex-col gap-[9px]">
          <label className={labelCls} htmlFor="ev-banner">
            Imagem de capa (URL)
          </label>
          <Input
            id="ev-banner"
            name="bannerUrl"
            type="url"
            placeholder="https://… (banner do evento)"
            className="h-12"
          />
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className={labelCls} htmlFor="ev-nome">
            Nome do evento <Obrigatorio />
          </label>
          <Input
            id="ev-nome"
            name="nome"
            required
            placeholder="Copa Cidade de Jiu-Jitsu 2026"
            className="h-12"
          />
        </div>

        <div className="grid gap-[18px] sm:grid-cols-2">
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-data">
              Data do evento <Obrigatorio />
            </label>
            <Input id="ev-data" type="date" name="dataInicio" required className="h-12" />
          </div>
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-fecham">
              Inscrições fecham em
            </label>
            <Input
              id="ev-fecham"
              type="datetime-local"
              name="inscricoesFecham"
              className="h-12"
            />
          </div>
        </div>

        <div className="grid gap-[18px] sm:grid-cols-[1fr_90px_220px]">
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-cidade">
              Cidade
            </label>
            <Input id="ev-cidade" name="cidade" placeholder="São Paulo" className="h-12" />
          </div>
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-uf">
              UF
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
              Moeda
            </label>
            <NativeSelect id="ev-moeda" name="moeda" defaultValue="BRL" className="h-12">
              <option value="BRL">BRL — Real (Pix)</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </NativeSelect>
          </div>
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className={labelCls} htmlFor="ev-endereco">
            Endereço / ginásio
          </label>
          <Input
            id="ev-endereco"
            name="endereco"
            placeholder="Ginásio do Ibirapuera — Av. Pedro Álvares Cabral, s/n"
            className="h-12"
          />
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className={labelCls} htmlFor="ev-descricao">
            Descrição
          </label>
          <Textarea
            id="ev-descricao"
            name="descricao"
            rows={5}
            placeholder="Modalidades, regulamento, cronograma, premiação…"
          />
        </div>

        {/* DETALHES DA COMPETIÇÃO */}
        <div className="mt-3.5 border-t border-white/8 pt-[22px] font-cond text-[15px] font-semibold uppercase tracking-[0.1em] text-brand">
          Detalhes da competição
        </div>

        <div className="flex flex-col gap-[9px]">
          <label className={labelCls} htmlFor="ev-circuito">
            Circuito / temporada
          </label>
          <Input
            id="ev-circuito"
            name="circuito"
            placeholder="Circuito Nacional 2026"
            className="h-12"
          />
        </div>

        <div className="grid gap-[18px] sm:grid-cols-[1fr_140px_1fr]">
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-modalidade">
              Modalidade
            </label>
            <NativeSelect
              id="ev-modalidade"
              name="modalidade"
              defaultValue="gi_nogi"
              className="h-12"
            >
              <option value="gi_nogi">Gi + No-Gi</option>
              <option value="gi">Gi</option>
              <option value="nogi">No-Gi</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-areas">
              Nº de áreas
            </label>
            <Input
              id="ev-areas"
              name="numAreas"
              type="number"
              min={1}
              placeholder="8"
              className="h-12"
            />
          </div>
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-pesagem">
              Data da pesagem
            </label>
            <Input id="ev-pesagem" name="dataPesagem" type="date" className="h-12" />
          </div>
        </div>

        <div className="grid gap-[18px] sm:grid-cols-2">
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-faixa-min">
              Faixa mínima
            </label>
            <NativeSelect
              id="ev-faixa-min"
              name="faixaMin"
              defaultValue="branca"
              className="h-12"
            >
              <option value="branca">Branca</option>
              <option value="cinza">Cinza</option>
              <option value="amarela">Amarela</option>
              <option value="laranja">Laranja</option>
              <option value="verde">Verde</option>
              <option value="azul">Azul</option>
              <option value="roxa">Roxa</option>
              <option value="marrom">Marrom</option>
              <option value="preta">Preta</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-[9px]">
            <label className={labelCls} htmlFor="ev-faixa-max">
              Faixa máxima
            </label>
            <NativeSelect
              id="ev-faixa-max"
              name="faixaMax"
              defaultValue="preta"
              className="h-12"
            >
              <option value="preta">Preta</option>
              <option value="marrom">Marrom</option>
              <option value="roxa">Roxa</option>
              <option value="azul">Azul</option>
              <option value="verde">Verde</option>
              <option value="laranja">Laranja</option>
              <option value="amarela">Amarela</option>
              <option value="cinza">Cinza</option>
              <option value="branca">Branca</option>
            </NativeSelect>
          </div>
        </div>

        {/* AVISO */}
        <div className="mt-1.5 flex items-start gap-3 border border-brand/35 bg-brand/6 px-[18px] py-4">
          <span className="mt-1.5 h-2 w-2 shrink-0 -skew-x-9 bg-brand" />
          <p className="text-[15px] font-medium leading-normal text-text-2">
            Configurações avançadas —{" "}
            <strong className="font-semibold text-foreground">
              lotes de inscrição, categorias, áreas e chaveamento
            </strong>{" "}
            — ficam disponíveis no painel do organizador logo após criar o
            evento.
          </p>
        </div>

        {/* AÇÕES */}
        <div className="mt-1.5 flex justify-end gap-3.5 border-t border-white/8 pt-[26px]">
          <Link
            href="/organizador"
            className="inline-flex h-[50px] items-center border border-white/18 px-[26px] font-cond text-lg font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/40"
          >
            Cancelar
          </Link>
          <BotaoAcaoBruto className="inline-flex h-[50px] -skew-x-9 items-center bg-brand px-[30px] font-cond text-[19px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]">
            <SkewTexto>Criar evento →</SkewTexto>
          </BotaoAcaoBruto>
        </div>
      </form>
    </div>
  );
}

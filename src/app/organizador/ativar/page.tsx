import Link from "next/link";
import { redirect } from "next/navigation";
import { SkewTexto } from "@/components/marca";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { getUsuarioSessao } from "@/lib/auth";
import { supabaseConfigurado } from "@/lib/supabase/server";
import { getDicionario } from "@/lib/i18n/server";
import { tornarOrganizador } from "./actions";

/**
 * Tela de promoção explícita. Uma conta de atleta que tenta abrir o painel
 * do organizador cai aqui (via getOrganizadorAtual) e decide ativar o acesso.
 * Não usa getUsuarioAtual para não criar loop de redirecionamento.
 */
export default async function AtivarOrganizador() {
  if (!supabaseConfigurado()) redirect("/organizador");
  const usuario = await getUsuarioSessao();
  if (!usuario) redirect("/entrar?next=/organizador");
  if (usuario.ehOrganizador) redirect("/organizador");

  const a = (await getDicionario()).admin.ativarOrg;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-16">
      <div className="relative overflow-hidden border border-white/12 bg-surface p-8 md:p-11">
        <div className="absolute left-0 top-0 h-full w-[5px] bg-brand" />
        <div className="mb-2 font-cond text-[15px] font-semibold uppercase tracking-[0.12em] text-brand">
          {a.eyebrow}
        </div>
        <h1 className="disp text-[clamp(40px,6vw,64px)]">{a.titulo}</h1>
        <p className="mt-4 max-w-[520px] text-[16px] font-medium leading-normal text-text-2">
          {a.desc}
        </p>
        <form
          action={tornarOrganizador}
          className="mt-8 flex flex-wrap items-center gap-4"
        >
          <BotaoAcaoBruto className="flex h-[52px] -skew-x-9 items-center justify-center bg-brand px-8 font-cond text-lg font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]">
            <SkewTexto>{a.ativar}</SkewTexto>
          </BotaoAcaoBruto>
          <Link
            href="/"
            className="font-cond text-sm uppercase tracking-[0.06em] text-muted-3 transition-colors hover:text-foreground"
          >
            {a.voltar}
          </Link>
        </form>
      </div>
    </div>
  );
}

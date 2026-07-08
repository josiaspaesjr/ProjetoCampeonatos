import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { supabaseConfigurado } from "@/lib/supabase/server";
import { cadastrar, entrar } from "./actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none";

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  if (!supabaseConfigurado()) redirect("/");
  const { next = "/", erro } = await searchParams;

  return (
    <PublicShell>
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8">
        {erro && (
          <p className="col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        <form action={entrar} className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h1 className="text-lg font-bold">Entrar</h1>
          <input type="hidden" name="next" value={next} />
          <label className="mt-4 block">
            <span className="text-sm font-medium">E-mail</span>
            <input name="email" type="email" required className={inputCls} />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-medium">Senha</span>
            <input name="senha" type="password" required className={inputCls} />
          </label>
          <button className="mt-5 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
            Entrar
          </button>
        </form>

        <form action={cadastrar} className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h1 className="text-lg font-bold">Criar conta</h1>
          <input type="hidden" name="next" value={next} />
          <label className="mt-4 block">
            <span className="text-sm font-medium">Nome completo</span>
            <input name="nome" required className={inputCls} />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-medium">E-mail</span>
            <input name="email" type="email" required className={inputCls} />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-medium">Senha (mín. 6 caracteres)</span>
            <input name="senha" type="password" required minLength={6} className={inputCls} />
          </label>
          <button className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500">
            Criar conta
          </button>
        </form>
      </div>
    </PublicShell>
  );
}

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { usuarios } from "@/db/schema";
import { Logo } from "@/components/marca";
import { BotaoAcaoBruto } from "@/components/ui/botao-acao";
import { Input } from "@/components/ui/input";
import { getCadastroPendente } from "@/lib/sessao";
import { getDicionario } from "@/lib/i18n/server";
import { criarSenha } from "./actions";

/**
 * Último passo de quem se inscreveu sem conta: escolher a senha.
 *
 * A inscrição já está gravada e a conta já existe em `usuarios` — falta só o
 * login. Por isso a tela não pede nada de novo: mostra o e-mail que a pessoa
 * informou e pede a senha. Sem o bilhete de cadastro pendente, não há o que
 * fazer aqui.
 */
export default async function PaginaCriarSenha({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next = "/minhas-inscricoes", erro } = await searchParams;
  const dic = await getDicionario();
  const ds = dic.criarSenha;

  const pendenteId = await getCadastroPendente();
  if (!pendenteId) redirect(`/entrar?next=${encodeURIComponent(next)}`);

  const db = await getDb();
  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, pendenteId),
    columns: { email: true, nome: true, authId: true },
  });
  if (!usuario || usuario.authId) {
    redirect(`/entrar?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className="flex items-center justify-between border-b border-white/7 px-6 py-4 md:px-12">
        <Logo />
      </nav>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-1.5 font-cond text-[13px] font-semibold uppercase tracking-[0.14em] text-brand">
            {ds.eyebrow}
          </div>
          <h1 className="disp text-[clamp(36px,5vw,52px)]">{ds.titulo}</h1>
          <p className="mt-3 text-base font-medium leading-normal text-muted-2">
            {ds.desc}
          </p>

          <div className="mt-6 border border-white/10 bg-surface px-4 py-3">
            <div className="font-cond text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-3">
              {ds.suaConta}
            </div>
            <div className="mt-0.5 truncate font-cond text-base">
              {usuario.email}
            </div>
          </div>

          {erro && (
            <p className="mt-5 border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erro}
            </p>
          )}

          <form action={criarSenha} className="mt-5 flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <div>
              <label
                className="mb-[9px] block font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-2"
                htmlFor="senha"
              >
                {ds.senha} *
              </label>
              <Input
                id="senha"
                name="senha"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label
                className="mb-[9px] block font-cond text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-2"
                htmlFor="confirmacao"
              >
                {ds.confirmar} *
              </label>
              <Input
                id="confirmacao"
                name="confirmacao"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>
            <BotaoAcaoBruto className="mt-1 flex h-[52px] w-full cursor-pointer items-center justify-center bg-brand font-cond text-lg font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#d5261d]">
              {ds.botao}
            </BotaoAcaoBruto>
          </form>
        </div>
      </main>
    </div>
  );
}

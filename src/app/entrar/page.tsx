import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabaseConfigurado } from "@/lib/supabase/server";
import { cadastrar, entrar } from "./actions";

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
          <p className="col-span-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erro}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entrar</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={entrar} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <label className="block">
                <span className="text-sm font-medium">E-mail</span>
                <Input name="email" type="email" required className="mt-1" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Senha</span>
                <Input name="senha" type="password" required className="mt-1" />
              </label>
              <Button className="mt-2 w-full">Entrar</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Criar conta</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={cadastrar} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <label className="block">
                <span className="text-sm font-medium">Nome completo</span>
                <Input name="nome" required className="mt-1" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">E-mail</span>
                <Input name="email" type="email" required className="mt-1" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Senha (mín. 6 caracteres)</span>
                <Input name="senha" type="password" required minLength={6} className="mt-1" />
              </label>
              <Button variant="success" className="mt-2 w-full">
                Criar conta
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  );
}

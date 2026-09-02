"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { usuarios } from "@/db/schema";
import { getCadastroPendente, limparCadastroPendente } from "@/lib/sessao";
import { criarClienteSupabase } from "@/lib/supabase/server";

function destinoSeguro(next: string | null): string {
  return next && next.startsWith("/") ? next : "/minhas-inscricoes";
}

/**
 * Fecha o cadastro de quem se inscreveu sem conta: cria o login no Supabase
 * com o e-mail que a pessoa já informou na inscrição e a senha que ela escolhe
 * aqui. A linha em `usuarios` (com nome, CPF, endereço…) já existe; o primeiro
 * acesso a vincula pelo e-mail em `getUsuarioSessao`.
 *
 * Só funciona com o bilhete de cadastro pendente no cookie e para conta que
 * ainda não tem login — não é caminho para trocar senha de conta existente.
 */
export async function criarSenha(formData: FormData) {
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");
  const next = destinoSeguro(formData.get("next") as string | null);
  const voltar = (msg: string) =>
    redirect(
      `/criar-senha?next=${encodeURIComponent(next)}&erro=${encodeURIComponent(msg)}`,
    );

  const pendenteId = await getCadastroPendente();
  if (!pendenteId) redirect(`/entrar?next=${encodeURIComponent(next)}`);

  const db = await getDb();
  const usuario = await db.query.usuarios.findFirst({
    where: eq(usuarios.id, pendenteId),
  });
  if (!usuario) {
    await limparCadastroPendente();
    redirect(`/entrar?next=${encodeURIComponent(next)}`);
  }
  // já tem login: nada a criar aqui
  if (usuario.authId) {
    await limparCadastroPendente();
    redirect(`/entrar?next=${encodeURIComponent(next)}`);
  }

  if (senha.length < 6) voltar("A senha precisa de pelo menos 6 caracteres");
  if (senha !== confirmacao) voltar("As senhas não conferem");

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: usuario.email,
    password: senha,
    options: { data: { nome: usuario.nome, tipo: "atleta" } },
  });
  if (error) voltar(error.message);
  // proteção contra enumeração: signUp não erra, devolve identities vazio
  if (data.user && data.user.identities?.length === 0) {
    await limparCadastroPendente();
    redirect(
      `/entrar?next=${encodeURIComponent(next)}&erro=${encodeURIComponent(
        "Você já tem uma conta com esse e-mail. Entre para ver sua inscrição.",
      )}`,
    );
  }

  await limparCadastroPendente();
  redirect(next);
}

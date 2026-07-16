"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabase } from "@/lib/supabase/server";

function destinoSeguro(next: string | null): string {
  return next && next.startsWith("/") ? next : "/";
}

export async function entrar(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const next = destinoSeguro(formData.get("next") as string | null);

  const supabase = await criarClienteSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) {
    redirect(`/entrar?erro=${encodeURIComponent("E-mail ou senha inválidos")}&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function cadastrar(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const next = destinoSeguro(formData.get("next") as string | null);
  // tipo de conta escolhido no cadastro (atleta é o padrão)
  const tipo =
    String(formData.get("tipo") ?? "") === "organizador"
      ? "organizador"
      : "atleta";

  // ao errar, volta ao formulário do mesmo tipo (não ao login)
  const voltarCadastro = (msg: string) =>
    redirect(
      `/entrar?modo=cadastro&tipo=${tipo}&next=${encodeURIComponent(next)}&erro=${encodeURIComponent(msg)}`,
    );

  if (!nome || !email || senha.length < 6) {
    voltarCadastro("Preencha nome, e-mail e senha (mín. 6 caracteres)");
  }

  // conta já existe com esse e-mail → manda para o login. Não há "conta de
  // atleta" separada: a mesma conta compete e organiza (e-mail é a identidade).
  const jaTemConta =
    "Você já tem uma conta com esse e-mail. Entre — a mesma conta compete e organiza.";
  const irParaLogin = (msg: string) =>
    redirect(`/entrar?next=${encodeURIComponent(next)}&erro=${encodeURIComponent(msg)}`);

  const supabase = await criarClienteSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    // `tipo` é lido no primeiro acesso para marcar eh_organizador na conta
    options: { data: { nome, tipo } },
  });
  if (error) {
    const existe =
      /already (registered|been registered|exists)|user already/i.test(error.message) ||
      (error as { code?: string }).code === "user_already_exists";
    if (existe) irParaLogin(jaTemConta);
    voltarCadastro(error.message);
  }
  // proteção contra enumeração ligada: signUp não erra, mas devolve identities
  // vazio quando o e-mail já está cadastrado
  if (data.user && data.user.identities?.length === 0) {
    irParaLogin(jaTemConta);
  }

  // sem destino explícito, cada tipo cai na sua área
  const destino =
    next !== "/" ? next : tipo === "organizador" ? "/organizador" : "/atleta";
  redirect(destino);
}

export async function sair() {
  const supabase = await criarClienteSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

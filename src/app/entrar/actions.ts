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

  if (!nome || !email || senha.length < 6) {
    redirect(`/entrar?erro=${encodeURIComponent("Preencha nome, e-mail e senha (mín. 6 caracteres)")}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await criarClienteSupabase();
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });
  if (error) {
    redirect(`/entrar?erro=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function sair() {
  const supabase = await criarClienteSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

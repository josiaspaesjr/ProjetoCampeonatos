import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** cliente Supabase para Server Components e Server Actions */
export async function criarClienteSupabase() {
  const jar = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            // Server Component não pode gravar cookie — o middleware renova a sessão
          }
        },
      },
    },
  );
}

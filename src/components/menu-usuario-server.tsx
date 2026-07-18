import { MenuUsuario } from "@/components/menu-usuario";
import { propsDoMenu } from "@/lib/menu-usuario";
import { perfilDeAcesso } from "@/lib/perfil-acesso";
import { supabaseConfigurado } from "@/lib/supabase/server";

/**
 * Atalho para os headers que são Server Components: resolve a sessão e
 * renderiza o <MenuUsuario> já com as props certas. A home é Client Component
 * e não usa este wrapper — recebe propsDoMenu() por prop (ver src/app/page.tsx).
 */
export async function MenuUsuarioServer() {
  const perfil = await perfilDeAcesso();
  return <MenuUsuario {...propsDoMenu(perfil, supabaseConfigurado())} />;
}

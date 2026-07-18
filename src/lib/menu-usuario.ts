import type { PerfilAcesso } from "@/lib/perfil-acesso";

/**
 * DTO do menu de usuário. Só primitivos — este objeto cruza a fronteira
 * server→client, então NÃO pode carregar a linha `usuarios` inteira (tem PII:
 * cpf, telefone, endereço; e Dates não serializáveis). Extraímos o mínimo.
 */
export interface PropsMenuUsuario {
  usuario: {
    nome: string;
    email: string;
    inicial: string;
    faixa: string | null;
  } | null;
  /** decide entre "Painel do organizador" e "Ativar conta de organizador" */
  ehOrganizador: boolean;
  /** supabaseConfigurado() — sem auth real, esconde Entrar/Sair */
  comAuth: boolean;
}

/** Monta as props do menu a partir do perfil (chamado no servidor). */
export function propsDoMenu(
  perfil: PerfilAcesso | null,
  comAuth: boolean,
): PropsMenuUsuario {
  if (!perfil) return { usuario: null, ehOrganizador: false, comAuth };
  const { usuario, ehOrganizador } = perfil;
  return {
    usuario: {
      nome: usuario.nome,
      email: usuario.email,
      inicial: usuario.nome.trim().charAt(0).toUpperCase(),
      faixa: usuario.faixaAtual ?? null,
    },
    ehOrganizador,
    comAuth,
  };
}

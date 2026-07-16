/**
 * Utilitários de CPF (documento brasileiro).
 * Guardamos sempre só os dígitos; a formatação é só para exibição/entrada.
 */

/** Mantém apenas os dígitos de uma string. */
export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Valida um CPF pelos dígitos verificadores (aceita com ou sem máscara). */
export function validarCpf(valor: string): boolean {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11) return false;
  // rejeita sequências repetidas (000..., 111..., etc.), que passam no cálculo
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const dv1 = digito(cpf.slice(0, 9), 10);
  const dv2 = digito(cpf.slice(0, 10), 11);
  return dv1 === Number(cpf[9]) && dv2 === Number(cpf[10]);
}

/** Formata dígitos como CPF (000.000.000-00), parcial enquanto digita. */
export function formatarCpf(valor: string): string {
  const c = soDigitos(valor).slice(0, 11);
  return c
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

/** Formata dígitos como CEP (00000-000), parcial enquanto digita. */
export function formatarCep(valor: string): string {
  const c = soDigitos(valor).slice(0, 8);
  return c.replace(/^(\d{5})(\d)/, "$1-$2");
}

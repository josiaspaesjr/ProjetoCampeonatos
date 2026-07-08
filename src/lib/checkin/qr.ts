import QRCode from "qrcode";

/**
 * O QR da inscrição contém a URL da página de check-in do staff — qualquer
 * câmera de celular abre direto a tela de pesagem, sem app de scanner.
 * O código curto cobre o fallback de digitação (scanner USB ou busca manual).
 */

export function codigoCurto(inscricaoId: string): string {
  return inscricaoId.slice(0, 8).toUpperCase();
}

export function urlCheckin(eventoId: string, inscricaoId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/organizador/eventos/${eventoId}/checkin/${inscricaoId}`;
}

export async function gerarQrDataUrl(conteudo: string): Promise<string> {
  return QRCode.toDataURL(conteudo, { width: 240, margin: 1 });
}

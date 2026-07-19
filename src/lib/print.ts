/**
 * Utilidades de impressão: escapar texto do usuário e imprimir um HTML
 * autocontido (tema claro, A4) via iframe oculto — sem popup e sem sair da
 * página. Compartilhado pelas listas imprimíveis (atletas, programação…).
 */

/** escapa texto do usuário para interpolar com segurança no HTML de impressão */
export const escaparHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });

/** imprime um HTML autocontido via iframe oculto (sem popup, sem sair da página) */
export function imprimirHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  let acionado = false;
  const acionar = () => {
    if (acionado) return;
    const win = iframe.contentWindow;
    if (!win) return;
    acionado = true;
    win.focus();
    win.print();
    win.onafterprint = () => iframe.remove();
    // rede de segurança: remove o iframe mesmo se onafterprint não disparar
    window.setTimeout(() => iframe.remove(), 60000);
  };

  iframe.onload = () => window.setTimeout(acionar, 60);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
}

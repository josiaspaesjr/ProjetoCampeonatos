"use client";

import { useRef, useState } from "react";
import { useDic } from "@/lib/i18n/client";

/** lado maior da capa depois do redimensionamento no navegador */
const LADO_MAX = 1920;

/**
 * Reduz a imagem no navegador (canvas → JPEG) para o upload caber no limite
 * de corpo da Server Action/Vercel. Se algo falhar, devolve o arquivo original.
 */
async function redimensionar(arquivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) =>
      canvas.toBlob(ok, "image/jpeg", 0.85),
    );
    if (!blob) return arquivo;
    const nome = arquivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    return arquivo;
  }
}

/**
 * Imagem de capa do evento: o organizador escolhe um arquivo, vê a prévia e
 * o form envia `bannerArquivo` (novo upload) + `bannerUrl` (capa atual, para
 * manter quando não há arquivo novo; vazio = remover).
 */
export function CampoBanner({
  id,
  labelCls,
  urlAtual = "",
}: {
  id: string;
  labelCls: string;
  urlAtual?: string;
}) {
  const dc = useDic().admin.campos;
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(urlAtual);
  const [previa, setPrevia] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const imagem = previa ?? (url || null);

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const original = input.files?.[0];
    if (!original) return;
    setProcessando(true);
    const arquivo = await redimensionar(original);
    const dt = new DataTransfer();
    dt.items.add(arquivo);
    input.files = dt.files;
    setPrevia((antiga) => {
      if (antiga) URL.revokeObjectURL(antiga);
      return URL.createObjectURL(arquivo);
    });
    setProcessando(false);
  }

  function remover() {
    if (inputRef.current) inputRef.current.value = "";
    if (previa) URL.revokeObjectURL(previa);
    setPrevia(null);
    setUrl("");
  }

  return (
    <div className="flex flex-col gap-[9px]">
      <label className={labelCls} htmlFor={id}>
        {dc.imagemCapa}
      </label>
      <input type="hidden" name="bannerUrl" value={url} />
      <input
        ref={inputRef}
        id={id}
        name="bannerArquivo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={aoEscolher}
        className="sr-only"
      />

      {imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagem}
          alt=""
          className="aspect-[16/6] w-full border border-white/10 object-cover"
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          className="inline-flex h-11 cursor-pointer items-center border border-white/18 px-5 font-cond text-[15px] font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:border-white/40"
        >
          {processando ? "…" : imagem ? dc.bannerTrocar : dc.bannerEnviar}
        </label>
        {imagem && (
          <button
            type="button"
            onClick={remover}
            className="cursor-pointer font-cond text-[15px] font-semibold uppercase tracking-[0.04em] text-muted-2 transition-colors hover:text-brand"
          >
            {dc.bannerRemover}
          </button>
        )}
      </div>
      <p className="text-[13px] font-medium text-muted-3">{dc.bannerDica}</p>
    </div>
  );
}

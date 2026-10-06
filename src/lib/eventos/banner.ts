import { criarClienteSupabase, supabaseConfigurado } from "@/lib/supabase/server";

const BUCKET = "banners";
const TAMANHO_MAX = 5 * 1024 * 1024;
const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Resolve a imagem de capa do form: se veio arquivo novo (`bannerArquivo`),
 * envia ao Supabase Storage e devolve a URL pública; senão mantém o
 * `bannerUrl` atual (vazio = sem capa). Lança `Error` se o upload falhar.
 */
export async function resolverBannerDoForm(
  formData: FormData,
): Promise<string | null> {
  const arquivo = formData.get("bannerArquivo");
  const atual = String(formData.get("bannerUrl") ?? "") || null;
  if (!(arquivo instanceof File) || arquivo.size === 0) return atual;

  const ext = EXTENSOES[arquivo.type];
  if (!ext || arquivo.size > TAMANHO_MAX || !supabaseConfigurado()) {
    console.error("[banner] arquivo recusado:", arquivo.type, arquivo.size);
    throw new Error("banner inválido");
  }

  const supabase = await criarClienteSupabase();
  const caminho = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { contentType: arquivo.type });
  if (error) {
    console.error("[banner] upload falhou:", error);
    throw new Error(error.message);
  }

  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

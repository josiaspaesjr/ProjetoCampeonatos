"use client";

import { useMemo, useState } from "react";
import {
  categoriaCompativel,
  idadeNoAnoDoEvento,
} from "@/lib/categorias/elegibilidade";

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none";

export interface CategoriaOpcao {
  id: string;
  nome: string;
  sexo: string;
  faixa: string | null;
  idadeMin: number | null;
  idadeMax: number | null;
}

interface Props {
  dataEvento: string;
  categorias: CategoriaOpcao[];
  acao: (formData: FormData) => Promise<void>;
  perfil?: {
    nome?: string;
    email?: string;
    dataNascimento?: string;
    sexo?: string;
    faixa?: string;
  };
}

export function FormInscricao({ dataEvento, categorias, acao, perfil }: Props) {
  const [sexo, setSexo] = useState(perfil?.sexo ?? "");
  const [faixa, setFaixa] = useState(perfil?.faixa ?? "");
  const [nascimento, setNascimento] = useState(perfil?.dataNascimento ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const compativeis = useMemo(() => {
    if (!sexo || !faixa || !nascimento) return [];
    const idade = idadeNoAnoDoEvento(nascimento, dataEvento);
    return categorias.filter((c) => categoriaCompativel(c, { sexo, faixa, idade }));
  }, [sexo, faixa, nascimento, categorias, dataEvento]);

  return (
    <form
      action={async (fd) => {
        setErro(null);
        try {
          await acao(fd);
        } catch (e) {
          // redirect() do Next lança um erro especial que deve propagar
          if (e && typeof e === "object" && "digest" in e) throw e;
          setErro(e instanceof Error ? e.message : "Erro ao processar inscrição");
        }
      }}
      className="mt-8 space-y-5"
    >
      {erro && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Nome completo *</span>
          <input name="nome" required defaultValue={perfil?.nome} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">E-mail *</span>
          <input name="email" type="email" required defaultValue={perfil?.email} className={inputCls} />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Nascimento *</span>
          <input
            name="dataNascimento"
            type="date"
            required
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Sexo *</span>
          <select name="sexo" required value={sexo} onChange={(e) => setSexo(e.target.value)} className={inputCls}>
            <option value="">Selecione</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Faixa *</span>
          <select name="faixa" required value={faixa} onChange={(e) => setFaixa(e.target.value)} className={inputCls}>
            <option value="">Selecione</option>
            {["branca", "azul", "roxa", "marrom", "preta"].map((f) => (
              <option key={f} value={f} className="capitalize">
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Academia / equipe</span>
        <input name="academia" placeholder="Nome da sua academia" className={inputCls} />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Categoria *</span>
        {sexo && faixa && nascimento ? (
          compativeis.length ? (
            <select name="categoriaId" required className={inputCls}>
              {compativeis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Nenhuma categoria compatível com seu perfil neste evento.
            </p>
          )
        ) : (
          <p className="mt-1 text-sm text-zinc-400">
            Preencha nascimento, sexo e faixa para ver suas categorias.
          </p>
        )}
      </label>

      <button
        type="submit"
        disabled={!compativeis.length}
        className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        Continuar para o pagamento
      </button>
    </form>
  );
}

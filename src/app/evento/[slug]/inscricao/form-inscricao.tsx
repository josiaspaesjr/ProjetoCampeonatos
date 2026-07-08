"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FAIXAS } from "@/lib/categorias/cbjj";
import {
  categoriaCompativel,
  idadeNoAnoDoEvento,
} from "@/lib/categorias/elegibilidade";

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
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Nome completo *</span>
          <Input name="nome" required defaultValue={perfil?.nome} className="mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">E-mail *</span>
          <Input name="email" type="email" required defaultValue={perfil?.email} className="mt-1" />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Nascimento *</span>
          <Input
            name="dataNascimento"
            type="date"
            required
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Sexo *</span>
          <NativeSelect
            name="sexo"
            required
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            className="mt-1"
          >
            <option value="">Selecione</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </NativeSelect>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Faixa *</span>
          <NativeSelect
            name="faixa"
            required
            value={faixa}
            onChange={(e) => setFaixa(e.target.value)}
            className="mt-1"
          >
            <option value="">Selecione</option>
            {FAIXAS.map((f) => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Academia / equipe</span>
        <Input name="academia" placeholder="Nome da sua academia" className="mt-1" />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Categoria *</span>
        {sexo && faixa && nascimento ? (
          compativeis.length ? (
            <NativeSelect name="categoriaId" required className="mt-1">
              {compativeis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <p className="mt-1 rounded-md bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
              Nenhuma categoria compatível com seu perfil neste evento.
            </p>
          )
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha nascimento, sexo e faixa para ver suas categorias.
          </p>
        )}
      </label>

      <Button variant="success" size="lg" disabled={!compativeis.length}>
        Continuar para o pagamento
      </Button>
    </form>
  );
}

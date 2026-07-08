import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { criarEvento } from "../actions";

export default function NovoEvento() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Novo evento</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Depois de criar, você configura categorias, lotes e publica.
      </p>

      <form action={criarEvento} className="mt-8 space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Nome do evento *</span>
          <Input
            name="nome"
            required
            placeholder="Copa Cidade de Jiu-Jitsu 2026"
            className="mt-1"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Data do evento *</span>
            <Input type="date" name="dataInicio" required className="mt-1" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Inscrições fecham em</span>
            <Input type="datetime-local" name="inscricoesFecham" className="mt-1" />
          </label>
        </div>

        <div className="grid grid-cols-6 gap-4">
          <label className="col-span-3 block">
            <span className="text-sm font-medium">Cidade</span>
            <Input name="cidade" className="mt-1" />
          </label>
          <label className="col-span-1 block">
            <span className="text-sm font-medium">UF</span>
            <Input name="uf" maxLength={2} className="mt-1" />
          </label>
          <label className="col-span-2 block">
            <span className="text-sm font-medium">Moeda</span>
            <NativeSelect name="moeda" defaultValue="BRL" className="mt-1">
              <option value="BRL">BRL — Real (Pix)</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </NativeSelect>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Endereço / ginásio</span>
          <Input name="endereco" className="mt-1" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Descrição</span>
          <Textarea name="descricao" rows={4} className="mt-1" />
        </label>

        <Button size="lg">Criar evento</Button>
      </form>
    </div>
  );
}

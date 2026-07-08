import { criarEvento } from "../actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none";

export default function NovoEvento() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Novo evento</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Depois de criar, você configura categorias, lotes e publica.
      </p>

      <form action={criarEvento} className="mt-8 space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Nome do evento *</span>
          <input name="nome" required placeholder="Copa Cidade de Jiu-Jitsu 2026" className={inputCls} />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Data do evento *</span>
            <input type="date" name="dataInicio" required className={inputCls} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Inscrições fecham em</span>
            <input type="datetime-local" name="inscricoesFecham" className={inputCls} />
          </label>
        </div>

        <div className="grid grid-cols-6 gap-4">
          <label className="col-span-3 block">
            <span className="text-sm font-medium">Cidade</span>
            <input name="cidade" className={inputCls} />
          </label>
          <label className="col-span-1 block">
            <span className="text-sm font-medium">UF</span>
            <input name="uf" maxLength={2} className={inputCls} />
          </label>
          <label className="col-span-2 block">
            <span className="text-sm font-medium">Moeda</span>
            <select name="moeda" defaultValue="BRL" className={inputCls}>
              <option value="BRL">BRL — Real (Pix)</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Endereço / ginásio</span>
          <input name="endereco" className={inputCls} />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Descrição</span>
          <textarea name="descricao" rows={4} className={inputCls} />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Criar evento
        </button>
      </form>
    </div>
  );
}

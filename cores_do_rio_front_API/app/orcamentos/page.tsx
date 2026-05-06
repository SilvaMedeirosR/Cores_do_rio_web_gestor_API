"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";

interface Orcamento {
  id: string;
  titulo: string;
  descricao: string | null;
  valor_total: number;
  status: string;
  validade: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviado:  "Enviado",
  aprovado: "Aprovado",
  rejeitado:"Rejeitado",
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-zinc-100 text-zinc-700",
  enviado:  "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700",
  rejeitado:"bg-red-100 text-red-700",
};

const EMPTY_FORM = {
  titulo: "",
  descricao: "",
  valor_total: "",
  status: "rascunho",
  validade: "",
};

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [erro, setErro]             = useState<string | null>(null);

  const fetchOrcamentos = useCallback(async () => {
    setLoading(true);
    try {
      const r    = await fetch(`${API}/`);
      const json = await r.json();
      setOrcamentos(json.data ?? []);
    } catch {
      setOrcamentos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrcamentos(); }, [fetchOrcamentos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSubmitting(true);
    try {
      const payload = {
        titulo:      form.titulo,
        descricao:   form.descricao   || null,
        valor_total: parseFloat(form.valor_total),
        status:      form.status,
        validade:    form.validade    || null,
      };
      const r = await fetch(`${API}/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json();
        setErro(j.error ?? "Erro ao salvar orcamento");
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchOrcamentos();
    } catch {
      setErro("Erro de conexao com a API");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header da pagina */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Orcamentos</h1>
          <p className="text-zinc-500 mt-1">Planejamento e gestao de orcamentos</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setErro(null); }}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
        >
          {showForm ? "Cancelar" : "+ Novo Orcamento"}
        </button>
      </div>

      <div className="flex gap-3 mb-2">
        <Link href="/orcamentos/obras" className="text-sm text-orange-600 hover:text-orange-800 font-medium border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
          Obras Cadastradas
        </Link>
      </div>

      {/* Formulario de criacao */}
      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-5">Novo Orcamento</h2>

          {erro && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Titulo *
              </label>
              <input
                required
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Ex: Pintura fachada Edificio Central"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Descricao
              </label>
              <textarea
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                placeholder="Detalhes do servico..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Valor Total (R$) *
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.valor_total}
                onChange={(e) => setForm({ ...form, valor_total: e.target.value })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              >
                {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Validade
              </label>
              <input
                type="date"
                value={form.validade}
                onChange={(e) => setForm({ ...form, validade: e.target.value })}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => { setShowForm(false); setErro(null); }}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {submitting ? "Salvando..." : "Salvar Orcamento"}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Tabela de orcamentos */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400 text-sm">
            Carregando...
          </div>
        ) : orcamentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <span className="text-4xl mb-3">ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹</span>
            <p className="font-medium">Nenhum orcamento cadastrado</p>
            <p className="text-sm mt-1">Clique em &quot;+ Novo Orcamento&quot; para comecar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Titulo
                </th>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Valor Total
                </th>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Validade
                </th>
                <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">
                  Criado em
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orcamentos.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-900">{o.titulo}</div>
                    {o.descricao && (
                      <div className="text-xs text-zinc-400 mt-0.5 truncate max-w-xs">
                        {o.descricao}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-800">
                    {fmt(o.valor_total)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[o.status] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-sm">
                    {o.validade ? fmtDate(o.validade) : "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â"}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">
                    {new Date(o.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";

const ETAPAS = [
  { value: "massa_parede", label: "Massa Parede" },
  { value: "massa_teto",   label: "Massa Teto"   },
  { value: "lixacao",      label: "Lixacao"       },
  { value: "pintura",      label: "Pintura"       },
  { value: "acabamento",   label: "Acabamento"    },
];

const TIPOS_COMODO = [
  { value: "sala",         label: "Sala"          },
  { value: "quarto",       label: "Quarto"        },
  { value: "banheiro",     label: "Banheiro"      },
  { value: "suite",        label: "Suite"         },
  { value: "varanda",      label: "Varanda"       },
  { value: "lavatorio",    label: "Lavatorio"     },
  { value: "circulacao",   label: "Circulacao"    },
  { value: "escritorio",   label: "Escritorio"    },
  { value: "area_tecnica", label: "Area Tecnica"  },
  { value: "escada",       label: "Escada"        },
];

interface ComodoForm   { tipo: string; nome: string; paredes_m2: string; teto_m2: string; }
interface PavimentoForm { nome: string; numero: string; comodos: ComodoForm[]; }
interface PrecoForm    { etapa: string; preco_m2: string; }

interface ObraForm {
  nome: string;
  local: string;
  precos: PrecoForm[];
  pavimentos: PavimentoForm[];
}

interface Obra {
  id: string; nome: string; local: string; created_at: string;
  pavimentos: { id: string; nome: string; numero: number; comodos: { id: string }[] }[];
  obra_precos: { etapa: string; preco_m2: number }[];
}

const emptyComodo   = (): ComodoForm    => ({ tipo: "sala", nome: "", paredes_m2: "", teto_m2: "" });
const emptyPavimento = (): PavimentoForm => ({ nome: "", numero: "", comodos: [emptyComodo()] });
const emptyForm     = (): ObraForm      => ({
  nome: "", local: "",
  precos: ETAPAS.map(e => ({ etapa: e.value, preco_m2: "" })),
  pavimentos: [emptyPavimento()],
});

export default function ObrasPage() {
  const [obras, setObras]         = useState<Obra[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSub]      = useState(false);
  const [form, setForm]           = useState<ObraForm>(emptyForm());
  const [erro, setErro]           = useState<string | null>(null);

  const fetchObras = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/obras`);
      const j = await r.json();
      setObras(j.data ?? []);
    } catch { setObras([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchObras(); }, [fetchObras]);

  // --- helpers de mutacao do form ---

  const setObra = (field: keyof Pick<ObraForm,"nome"|"local">, val: string) =>
    setForm(f => ({ ...f, [field]: val }));

  const setPreco = (i: number, val: string) =>
    setForm(f => { const p = [...f.precos]; p[i] = { ...p[i], preco_m2: val }; return { ...f, precos: p }; });

  const addPavimento = () =>
    setForm(f => ({ ...f, pavimentos: [...f.pavimentos, emptyPavimento()] }));

  const removePavimento = (pi: number) =>
    setForm(f => ({ ...f, pavimentos: f.pavimentos.filter((_, i) => i !== pi) }));

  const setPavField = (pi: number, field: "nome"|"numero", val: string) =>
    setForm(f => {
      const pavs = [...f.pavimentos];
      pavs[pi] = { ...pavs[pi], [field]: val };
      return { ...f, pavimentos: pavs };
    });

  const addComodo = (pi: number) =>
    setForm(f => {
      const pavs = [...f.pavimentos];
      pavs[pi] = { ...pavs[pi], comodos: [...pavs[pi].comodos, emptyComodo()] };
      return { ...f, pavimentos: pavs };
    });

  const removeComodo = (pi: number, ci: number) =>
    setForm(f => {
      const pavs = [...f.pavimentos];
      pavs[pi] = { ...pavs[pi], comodos: pavs[pi].comodos.filter((_, i) => i !== ci) };
      return { ...f, pavimentos: pavs };
    });

  const setComodoField = (pi: number, ci: number, field: keyof ComodoForm, val: string) =>
    setForm(f => {
      const pavs = [...f.pavimentos];
      const coms = [...pavs[pi].comodos];
      coms[ci] = { ...coms[ci], [field]: val };
      pavs[pi] = { ...pavs[pi], comodos: coms };
      return { ...f, pavimentos: pavs };
    });

  // --- submit ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSub(true);
    try {
      const payload = {
        nome:  form.nome,
        local: form.local,
        precos: form.precos
          .filter(p => p.preco_m2 !== "")
          .map(p => ({ etapa: p.etapa, preco_m2: parseFloat(p.preco_m2) })),
        pavimentos: form.pavimentos.map(pav => ({
          nome:   pav.nome,
          numero: parseInt(pav.numero),
          comodos: pav.comodos.map(c => ({
            tipo:       c.tipo,
            nome:       c.nome || null,
            paredes_m2: parseFloat(c.paredes_m2) || 0,
            teto_m2:    parseFloat(c.teto_m2)    || 0,
          })),
        })),
      };
      const r = await fetch(`${API}/obras`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json(); setErro(j.error ?? "Erro ao salvar"); return; }
      setForm(emptyForm());
      setShowForm(false);
      await fetchObras();
    } catch { setErro("Erro de conexao com a API"); }
    finally  { setSub(false); }
  };

  const totalComodos = (o: Obra) => o.pavimentos.reduce((s, p) => s + p.comodos.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/orcamentos" className="hover:text-zinc-700 transition-colors">Orcamentos</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Obras</span>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Obras</h1>
          <p className="text-zinc-500 mt-1">Registro de obras com pavimentos e comodos</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setErro(null); }}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
        >
          {showForm ? "Cancelar" : "+ Nova Obra"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-8 overflow-hidden">

          {/* Secao 1: Dados da obra */}
          <div className="p-6 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Dados da Obra</h2>
            {erro && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nome *</label>
                <input required value={form.nome} onChange={e => setObra("nome", e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: Edificio Central" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Local *</label>
                <input required value={form.local} onChange={e => setObra("local", e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: Rua das Flores, 123" />
              </div>
            </div>
          </div>

          {/* Secao 2: Precos por etapa */}
          <div className="p-6 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Preco por m² / Etapa</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {form.precos.map((p, i) => (
                <div key={p.etapa}>
                  <label className="block text-xs font-medium text-zinc-600 mb-1 capitalize">
                    {ETAPAS[i].label}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={p.preco_m2}
                      onChange={e => setPreco(i, e.target.value)}
                      className="w-full border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secao 3: Pavimentos e Comodos */}
          <div className="p-6 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-900">Pavimentos e Comodos</h2>
              <button type="button" onClick={addPavimento}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors">
                + Pavimento
              </button>
            </div>

            <div className="space-y-4">
              {form.pavimentos.map((pav, pi) => (
                <div key={pi} className="border border-zinc-200 rounded-lg overflow-hidden">

                  {/* Header do pavimento */}
                  <div className="bg-zinc-50 px-4 py-3 flex items-center gap-3">
                    <span className="text-xs font-semibold text-zinc-500 uppercase w-6">{pi + 1}</span>
                    <input
                      required value={pav.nome} onChange={e => setPavField(pi, "nome", e.target.value)}
                      className="flex-1 border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Nome do pavimento (ex: Terreo, 1° Andar)"
                    />
                    <input
                      required type="number" min="0" value={pav.numero}
                      onChange={e => setPavField(pi, "numero", e.target.value)}
                      className="w-20 border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Num."
                    />
                    {form.pavimentos.length > 1 && (
                      <button type="button" onClick={() => removePavimento(pi)}
                        className="text-red-400 hover:text-red-600 transition-colors text-sm font-medium">
                        Remover
                      </button>
                    )}
                  </div>

                  {/* Comodos */}
                  <div className="p-4 space-y-2">
                    {pav.comodos.map((c, ci) => (
                      <div key={ci} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <select value={c.tipo} onChange={e => setComodoField(pi, ci, "tipo", e.target.value)}
                            className="w-full border border-zinc-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                            {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <input value={c.nome} onChange={e => setComodoField(pi, ci, "nome", e.target.value)}
                            className="w-full border border-zinc-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Nome (opcional)" />
                        </div>
                        <div className="col-span-2">
                          <div className="relative">
                            <input type="number" step="0.01" min="0" value={c.paredes_m2}
                              onChange={e => setComodoField(pi, ci, "paredes_m2", e.target.value)}
                              className="w-full border border-zinc-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="Parede m²" />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <input type="number" step="0.01" min="0" value={c.teto_m2}
                            onChange={e => setComodoField(pi, ci, "teto_m2", e.target.value)}
                            className="w-full border border-zinc-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Teto m²" />
                        </div>
                        <div className="col-span-2 flex gap-1">
                          <button type="button" onClick={() => addComodo(pi)}
                            className="flex-1 text-xs text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-400 rounded-md py-1.5 transition-colors">
                            +
                          </button>
                          {pav.comodos.length > 1 && (
                            <button type="button" onClick={() => removeComodo(pi, ci)}
                              className="flex-1 text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 rounded-md py-1.5 transition-colors">
                              -
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 gap-2 pt-1">
                      <div className="col-span-3 text-xs text-zinc-400">Tipo</div>
                      <div className="col-span-3 text-xs text-zinc-400">Nome</div>
                      <div className="col-span-2 text-xs text-zinc-400">Parede m²</div>
                      <div className="col-span-2 text-xs text-zinc-400">Teto m²</div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 flex justify-end gap-3 bg-zinc-50">
            <button type="button" onClick={() => { setShowForm(false); setErro(null); setForm(emptyForm()); }}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
              {submitting ? "Salvando..." : "Registrar Obra"}
            </button>
          </div>
        </form>
      )}

      {/* Lista de obras */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400 text-sm">Carregando...</div>
        ) : obras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <p className="font-medium">Nenhuma obra cadastrada</p>
            <p className="text-sm mt-1">Clique em &quot;+ Nova Obra&quot; para comecar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                {["Obra", "Local", "Pavimentos", "Comodos", "Cadastrado em"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {obras.map(o => (
                <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-900">{o.nome}</td>
                  <td className="px-6 py-4 text-zinc-500 text-sm">{o.local}</td>
                  <td className="px-6 py-4 text-zinc-700 text-sm">{o.pavimentos.length}</td>
                  <td className="px-6 py-4 text-zinc-700 text-sm">{totalComodos(o)}</td>
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
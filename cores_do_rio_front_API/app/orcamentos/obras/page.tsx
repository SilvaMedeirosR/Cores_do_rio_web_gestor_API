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
  { value: "sala",         label: "Sala"         },
  { value: "quarto",       label: "Quarto"       },
  { value: "banheiro",     label: "Banheiro"     },
  { value: "suite",        label: "Suite"        },
  { value: "varanda",      label: "Varanda"      },
  { value: "lavatorio",    label: "Lavatorio"    },
  { value: "circulacao",   label: "Circulacao"   },
  { value: "escritorio",   label: "Escritorio"   },
  { value: "area_tecnica", label: "Area Tecnica" },
  { value: "escada",       label: "Escada"       },
];

interface ComodoForm {
  tipo: string; nome: string;
  parede1_m2: string; parede2_m2: string; parede3_m2: string; parede4_m2: string;
  teto_m2: string;
}
interface PavimentoForm { nome: string; numero: string; comodos: ComodoForm[]; }
interface PrecoForm     { etapa: string; preco_m2: string; }
interface ObraForm      { nome: string; local: string; precos: PrecoForm[]; pavimentos: PavimentoForm[]; }

interface ObraLista {
  id: string; nome: string; local: string; created_at: string;
  orcamento_total: number;
  pavimentos: { id: string; nome: string; comodos: { id: string }[] }[];
}

const emptyComodo    = (): ComodoForm     => ({ tipo: "sala", nome: "", parede1_m2: "", parede2_m2: "", parede3_m2: "", parede4_m2: "", teto_m2: "" });
const emptyPavimento = (): PavimentoForm => ({ nome: "", numero: "", comodos: [emptyComodo()] });
const emptyForm      = (): ObraForm      => ({ nome: "", local: "", precos: ETAPAS.map(e => ({ etapa: e.value, preco_m2: "" })), pavimentos: [emptyPavimento()] });

const n = (v: string) => parseFloat(v) || 0;
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function calcOrcComodo(c: ComodoForm, precoMap: Record<string, number>) {
  const totalParedes = n(c.parede1_m2) + n(c.parede2_m2) + n(c.parede3_m2) + n(c.parede4_m2);
  const teto         = n(c.teto_m2);
  const totalArea    = totalParedes + teto;
  const orc = {
    massa_parede: totalParedes * (precoMap.massa_parede ?? 0),
    massa_teto:   teto         * (precoMap.massa_teto   ?? 0),
    lixacao:      totalArea    * (precoMap.lixacao       ?? 0),
    pintura:      totalArea    * (precoMap.pintura       ?? 0),
    acabamento:   totalArea    * (precoMap.acabamento    ?? 0),
  };
  return { ...orc, total: Object.values(orc).reduce((a, b) => a + b, 0), totalParedes };
}

export default function ObrasPage() {
  const [obras, setObras]       = useState<ObraLista[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSub]    = useState(false);
  const [form, setForm]         = useState<ObraForm>(emptyForm());
  const [erro, setErro]         = useState<string | null>(null);

  const precoMap = Object.fromEntries(form.precos.map(p => [p.etapa, n(p.preco_m2)]));

  const fetchObras = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/obras`); const j = await r.json(); setObras(j.data ?? []); }
    catch { setObras([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchObras(); }, [fetchObras]);

  const setObra     = (f: "nome" | "local", v: string) => setForm(p => ({ ...p, [f]: v }));
  const setPreco    = (i: number, v: string) => setForm(p => { const arr = [...p.precos]; arr[i] = { ...arr[i], preco_m2: v }; return { ...p, precos: arr }; });
  const addPav      = () => setForm(p => ({ ...p, pavimentos: [...p.pavimentos, emptyPavimento()] }));
  const removePav   = (pi: number) => setForm(p => ({ ...p, pavimentos: p.pavimentos.filter((_, i) => i !== pi) }));
  const setPavField = (pi: number, f: "nome" | "numero", v: string) => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], [f]: v }; return { ...p, pavimentos: a }; });
  const addComodo   = (pi: number) => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], comodos: [...a[pi].comodos, emptyComodo()] }; return { ...p, pavimentos: a }; });
  const removeComodo = (pi: number, ci: number) => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], comodos: a[pi].comodos.filter((_, i) => i !== ci) }; return { ...p, pavimentos: a }; });
  const setComodoField = (pi: number, ci: number, f: keyof ComodoForm, v: string) => setForm(p => {
    const a = [...p.pavimentos]; const cs = [...a[pi].comodos]; cs[ci] = { ...cs[ci], [f]: v }; a[pi] = { ...a[pi], comodos: cs }; return { ...p, pavimentos: a };
  });

  const obraTotal = form.pavimentos.reduce((s, pav) =>
    s + pav.comodos.reduce((ps, c) => ps + calcOrcComodo(c, precoMap).total, 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(null); setSub(true);
    try {
      const payload = {
        nome: form.nome, local: form.local,
        precos: form.precos.filter(p => p.preco_m2 !== "").map(p => ({ etapa: p.etapa, preco_m2: n(p.preco_m2) })),
        pavimentos: form.pavimentos.map(pav => ({
          nome: pav.nome, numero: parseInt(pav.numero) || 0,
          comodos: pav.comodos.map(c => ({
            tipo: c.tipo, nome: c.nome || null,
            parede1_m2: n(c.parede1_m2), parede2_m2: n(c.parede2_m2),
            parede3_m2: n(c.parede3_m2), parede4_m2: n(c.parede4_m2),
            teto_m2: n(c.teto_m2),
          })),
        })),
      };
      const r = await fetch(`${API}/obras`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const j = await r.json(); setErro(j.error ?? "Erro ao salvar"); return; }
      setForm(emptyForm()); setShowForm(false); await fetchObras();
    } catch { setErro("Erro de conexao com a API"); } finally { setSub(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/orcamentos" className="hover:text-zinc-700 transition-colors">Orcamentos</Link>
        <span>/</span><span className="text-zinc-700 font-medium">Obras</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Obras</h1>
          <p className="text-zinc-500 mt-1">Registro e orcamento de obras</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setErro(null); }}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm">
          {showForm ? "Cancelar" : "+ Nova Obra"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-8 overflow-hidden">

          {/* Secao 1: Dados */}
          <div className="p-6 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Dados da Obra</h2>
            {erro && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nome *</label>
                <input required value={form.nome} onChange={e => setObra("nome", e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Edificio Central" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Local *</label>
                <input required value={form.local} onChange={e => setObra("local", e.target.value)}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Rua das Flores, 123" />
              </div>
            </div>
          </div>

          {/* Secao 2: Precos */}
          <div className="p-6 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Preco por m²  por Etapa</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {form.precos.map((p, i) => (
                <div key={p.etapa}>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">{ETAPAS[i].label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                    <input type="number" step="0.01" min="0" value={p.preco_m2} onChange={e => setPreco(i, e.target.value)}
                      className="w-full border border-zinc-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0,00" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secao 3: Pavimentos */}
          <div className="p-6 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-900">Pavimentos e Comodos</h2>
              <button type="button" onClick={addPav} className="text-sm text-orange-600 hover:text-orange-700 font-medium">+ Pavimento</button>
            </div>

            <div className="space-y-6">
              {form.pavimentos.map((pav, pi) => {
                const pavTotal = pav.comodos.reduce((s, c) => s + calcOrcComodo(c, precoMap).total, 0);
                return (
                  <div key={pi} className="border border-zinc-200 rounded-lg overflow-hidden">
                    <div className="bg-zinc-50 px-4 py-3 flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-400 w-5">{pi + 1}</span>
                      <input required value={pav.nome} onChange={e => setPavField(pi, "nome", e.target.value)}
                        className="flex-1 border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Nome (ex: Terreo, 1 Andar)" />
                      <input required type="number" min="0" value={pav.numero} onChange={e => setPavField(pi, "numero", e.target.value)}
                        className="w-20 border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Num." />
                      {pavTotal > 0 && <span className="text-sm font-semibold text-orange-600 whitespace-nowrap">{fmt(pavTotal)}</span>}
                      {form.pavimentos.length > 1 && (
                        <button type="button" onClick={() => removePav(pi)} className="text-red-400 hover:text-red-600 text-sm">Remover</button>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      {pav.comodos.map((c, ci) => {
                        const orc = calcOrcComodo(c, precoMap);
                        return (
                          <div key={ci} className="bg-zinc-50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <select value={c.tipo} onChange={e => setComodoField(pi, ci, "tipo", e.target.value)}
                                className="border border-zinc-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                                {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <input value={c.nome} onChange={e => setComodoField(pi, ci, "nome", e.target.value)}
                                className="flex-1 border border-zinc-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Nome (opcional)" />
                              {orc.total > 0 && <span className="text-sm font-semibold text-orange-600 whitespace-nowrap">{fmt(orc.total)}</span>}
                              <button type="button" onClick={() => addComodo(pi)} className="text-xs text-orange-600 hover:text-orange-700 border border-orange-200 rounded-md px-2 py-1.5">+</button>
                              {pav.comodos.length > 1 && (
                                <button type="button" onClick={() => removeComodo(pi, ci)} className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-md px-2 py-1.5">-</button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {(["parede1_m2","parede2_m2","parede3_m2","parede4_m2"] as const).map((f, fi) => (
                                <div key={f}>
                                  <label className="block text-xs text-zinc-500 mb-0.5">Parede {fi + 1} m²</label>
                                  <input type="number" step="0.01" min="0" value={c[f]}
                                    onChange={e => setComodoField(pi, ci, f, e.target.value)}
                                    className="w-full border border-zinc-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="0,00" />
                                </div>
                              ))}
                              <div>
                                <label className="block text-xs text-zinc-500 mb-0.5">Teto m²</label>
                                <input type="number" step="0.01" min="0" value={c.teto_m2}
                                  onChange={e => setComodoField(pi, ci, "teto_m2", e.target.value)}
                                  className="w-full border border-zinc-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  placeholder="0,00" />
                              </div>
                            </div>
                            {orc.total > 0 && (
                              <div className="grid grid-cols-5 gap-1 pt-1">
                                {ETAPAS.map(et => (
                                  <div key={et.value} className="text-center">
                                    <div className="text-xs text-zinc-400">{et.label}</div>
                                    <div className="text-xs font-medium text-zinc-700">{fmt((orc as Record<string, number>)[et.value])}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-between bg-zinc-50">
            {obraTotal > 0 && <span className="text-base font-bold text-zinc-800">Total estimado: <span className="text-orange-600">{fmt(obraTotal)}</span></span>}
            <div className="flex gap-3 ml-auto">
              <button type="button" onClick={() => { setShowForm(false); setErro(null); setForm(emptyForm()); }}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900">Cancelar</button>
              <button type="submit" disabled={submitting}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-6 py-2 rounded-lg text-sm font-medium">
                {submitting ? "Salvando..." : "Registrar Obra"}
              </button>
            </div>
          </div>
        </form>
      )}

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
                {["Obra","Local","Pavimentos","Comodos","Orcamento Total","Acoes"].map(h => (
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
                  <td className="px-6 py-4 text-zinc-700 text-sm">{o.pavimentos.reduce((s, p) => s + p.comodos.length, 0)}</td>
                  <td className="px-6 py-4 font-semibold text-orange-600">{fmt(o.orcamento_total ?? 0)}</td>
                  <td className="px-6 py-4">
                    <Link href={`/orcamentos/obras/${o.id}`} className="text-sm text-orange-600 hover:text-orange-800 font-medium">Ver detalhes</Link>
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
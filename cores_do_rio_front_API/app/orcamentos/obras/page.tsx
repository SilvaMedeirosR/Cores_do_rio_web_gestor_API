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

type EtapaKey = "massa_parede" | "massa_teto" | "lixacao" | "pintura" | "acabamento";

interface ComodoForm {
  tipo: string; nome: string;
  parede1_m2: string; parede2_m2: string; parede3_m2: string; parede4_m2: string;
  teto_m2: string;
}
interface PavimentoForm { nome: string; numero: string; comodos: ComodoForm[]; }
interface PrecoForm      { etapa: string; preco_m2: string; }
interface ObraForm       { nome: string; local: string; precos: PrecoForm[]; pavimentos: PavimentoForm[]; }

interface ObraLista {
  id: string; nome: string; local: string; created_at: string;
  orcamento_total: number;
  pavimentos: { id: string; nome: string; comodos: { id: string }[] }[];
}

const emptyComodo    = (): ComodoForm     => ({ tipo: "sala", nome: "", parede1_m2: "", parede2_m2: "", parede3_m2: "", parede4_m2: "", teto_m2: "" });
const emptyPavimento = (): PavimentoForm  => ({ nome: "", numero: "", comodos: [emptyComodo()] });
const emptyForm      = (): ObraForm       => ({ nome: "", local: "", precos: ETAPAS.map(e => ({ etapa: e.value, preco_m2: "" })), pavimentos: [emptyPavimento()] });

const n   = (v: string) => parseFloat(v) || 0;
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const INPUT = "w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";
const INPUT_SM = "border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

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
  const [obras, setObras]             = useState<ObraLista[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSub]          = useState(false);
  const [form, setForm]               = useState<ObraForm>(emptyForm());
  const [erro, setErro]               = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);

  const precoMap = Object.fromEntries(form.precos.map(p => [p.etapa, n(p.preco_m2)]));

  const fetchObras = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/obras`); const j = await r.json(); setObras(j.data ?? []); }
    catch { setObras([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchObras(); }, [fetchObras]);

  const setObra        = (f: "nome" | "local", v: string) => setForm(p => ({ ...p, [f]: v }));
  const setPreco       = (i: number, v: string)           => setForm(p => { const a = [...p.precos]; a[i] = { ...a[i], preco_m2: v }; return { ...p, precos: a }; });
  const addPav         = ()                               => setForm(p => ({ ...p, pavimentos: [...p.pavimentos, emptyPavimento()] }));
  const removePav      = (pi: number)                     => setForm(p => ({ ...p, pavimentos: p.pavimentos.filter((_, i) => i !== pi) }));
  const setPavField    = (pi: number, f: "nome" | "numero", v: string) => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], [f]: v }; return { ...p, pavimentos: a }; });
  const addComodo      = (pi: number)                     => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], comodos: [...a[pi].comodos, emptyComodo()] }; return { ...p, pavimentos: a }; });
  const removeComodo   = (pi: number, ci: number)         => setForm(p => { const a = [...p.pavimentos]; a[pi] = { ...a[pi], comodos: a[pi].comodos.filter((_, i) => i !== ci) }; return { ...p, pavimentos: a }; });
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

  const handleDelete = async (obraId: string) => {
    setDeleting(true);
    try {
      const r = await fetch(`${API}/obras/${obraId}`, { method: "DELETE" });
      if (r.ok) {
        setConfirmDelete(null);
        setObras(prev => prev.filter(o => o.id !== obraId));
      }
    } finally { setDeleting(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-2 text-xs text-zinc-400 mb-6 sm:mb-8">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-zinc-600 font-medium">Obras</span>
      </div>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Obras</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Registro e orcamento de obras</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setErro(null); }}
          className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nova Obra"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-8 overflow-hidden">

          {/* Dados */}
          <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Dados da Obra</h2>
            {erro && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erro}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nome *</label>
                <input required value={form.nome} onChange={e => setObra("nome", e.target.value)}
                  className={INPUT} placeholder="Ex: Edificio Central" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Local *</label>
                <input required value={form.local} onChange={e => setObra("local", e.target.value)}
                  className={INPUT} placeholder="Ex: Rua das Flores, 123" />
              </div>
            </div>
          </div>

          {/* Precos */}
          <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Preco por m² / Etapa</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {form.precos.map((p, i) => (
                <div key={p.etapa}>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">{ETAPAS[i].label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium pointer-events-none">R$</span>
                    <input type="number" step="0.01" min="0" value={p.preco_m2} onChange={e => setPreco(i, e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2.5 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
                      placeholder="0,00" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pavimentos */}
          <div className="px-4 sm:px-6 py-5 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Pavimentos e Comodos</h2>
              <button type="button" onClick={addPav}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
                + Pavimento
              </button>
            </div>

            <div className="space-y-5">
              {form.pavimentos.map((pav, pi) => {
                const pavTotal = pav.comodos.reduce((s, c) => s + calcOrcComodo(c, precoMap).total, 0);
                return (
                  <div key={pi} className="border border-zinc-200 rounded-xl overflow-hidden">
                    <div className="bg-zinc-50 px-4 py-3 flex items-center gap-3 border-b border-zinc-100 flex-wrap">
                      <span className="text-xs font-bold text-zinc-400 w-4 shrink-0">{pi + 1}</span>
                      <input required value={pav.nome} onChange={e => setPavField(pi, "nome", e.target.value)}
                        className={`flex-1 min-w-32 ${INPUT_SM}`} placeholder="Nome (ex: Terreo, 1 Andar)" />
                      <input required type="number" min="0" value={pav.numero} onChange={e => setPavField(pi, "numero", e.target.value)}
                        className={`w-20 ${INPUT_SM}`} placeholder="N°" />
                      {pavTotal > 0 && (
                        <span className="text-xs font-bold text-orange-600 whitespace-nowrap">{fmt(pavTotal)}</span>
                      )}
                      {form.pavimentos.length > 1 && (
                        <button type="button" onClick={() => removePav(pi)}
                          className="text-xs text-zinc-400 hover:text-red-500 transition-colors px-1">Remover</button>
                      )}
                    </div>

                    <div className="p-3 sm:p-4 space-y-3">
                      {pav.comodos.map((c, ci) => {
                        const orc = calcOrcComodo(c, precoMap);
                        return (
                          <div key={ci} className="border border-zinc-100 rounded-lg p-3 space-y-3 bg-zinc-50/50">
                            <div className="flex items-center gap-2 flex-wrap">
                              <select value={c.tipo} onChange={e => setComodoField(pi, ci, "tipo", e.target.value)}
                                className="border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                                {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <input value={c.nome} onChange={e => setComodoField(pi, ci, "nome", e.target.value)}
                                className={`flex-1 min-w-32 ${INPUT_SM}`} placeholder="Nome opcional" />
                              {orc.total > 0 && (
                                <span className="text-xs font-bold text-orange-600 whitespace-nowrap">{fmt(orc.total)}</span>
                              )}
                              <button type="button" onClick={() => addComodo(pi)}
                                className="text-xs text-orange-600 border border-orange-200 hover:border-orange-400 rounded-lg px-2.5 py-2 transition-colors whitespace-nowrap">
                                + Comodo
                              </button>
                              {pav.comodos.length > 1 && (
                                <button type="button" onClick={() => removeComodo(pi, ci)}
                                  className="text-xs text-zinc-400 hover:text-red-500 border border-zinc-200 rounded-lg px-2.5 py-2 transition-colors">
                                  Remover
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {(["parede1_m2","parede2_m2","parede3_m2","parede4_m2"] as const).map((f, fi) => (
                                <div key={f}>
                                  <label className="block text-xs text-zinc-400 mb-1">Parede {fi + 1} m²</label>
                                  <input type="number" step="0.01" min="0" value={c[f]}
                                    onChange={e => setComodoField(pi, ci, f, e.target.value)}
                                    className={`w-full ${INPUT_SM}`} placeholder="0,00" />
                                </div>
                              ))}
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Teto m²</label>
                                <input type="number" step="0.01" min="0" value={c.teto_m2}
                                  onChange={e => setComodoField(pi, ci, "teto_m2", e.target.value)}
                                  className={`w-full ${INPUT_SM}`} placeholder="0,00" />
                              </div>
                            </div>

                            {orc.total > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-zinc-100">
                                {ETAPAS.map(et => (
                                  <div key={et.value} className="text-center">
                                    <p className="text-xs text-zinc-400 mb-0.5">{et.label}</p>
                                    <p className="text-xs font-semibold text-zinc-700">{fmt(orc[et.value as EtapaKey])}</p>
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

          {/* Footer */}
          <div className="px-4 sm:px-6 py-4 bg-zinc-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {obraTotal > 0 ? (
              <span className="text-sm text-zinc-600">
                Total estimado: <span className="font-bold text-zinc-900">{fmt(obraTotal)}</span>
              </span>
            ) : <span />}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setErro(null); setForm(emptyForm()); }}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                {submitting ? "Salvando..." : "Registrar Obra"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400 text-sm">Carregando...</div>
        ) : obras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-1.5">
            <p className="text-sm font-medium text-zinc-500">Nenhuma obra cadastrada</p>
            <p className="text-xs text-zinc-400">Clique em &quot;+ Nova Obra&quot; para comecar</p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden divide-y divide-zinc-100">
              {obras.map(o => (
                <div key={o.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-zinc-900 text-sm leading-snug">{o.nome}</p>
                    <span className="text-sm font-bold text-orange-600 tabular-nums shrink-0">{fmt(o.orcamento_total ?? 0)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">{o.local}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                    <span>{o.pavimentos.length} pav.</span>
                    <span>·</span>
                    <span>{o.pavimentos.reduce((s, p) => s + p.comodos.length, 0)} comodos</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/orcamentos/obras/${o.id}`}
                      className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
                      Ver detalhes →
                    </Link>
                    <Link href={`/orcamentos/obras/${o.id}/editar`}
                      className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">
                      Editar
                    </Link>
                    {confirmDelete === o.id ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="text-zinc-500">Excluir?</span>
                        <button onClick={() => handleDelete(o.id)} disabled={deleting}
                          className="text-red-600 font-medium hover:text-red-700 disabled:opacity-50">Sim</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-zinc-400 hover:text-zinc-600">Nao</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(o.id)}
                        className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-6 py-3">Obra</th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Local</th>
                    <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Pavimentos</th>
                    <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Comodos</th>
                    <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Orcamento</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {obras.map((o, idx) => (
                    <tr key={o.id} className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors ${idx % 2 === 0 ? "" : "bg-zinc-50/30"}`}>
                      <td className="px-6 py-4 font-semibold text-zinc-900">{o.nome}</td>
                      <td className="px-4 py-4 text-zinc-500">{o.local}</td>
                      <td className="px-4 py-4 text-center text-zinc-600 tabular-nums">{o.pavimentos.length}</td>
                      <td className="px-4 py-4 text-center text-zinc-600 tabular-nums">{o.pavimentos.reduce((s, p) => s + p.comodos.length, 0)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-zinc-900 tabular-nums">{fmt(o.orcamento_total ?? 0)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/orcamentos/obras/${o.id}`}
                            className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors whitespace-nowrap">
                            Ver detalhes →
                          </Link>
                          <Link href={`/orcamentos/obras/${o.id}/editar`}
                            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                            Editar
                          </Link>
                          {confirmDelete === o.id ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              <span className="text-zinc-500">Excluir?</span>
                              <button onClick={() => handleDelete(o.id)} disabled={deleting}
                                className="text-red-600 font-medium hover:text-red-700 disabled:opacity-50">Sim</button>
                              <button onClick={() => setConfirmDelete(null)} className="text-zinc-400 hover:text-zinc-600">Nao</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmDelete(o.id)}
                              className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

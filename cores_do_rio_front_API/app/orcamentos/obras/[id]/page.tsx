"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API  = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";
const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"];
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixacao", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suite", varanda:"Varanda", lavatorio:"Lavatorio", circulacao:"Circulacao", escritorio:"Escritorio", area_tecnica:"Area Tecnica", escada:"Escada" };
const fmt = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtN = (v: unknown) => Number(v).toFixed(2).replace(".",",");

const INPUT_SM = "border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

type EtapaKey = "massa_parede"|"massa_teto"|"lixacao"|"pintura"|"acabamento";
interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface Comodo { id:string; tipo:string; nome:string|null; parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number; orcamento:OrcComodo; }
interface Pavimento { id:string; nome:string; numero:number; comodos:Comodo[]; orcamento_total:number; }
interface Obra { id:string; nome:string; local:string; created_at:string; orcamento_total:number; obra_precos:{etapa:string;preco_m2:number}[]; pavimentos:Pavimento[]; }

export default function ObraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [obra, setObra]               = useState<Obra | null>(null);
  const [loading, setLoading]         = useState(true);
  const [confirmDeleteObra, setConfirmDeleteObra] = useState(false);
  const [deletingObra, setDeletingObra]           = useState(false);
  const [confirmDeletePav, setConfirmDeletePav]   = useState<string | null>(null);
  const [deletingPav, setDeletingPav]             = useState(false);
  const [addingPav, setAddingPav]     = useState(false);
  const [newPavNome, setNewPavNome]   = useState("");
  const [newPavNum, setNewPavNum]     = useState("");
  const [submittingPav, setSubPav]    = useState(false);
  const [erroPav, setErroPav]         = useState<string | null>(null);

  const fetchObra = useCallback(async () => {
    try { const r = await fetch(`${API}/obras/${id}`); const j = await r.json(); setObra(j.data ?? null); }
    catch { setObra(null); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchObra(); }, [fetchObra]);

  const handleDeleteObra = async () => {
    setDeletingObra(true);
    try {
      const r = await fetch(`${API}/obras/${id}`, { method: "DELETE" });
      if (r.ok) router.push("/orcamentos/obras");
    } finally { setDeletingObra(false); }
  };

  const handleDeletePav = async (pavId: string) => {
    setDeletingPav(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}`, { method: "DELETE" });
      if (r.ok) { setConfirmDeletePav(null); await fetchObra(); }
    } finally { setDeletingPav(false); }
  };

  const handleAddPav = async (e: React.FormEvent) => {
    e.preventDefault(); setErroPav(null); setSubPav(true);
    try {
      const r = await fetch(`${API}/obras/${id}/pavimentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: newPavNome, numero: parseInt(newPavNum) || 0 }),
      });
      if (!r.ok) { const j = await r.json(); setErroPav(j.error ?? "Erro ao adicionar"); return; }
      setNewPavNome(""); setNewPavNum(""); setAddingPav(false);
      await fetchObra();
    } catch { setErroPav("Erro de conexao"); } finally { setSubPav(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!obra)   return <div className="flex items-center justify-center py-40 text-zinc-400">Obra nao encontrada.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/orcamentos" className="hover:text-zinc-700">Orcamentos</Link>
        <span>/</span>
        <Link href="/orcamentos/obras" className="hover:text-zinc-700">Obras</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium truncate max-w-[160px] sm:max-w-none">{obra.nome}</span>
      </div>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">{obra.nome}</h1>
          <p className="text-zinc-500 mt-1 text-sm sm:text-base">{obra.local}</p>
        </div>
        <div className="flex flex-col sm:items-end gap-3 shrink-0">
          <div className="sm:text-right">
            <div className="text-xs sm:text-sm text-zinc-400">Orcamento Total</div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(obra.orcamento_total)}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/orcamentos/obras/${id}/editar`}
              className="text-xs border border-zinc-200 hover:border-zinc-400 text-zinc-600 hover:text-zinc-800 px-3 py-1.5 rounded-lg transition-colors">
              Editar Obra
            </Link>
            {confirmDeleteObra ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="text-zinc-500">Excluir obra?</span>
                <button onClick={handleDeleteObra} disabled={deletingObra}
                  className="text-red-600 font-semibold hover:text-red-700 disabled:opacity-50">Sim</button>
                <button onClick={() => setConfirmDeleteObra(false)} className="text-zinc-400 hover:text-zinc-600">Nao</button>
              </span>
            ) : (
              <button onClick={() => setConfirmDeleteObra(true)}
                className="text-xs text-zinc-400 hover:text-red-500 border border-zinc-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                Excluir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Precos */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 mb-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Precos por m² / Etapa</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ETAPAS.map(e => {
            const p = obra.obra_precos.find(x => x.etapa === e);
            return (
              <div key={e} className="text-center p-3 bg-zinc-50 rounded-lg">
                <div className="text-xs text-zinc-500 mb-1">{ETAPA_LABELS[e]}</div>
                <div className="text-sm sm:text-base font-semibold text-zinc-800">{p ? fmt(Number(p.preco_m2)) : "—"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pavimentos */}
      <div className="space-y-6">
        {obra.pavimentos.map(pav => (
          <div key={pav.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-2">Pavimento {pav.numero}</span>
                <span className="text-base font-semibold text-zinc-900">{pav.nome}</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span className="text-sm font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</span>
                <Link href={`/orcamentos/obras/${obra.id}/pavimentos/${pav.id}`}
                  className="text-xs text-orange-600 hover:text-orange-800 border border-orange-200 hover:border-orange-400 px-3 py-1 rounded-md transition-colors whitespace-nowrap">
                  Ver pavimento
                </Link>
                {confirmDeletePav === pav.id ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="text-zinc-500">Excluir?</span>
                    <button onClick={() => handleDeletePav(pav.id)} disabled={deletingPav}
                      className="text-red-600 font-semibold hover:text-red-700 disabled:opacity-50">Sim</button>
                    <button onClick={() => setConfirmDeletePav(null)} className="text-zinc-400 hover:text-zinc-600">Nao</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeletePav(pav.id)}
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
                    Excluir
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-zinc-50 border-b border-zinc-100">
                  <tr>
                    <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-2">Comodo</th>
                    <th className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">Paredes m²</th>
                    <th className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">Teto m²</th>
                    {ETAPAS.map(e => <th key={e} className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">{ETAPA_LABELS[e]}</th>)}
                    <th className="text-right text-xs font-semibold text-zinc-500 px-4 py-2">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {pav.comodos.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 text-sm">{c.nome || TIPO_LABELS[c.tipo] || c.tipo}</div>
                        <div className="text-xs text-zinc-400">{TIPO_LABELS[c.tipo]}</div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-zinc-600 tabular-nums">{fmtN(c.orcamento.total_paredes)}</td>
                      <td className="px-3 py-3 text-right text-sm text-zinc-600 tabular-nums">{fmtN(c.teto_m2)}</td>
                      {ETAPAS.map(e => (
                        <td key={e} className="px-3 py-3 text-right text-sm text-zinc-600 tabular-nums">{fmt(c.orcamento[e as EtapaKey])}</td>
                      ))}
                      <td className="px-4 py-3 text-right font-semibold text-orange-600 text-sm tabular-nums">{fmt(c.orcamento.total)}</td>
                      <td className="px-3 py-3">
                        <Link href={`/orcamentos/obras/${obra.id}/pavimentos/${pav.id}/comodos/${c.id}`}
                          className="text-xs text-orange-600 hover:text-orange-800 whitespace-nowrap">Detalhe</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-orange-50">
                    <td colSpan={2+ETAPAS.length} className="px-4 py-3 text-sm font-semibold text-zinc-700">Total do Pavimento</td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Adicionar pavimento */}
      <div className="mt-6">
        {addingPav ? (
          <form onSubmit={handleAddPav} className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">Adicionar Pavimento</h3>
            {erroPav && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erroPav}</div>}
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-40">
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nome *</label>
                <input required value={newPavNome} onChange={e => setNewPavNome(e.target.value)}
                  className={`w-full ${INPUT_SM}`} placeholder="Ex: 2 Andar" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Numero *</label>
                <input required type="number" min="0" value={newPavNum} onChange={e => setNewPavNum(e.target.value)}
                  className={`w-full ${INPUT_SM}`} placeholder="N°" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submittingPav}
                  className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  {submittingPav ? "..." : "Adicionar"}
                </button>
                <button type="button" onClick={() => { setAddingPav(false); setErroPav(null); }}
                  className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button onClick={() => setAddingPav(true)}
            className="w-full py-3 border-2 border-dashed border-zinc-200 hover:border-zinc-300 text-zinc-400 hover:text-zinc-600 text-sm rounded-xl transition-colors">
            + Adicionar Pavimento
          </button>
        )}
      </div>

      {/* Total geral */}
      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-sm sm:text-base font-semibold text-zinc-800">Orcamento Total da Obra</span>
        <span className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(obra.orcamento_total)}</span>
      </div>
    </div>
  );
}

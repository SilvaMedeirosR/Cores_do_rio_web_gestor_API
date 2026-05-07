"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";
const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"];
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixacao", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suite", varanda:"Varanda", lavatorio:"Lavatorio", circulacao:"Circulacao", escritorio:"Escritorio", area_tecnica:"Area Tecnica", escada:"Escada" };
const TIPOS_COMODO = [
  { value: "sala", label: "Sala" }, { value: "quarto", label: "Quarto" },
  { value: "banheiro", label: "Banheiro" }, { value: "suite", label: "Suite" },
  { value: "varanda", label: "Varanda" }, { value: "lavatorio", label: "Lavatorio" },
  { value: "circulacao", label: "Circulacao" }, { value: "escritorio", label: "Escritorio" },
  { value: "area_tecnica", label: "Area Tecnica" }, { value: "escada", label: "Escada" },
];
const fmt  = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtN = (v: unknown) => Number(v).toFixed(2).replace(".",",");
const n    = (v: string) => parseFloat(v) || 0;

const INPUT_SM = "border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

type ParadeKey = "parede1_m2"|"parede2_m2"|"parede3_m2"|"parede4_m2";
type EtapaKey  = "massa_parede"|"massa_teto"|"lixacao"|"pintura"|"acabamento";
interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface Comodo { id:string; tipo:string; nome:string|null; parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number; orcamento:OrcComodo; }
interface Pavimento { id:string; nome:string; numero:number; orcamento_total:number; comodos:Comodo[]; obras: { id:string; nome:string }; }

interface ComodoNewForm {
  tipo: string; nome: string;
  parede1_m2: string; parede2_m2: string; parede3_m2: string; parede4_m2: string; teto_m2: string;
}
const emptyComodoForm = (): ComodoNewForm => ({ tipo: "sala", nome: "", parede1_m2: "", parede2_m2: "", parede3_m2: "", parede4_m2: "", teto_m2: "" });

export default function PavimentoDetailPage() {
  const { id, pavId } = useParams<{ id: string; pavId: string }>();
  const router = useRouter();
  const [pav,     setPav]     = useState<Pavimento | null>(null);
  const [loading, setLoading] = useState(true);

  // edit pavimento
  const [editingPav, setEditingPav] = useState(false);
  const [editNome, setEditNome]     = useState("");
  const [editNum,  setEditNum]      = useState("");
  const [savingPav, setSavingPav]   = useState(false);

  // delete pavimento
  const [confirmDeletePav, setConfirmDeletePav] = useState(false);
  const [deletingPav, setDeletingPav]           = useState(false);

  // delete comodo
  const [confirmDeleteCom, setConfirmDeleteCom] = useState<string | null>(null);
  const [deletingCom, setDeletingCom]           = useState(false);

  // add comodo
  const [addingCom, setAddingCom]   = useState(false);
  const [newCom, setNewCom]         = useState<ComodoNewForm>(emptyComodoForm());
  const [submittingCom, setSubCom]  = useState(false);
  const [erroCom, setErroCom]       = useState<string | null>(null);

  const fetchPav = useCallback(async () => {
    try { const r = await fetch(`${API}/pavimentos/${pavId}`); const j = await r.json(); setPav(j.data ?? null); }
    catch { setPav(null); } finally { setLoading(false); }
  }, [pavId]);

  useEffect(() => { fetchPav(); }, [fetchPav]);

  const startEditPav = () => {
    if (!pav) return;
    setEditNome(pav.nome);
    setEditNum(String(pav.numero));
    setEditingPav(true);
  };

  const handleSavePav = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingPav(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editNome, numero: parseInt(editNum) || 0 }),
      });
      if (r.ok) { setEditingPav(false); await fetchPav(); }
    } finally { setSavingPav(false); }
  };

  const handleDeletePav = async () => {
    setDeletingPav(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}`, { method: "DELETE" });
      if (r.ok) router.push(`/orcamentos/obras/${id}`);
    } finally { setDeletingPav(false); }
  };

  const handleDeleteCom = async (comId: string) => {
    setDeletingCom(true);
    try {
      const r = await fetch(`${API}/comodos/${comId}`, { method: "DELETE" });
      if (r.ok) { setConfirmDeleteCom(null); await fetchPav(); }
    } finally { setDeletingCom(false); }
  };

  const handleAddCom = async (e: React.FormEvent) => {
    e.preventDefault(); setErroCom(null); setSubCom(true);
    try {
      const payload = {
        tipo: newCom.tipo, nome: newCom.nome || null,
        parede1_m2: n(newCom.parede1_m2), parede2_m2: n(newCom.parede2_m2),
        parede3_m2: n(newCom.parede3_m2), parede4_m2: n(newCom.parede4_m2),
        teto_m2: n(newCom.teto_m2),
      };
      const r = await fetch(`${API}/pavimentos/${pavId}/comodos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json(); setErroCom(j.error ?? "Erro ao adicionar"); return; }
      setNewCom(emptyComodoForm()); setAddingCom(false);
      await fetchPav();
    } catch { setErroCom("Erro de conexao"); } finally { setSubCom(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!pav)    return <div className="flex items-center justify-center py-40 text-zinc-400">Pavimento nao encontrado.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/orcamentos" className="hover:text-zinc-700">Orcamentos</Link>
        <span>/</span>
        <Link href="/orcamentos/obras" className="hover:text-zinc-700">Obras</Link>
        <span>/</span>
        <Link href={`/orcamentos/obras/${id}`} className="hover:text-zinc-700 truncate max-w-[120px] sm:max-w-none">{pav.obras.nome}</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{pav.nome}</span>
      </div>

      {/* Page header */}
      {editingPav ? (
        <form onSubmit={handleSavePav} className="flex items-end gap-3 flex-wrap mb-8">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Nome</label>
            <input required value={editNome} onChange={e => setEditNome(e.target.value)}
              className={INPUT_SM} placeholder="Nome do pavimento" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Numero</label>
            <input required type="number" min="0" value={editNum} onChange={e => setEditNum(e.target.value)}
              className={`w-20 ${INPUT_SM}`} placeholder="N°" />
          </div>
          <button type="submit" disabled={savingPav}
            className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {savingPav ? "..." : "Salvar"}
          </button>
          <button type="button" onClick={() => setEditingPav(false)}
            className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg transition-colors">
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs sm:text-sm text-zinc-400 mb-1">Pavimento {pav.numero} — {pav.obras.nome}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">{pav.nome}</h1>
          </div>
          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <div className="sm:text-right">
              <div className="text-xs sm:text-sm text-zinc-400">Orcamento do Pavimento</div>
              <div className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={startEditPav}
                className="text-xs border border-zinc-200 hover:border-zinc-400 text-zinc-600 hover:text-zinc-800 px-3 py-1.5 rounded-lg transition-colors">
                Editar
              </button>
              {confirmDeletePav ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-500">Excluir pavimento?</span>
                  <button onClick={handleDeletePav} disabled={deletingPav}
                    className="text-red-600 font-semibold hover:text-red-700 disabled:opacity-50">Sim</button>
                  <button onClick={() => setConfirmDeletePav(false)} className="text-zinc-400 hover:text-zinc-600">Nao</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDeletePav(true)}
                  className="text-xs text-zinc-400 hover:text-red-500 border border-zinc-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                  Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comodos */}
      <div className="space-y-4">
        {pav.comodos.map(c => (
          <div key={c.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-4 bg-zinc-50 border-b border-zinc-100">
              <div>
                <span className="text-base font-semibold text-zinc-900">{c.nome || TIPO_LABELS[c.tipo] || c.tipo}</span>
                <span className="ml-2 text-xs text-zinc-400">{TIPO_LABELS[c.tipo]}</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span className="font-bold text-orange-600 tabular-nums">{fmt(c.orcamento.total)}</span>
                <Link href={`/orcamentos/obras/${id}/pavimentos/${pavId}/comodos/${c.id}`}
                  className="text-xs text-orange-600 hover:text-orange-800 border border-orange-200 hover:border-orange-400 px-3 py-1 rounded-md transition-colors whitespace-nowrap">
                  Ver comodo
                </Link>
                {confirmDeleteCom === c.id ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="text-zinc-500">Excluir?</span>
                    <button onClick={() => handleDeleteCom(c.id)} disabled={deletingCom}
                      className="text-red-600 font-semibold hover:text-red-700 disabled:opacity-50">Sim</button>
                    <button onClick={() => setConfirmDeleteCom(null)} className="text-zinc-400 hover:text-zinc-600">Nao</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeleteCom(c.id)}
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
                    Excluir
                  </button>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Medicoes</h3>
                <div className="space-y-2">
                  {([1,2,3,4] as const).map(n2 => (
                    <div key={n2} className="flex justify-between text-sm">
                      <span className="text-zinc-500">Parede {n2}</span>
                      <span className="font-medium text-zinc-800 tabular-nums">{fmtN(c[`parede${n2}_m2` as ParadeKey])} m²</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm border-t border-zinc-100 pt-2">
                    <span className="text-zinc-500">Total Paredes</span>
                    <span className="font-semibold text-zinc-800 tabular-nums">{fmtN(c.orcamento.total_paredes)} m²</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Teto</span>
                    <span className="font-medium text-zinc-800 tabular-nums">{fmtN(c.teto_m2)} m²</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Orcamento por Etapa</h3>
                <div className="space-y-2">
                  {ETAPAS.map(e => (
                    <div key={e} className="flex justify-between text-sm">
                      <span className="text-zinc-500">{ETAPA_LABELS[e]}</span>
                      <span className="font-medium text-zinc-800 tabular-nums">{fmt(c.orcamento[e as EtapaKey])}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm border-t border-zinc-100 pt-2">
                    <span className="font-semibold text-zinc-700">Total Comodo</span>
                    <span className="font-bold text-orange-600 tabular-nums">{fmt(c.orcamento.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Adicionar comodo */}
      <div className="mt-4">
        {addingCom ? (
          <form onSubmit={handleAddCom} className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">Adicionar Comodo</h3>
            {erroCom && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erroCom}</div>}
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <select value={newCom.tipo} onChange={e => setNewCom(p => ({ ...p, tipo: e.target.value }))}
                  className="border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input value={newCom.nome} onChange={e => setNewCom(p => ({ ...p, nome: e.target.value }))}
                  className={`flex-1 min-w-32 ${INPUT_SM}`} placeholder="Nome opcional" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(["parede1_m2","parede2_m2","parede3_m2","parede4_m2"] as const).map((f, fi) => (
                  <div key={f}>
                    <label className="block text-xs text-zinc-400 mb-1">Parede {fi + 1} m²</label>
                    <input type="number" step="0.01" min="0" value={newCom[f]}
                      onChange={e => setNewCom(p => ({ ...p, [f]: e.target.value }))}
                      className={`w-full ${INPUT_SM}`} placeholder="0,00" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Teto m²</label>
                  <input type="number" step="0.01" min="0" value={newCom.teto_m2}
                    onChange={e => setNewCom(p => ({ ...p, teto_m2: e.target.value }))}
                    className={`w-full ${INPUT_SM}`} placeholder="0,00" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setAddingCom(false); setErroCom(null); setNewCom(emptyComodoForm()); }}
                  className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={submittingCom}
                  className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  {submittingCom ? "..." : "Adicionar"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button onClick={() => setAddingCom(true)}
            className="w-full py-3 border-2 border-dashed border-zinc-200 hover:border-zinc-300 text-zinc-400 hover:text-zinc-600 text-sm rounded-xl transition-colors">
            + Adicionar Comodo
          </button>
        )}
      </div>

      {/* Total geral */}
      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-sm sm:text-base font-semibold text-zinc-800">Orcamento Total do Pavimento</span>
        <span className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</span>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";
const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"] as const;
type Etapa = typeof ETAPAS[number];
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

const INPUT_SM = "border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

type ParadeKey = "parede1_m2"|"parede2_m2"|"parede3_m2"|"parede4_m2";
interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface Comodo {
  id:string; tipo:string; nome:string|null;
  parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number;
  orcamento:OrcComodo;
  pavimentos: { id:string; nome:string; numero:number; obras: { id:string; nome:string; obra_precos:{etapa:string;preco_m2:number}[] } };
}

interface EditForm {
  tipo: string; nome: string;
  parede1_m2: string; parede2_m2: string; parede3_m2: string; parede4_m2: string; teto_m2: string;
}

export default function ComodoDetailPage() {
  const { id, pavId, comId } = useParams<{ id: string; pavId: string; comId: string }>();
  const router = useRouter();
  const [comodo,  setComodo]  = useState<Comodo | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing]         = useState(false);
  const [editForm, setEditForm]       = useState<EditForm | null>(null);
  const [saving, setSaving]           = useState(false);
  const [erroEdit, setErroEdit]       = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const fetchComodo = useCallback(async () => {
    try { const r = await fetch(`${API}/comodos/${comId}`); const j = await r.json(); setComodo(j.data ?? null); }
    catch { setComodo(null); } finally { setLoading(false); }
  }, [comId]);

  useEffect(() => { fetchComodo(); }, [fetchComodo]);

  const startEdit = () => {
    if (!comodo) return;
    setEditForm({
      tipo:       comodo.tipo,
      nome:       comodo.nome ?? "",
      parede1_m2: String(comodo.parede1_m2),
      parede2_m2: String(comodo.parede2_m2),
      parede3_m2: String(comodo.parede3_m2),
      parede4_m2: String(comodo.parede4_m2),
      teto_m2:    String(comodo.teto_m2),
    });
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    setErroEdit(null); setSaving(true);
    try {
      const payload = {
        tipo:       editForm.tipo,
        nome:       editForm.nome,
        parede1_m2: parseFloat(editForm.parede1_m2) || 0,
        parede2_m2: parseFloat(editForm.parede2_m2) || 0,
        parede3_m2: parseFloat(editForm.parede3_m2) || 0,
        parede4_m2: parseFloat(editForm.parede4_m2) || 0,
        teto_m2:    parseFloat(editForm.teto_m2)    || 0,
      };
      const r = await fetch(`${API}/comodos/${comId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json(); setErroEdit(j.error ?? "Erro ao salvar"); return; }
      setEditing(false);
      await fetchComodo();
    } catch { setErroEdit("Erro de conexao"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const r = await fetch(`${API}/comodos/${comId}`, { method: "DELETE" });
      if (r.ok) router.push(`/orcamentos/obras/${id}/pavimentos/${pavId}`);
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!comodo) return <div className="flex items-center justify-center py-40 text-zinc-400">Comodo nao encontrado.</div>;

  const pav  = comodo.pavimentos;
  const obra = pav.obras;
  const precoMap = Object.fromEntries(obra.obra_precos.map(p => [p.etapa, Number(p.preco_m2)]));
  const orc  = comodo.orcamento;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/orcamentos" className="hover:text-zinc-700 shrink-0">Orcamentos</Link>
        <span>/</span>
        <Link href="/orcamentos/obras" className="hover:text-zinc-700 shrink-0">Obras</Link>
        <span>/</span>
        <Link href={`/orcamentos/obras/${id}`} className="hover:text-zinc-700 truncate max-w-[100px] sm:max-w-none">{obra.nome}</Link>
        <span>/</span>
        <Link href={`/orcamentos/obras/${id}/pavimentos/${pavId}`} className="hover:text-zinc-700 truncate max-w-[80px] sm:max-w-none">{pav.nome}</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{comodo.nome || TIPO_LABELS[comodo.tipo]}</span>
      </div>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs sm:text-sm text-zinc-400 mb-1">{obra.nome} / Pav. {pav.numero} — {pav.nome}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">{comodo.nome || TIPO_LABELS[comodo.tipo]}</h1>
          <p className="text-zinc-400 text-sm mt-1">{TIPO_LABELS[comodo.tipo]}</p>
        </div>
        <div className="flex flex-col sm:items-end gap-3 shrink-0">
          <div className="sm:text-right">
            <div className="text-xs sm:text-sm text-zinc-400">Orcamento do Comodo</div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(orc.total)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startEdit}
              className="text-xs border border-zinc-200 hover:border-zinc-400 text-zinc-600 hover:text-zinc-800 px-3 py-1.5 rounded-lg transition-colors">
              Editar Medidas
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="text-zinc-500">Excluir comodo?</span>
                <button onClick={handleDelete} disabled={deleting}
                  className="text-red-600 font-semibold hover:text-red-700 disabled:opacity-50">Sim</button>
                <button onClick={() => setConfirmDelete(false)} className="text-zinc-400 hover:text-zinc-600">Nao</button>
              </span>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="text-xs text-zinc-400 hover:text-red-500 border border-zinc-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                Excluir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing && editForm && (
        <form onSubmit={handleSave} className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Editar Comodo</h2>
          {erroEdit && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{erroEdit}</div>}
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select value={editForm.tipo} onChange={e => setEditForm(p => p ? { ...p, tipo: e.target.value } : p)}
                className="border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input value={editForm.nome} onChange={e => setEditForm(p => p ? { ...p, nome: e.target.value } : p)}
                className={`flex-1 min-w-32 ${INPUT_SM}`} placeholder="Nome opcional" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(["parede1_m2","parede2_m2","parede3_m2","parede4_m2"] as const).map((f, fi) => (
                <div key={f}>
                  <label className="block text-xs text-zinc-400 mb-1">Parede {fi + 1} m²</label>
                  <input type="number" step="0.01" min="0" value={editForm[f as keyof EditForm]}
                    onChange={e => setEditForm(p => p ? { ...p, [f]: e.target.value } : p)}
                    className={`w-full ${INPUT_SM}`} placeholder="0,00" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Teto m²</label>
                <input type="number" step="0.01" min="0" value={editForm.teto_m2}
                  onChange={e => setEditForm(p => p ? { ...p, teto_m2: e.target.value } : p)}
                  className={`w-full ${INPUT_SM}`} placeholder="0,00" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setEditing(false); setErroEdit(null); }}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Cards: Medicoes + Precos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Medicoes</h2>
          <div className="space-y-3">
            {([1,2,3,4] as const).map(n => (
              <div key={n} className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Parede {n}</span>
                <span className="text-sm font-semibold text-zinc-800 tabular-nums">{fmtN(comodo[`parede${n}_m2` as ParadeKey])} m²</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="text-sm font-semibold text-zinc-700">Total Paredes</span>
              <span className="text-sm font-bold text-zinc-900 tabular-nums">{fmtN(orc.total_paredes)} m²</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Teto</span>
              <span className="text-sm font-semibold text-zinc-800 tabular-nums">{fmtN(comodo.teto_m2)} m²</span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="text-sm font-semibold text-zinc-700">Area Total</span>
              <span className="text-sm font-bold text-zinc-900 tabular-nums">{fmtN(orc.total_paredes + Number(comodo.teto_m2))} m²</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Precos de Referencia (m²)</h2>
          <div className="space-y-3">
            {ETAPAS.map(e => (
              <div key={e} className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">{ETAPA_LABELS[e]}</span>
                <span className="text-sm font-semibold text-zinc-800 tabular-nums">{fmt(precoMap[e] ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orcamento detalhado */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-xs sm:text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Detalhamento do Orcamento</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <div className="grid grid-cols-4 py-2 text-xs font-semibold text-zinc-400 uppercase border-b border-zinc-100">
              <span>Etapa</span><span className="text-right">Base m²</span><span className="text-right">Preco/m²</span><span className="text-right">Subtotal</span>
            </div>
            <div className="grid grid-cols-4 py-3 text-sm border-b border-zinc-100">
              <span className="text-zinc-600">Massa Parede</span>
              <span className="text-right text-zinc-500 tabular-nums">{fmtN(orc.total_paredes)} m²</span>
              <span className="text-right text-zinc-500 tabular-nums">{fmt(precoMap.massa_parede ?? 0)}</span>
              <span className="text-right font-semibold text-zinc-800 tabular-nums">{fmt(orc.massa_parede)}</span>
            </div>
            <div className="grid grid-cols-4 py-3 text-sm border-b border-zinc-100">
              <span className="text-zinc-600">Massa Teto</span>
              <span className="text-right text-zinc-500 tabular-nums">{fmtN(comodo.teto_m2)} m²</span>
              <span className="text-right text-zinc-500 tabular-nums">{fmt(precoMap.massa_teto ?? 0)}</span>
              <span className="text-right font-semibold text-zinc-800 tabular-nums">{fmt(orc.massa_teto)}</span>
            </div>
            {(["lixacao","pintura","acabamento"] as const).map(e => (
              <div key={e} className="grid grid-cols-4 py-3 text-sm border-b border-zinc-100">
                <span className="text-zinc-600">{ETAPA_LABELS[e]}</span>
                <span className="text-right text-zinc-500 tabular-nums">{fmtN(orc.total_paredes + Number(comodo.teto_m2))} m²</span>
                <span className="text-right text-zinc-500 tabular-nums">{fmt(precoMap[e] ?? 0)}</span>
                <span className="text-right font-semibold text-zinc-800 tabular-nums">{fmt(orc[e as Etapa])}</span>
              </div>
            ))}
            <div className="grid grid-cols-4 py-3 bg-orange-50 rounded-b-lg">
              <span className="font-bold text-zinc-800">Total</span>
              <span></span><span></span>
              <span className="text-right font-bold text-orange-600 tabular-nums">{fmt(orc.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

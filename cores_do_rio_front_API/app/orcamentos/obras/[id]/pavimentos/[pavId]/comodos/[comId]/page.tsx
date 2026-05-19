"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";
const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"] as const;
type Etapa = typeof ETAPAS[number];
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixação", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suíte", varanda:"Varanda", lavatorio:"Lavatório", circulacao:"Circulação", escritorio:"Escritório", area_tecnica:"Área Técnica", escada:"Escada" };
const TIPOS_COMODO = [
  { value: "sala", label: "Sala" }, { value: "quarto", label: "Quarto" },
  { value: "banheiro", label: "Banheiro" }, { value: "suite", label: "Suíte" },
  { value: "varanda", label: "Varanda" }, { value: "lavatorio", label: "Lavatório" },
  { value: "circulacao", label: "Circulação" }, { value: "escritorio", label: "Escritório" },
  { value: "area_tecnica", label: "Área Técnica" }, { value: "escada", label: "Escada" },
];
const fmt  = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtN = (v: unknown) => Number(v).toFixed(2).replace(".",",");

const INPUT_SM = "border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface ParedeData { m2:number; cor?:string|null; }
interface TetoData   { m2:number; }
interface Comodo {
  id:string; tipo:string; nome:string|null;
  parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number;
  paredes:ParedeData[]; tetos:TetoData[];
  orcamento:OrcComodo;
  pavimentos: { id:string; nome:string; numero:number; obras: { id:string; nome:string; obra_precos:{etapa:string;preco_m2:number}[] } };
}

interface ParedeInput { m2:string; cor:string; }
interface TetoInput   { m2:string; }
interface EditForm { tipo:string; nome:string; paredes:ParedeInput[]; tetos:TetoInput[]; }

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

  const n = (v:string) => parseFloat(v) || 0;

  const startEdit = () => {
    if (!comodo) return;
    let paredes: ParedeInput[];
    if (comodo.paredes?.length > 0) {
      paredes = comodo.paredes.map(p => ({ m2: String(p.m2), cor: p.cor ?? "" }));
    } else {
      paredes = [comodo.parede1_m2, comodo.parede2_m2, comodo.parede3_m2, comodo.parede4_m2]
        .filter(v => Number(v) > 0)
        .map(v => ({ m2: String(v), cor: "" }));
      if (paredes.length === 0) paredes = [{ m2: "", cor: "" }];
    }
    const tetos: TetoInput[] = comodo.tetos?.length > 0
      ? comodo.tetos.map(t => ({ m2: String(t.m2) }))
      : [{ m2: String(comodo.teto_m2) }];
    setEditForm({ tipo: comodo.tipo, nome: comodo.nome ?? "", paredes, tetos });
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    setErroEdit(null); setSaving(true);
    try {
      const payload = {
        tipo: editForm.tipo,
        nome: editForm.nome,
        paredes: editForm.paredes.map(p => ({ m2: n(p.m2), cor: p.cor || null })),
        tetos:   editForm.tetos.map(t => ({ m2: n(t.m2) })),
      };
      const r = await fetch(`${API}/comodos/${comId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json(); setErroEdit(j.error ?? "Erro ao salvar"); return; }
      setEditing(false);
      await fetchComodo();
    } catch { setErroEdit("Erro de conexão"); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const r = await fetch(`${API}/comodos/${comId}`, { method: "DELETE" });
      if (r.ok) router.push(`/orcamentos/obras/${id}/pavimentos/${pavId}`);
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!comodo) return <div className="flex items-center justify-center py-40 text-zinc-400">Cômodo não encontrado.</div>;

  const pav  = comodo.pavimentos;
  const obra = pav.obras;
  const precoMap = Object.fromEntries(obra.obra_precos.map(p => [p.etapa, Number(p.preco_m2)]));
  const orc  = comodo.orcamento;
  const totalTetos = comodo.tetos?.length > 0 ? comodo.tetos.reduce((s,t) => s+Number(t.m2),0) : Number(comodo.teto_m2);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/orcamentos" className="hover:text-zinc-700 shrink-0">Orçamentos</Link>
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
            <div className="text-xs sm:text-sm text-zinc-400">Orçamento do Cômodo</div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(orc.total)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startEdit}
              className="text-xs border border-zinc-200 hover:border-zinc-400 text-zinc-600 hover:text-zinc-800 px-3 py-1.5 rounded-lg transition-colors">
              Editar Medidas
            </button>
            {confirmDelete ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="text-zinc-500">Excluir cômodo?</span>
                <button onClick={handleDelete} disabled={deleting}
                  className="text-red-600 font-semibold hover:text-red-700 disabled:opacity-50">Sim</button>
                <button onClick={() => setConfirmDelete(false)} className="text-zinc-400 hover:text-zinc-600">Não</button>
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
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Editar Cômodo</h2>
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

            {/* Paredes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-500">Paredes</span>
                <button type="button" onClick={() => setEditForm(p => p ? {...p, paredes:[...p.paredes,{m2:"",cor:""}]} : p)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium">+ Adicionar parede</button>
              </div>
              <div className="space-y-2">
                {editForm.paredes.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-400 w-14 shrink-0">Parede {i+1}</span>
                    <input type="number" step="0.01" min="0" value={p.m2}
                      onChange={e => setEditForm(f => { if (!f) return f; const ps=[...f.paredes]; ps[i]={...ps[i],m2:e.target.value}; return {...f,paredes:ps}; })}
                      className={`w-24 ${INPUT_SM}`} placeholder="0,00 m²" />
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={p.cor||"#ffffff"}
                        onChange={e => setEditForm(f => { if (!f) return f; const ps=[...f.paredes]; ps[i]={...ps[i],cor:e.target.value}; return {...f,paredes:ps}; })}
                        className="w-8 h-8 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white" title="Cor da parede" />
                      <input type="text" value={p.cor||""} onChange={e => setEditForm(f => { if (!f) return f; const ps=[...f.paredes]; ps[i]={...ps[i],cor:e.target.value}; return {...f,paredes:ps}; })}
                        className={`w-24 ${INPUT_SM} font-mono text-xs`} placeholder="#rrggbb" />
                    </div>
                    {editForm.paredes.length > 1 && (
                      <button type="button" onClick={() => setEditForm(f => f ? {...f,paredes:f.paredes.filter((_,idx)=>idx!==i)} : f)}
                        className="text-zinc-300 hover:text-red-500 text-sm leading-none">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tetos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-500">Tetos</span>
                <button type="button" onClick={() => setEditForm(p => p ? {...p, tetos:[...p.tetos,{m2:""}]} : p)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium">+ Adicionar teto</button>
              </div>
              <div className="space-y-2">
                {editForm.tetos.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-14 shrink-0">Teto {i+1}</span>
                    <input type="number" step="0.01" min="0" value={t.m2}
                      onChange={e => setEditForm(f => { if (!f) return f; const ts=[...f.tetos]; ts[i]={m2:e.target.value}; return {...f,tetos:ts}; })}
                      className={`w-24 ${INPUT_SM}`} placeholder="0,00 m²" />
                    {editForm.tetos.length > 1 && (
                      <button type="button" onClick={() => setEditForm(f => f ? {...f,tetos:f.tetos.filter((_,idx)=>idx!==i)} : f)}
                        className="text-zinc-300 hover:text-red-500 text-sm leading-none">✕</button>
                    )}
                  </div>
                ))}
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
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Medições</h2>
          <div className="space-y-3">
            {comodo.paredes?.length > 0 ? (
              comodo.paredes.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">Parede {i+1}</span>
                    {p.cor && <span className="w-4 h-4 rounded border border-zinc-200 shrink-0 inline-block" style={{backgroundColor: p.cor}} title={p.cor} />}
                  </div>
                  <span className="text-sm font-semibold text-zinc-800 tabular-nums">{fmtN(p.m2)} m²</span>
                </div>
              ))
            ) : (
              ([1,2,3,4] as const).map(i => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Parede {i}</span>
                  <span className="text-sm font-semibold text-zinc-800 tabular-nums">{fmtN(comodo[`parede${i}_m2` as "parede1_m2"|"parede2_m2"|"parede3_m2"|"parede4_m2"])} m²</span>
                </div>
              ))
            )}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="text-sm font-semibold text-zinc-700">Total Paredes</span>
              <span className="text-sm font-bold text-zinc-900 tabular-nums">{fmtN(orc.total_paredes)} m²</span>
            </div>
            {comodo.tetos?.length > 0 ? (
              comodo.tetos.map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Teto {i+1}</span>
                  <span className="text-sm font-semibold text-zinc-800 tabular-nums">{fmtN(t.m2)} m²</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Teto</span>
                <span className="text-sm font-semibold text-zinc-800 tabular-nums">{fmtN(comodo.teto_m2)} m²</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="text-sm font-semibold text-zinc-700">Área Total</span>
              <span className="text-sm font-bold text-zinc-900 tabular-nums">{fmtN(orc.total_paredes + totalTetos)} m²</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Preços de Referência (m²)</h2>
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
        <h2 className="text-xs sm:text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Detalhamento do Orçamento</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <div className="grid grid-cols-4 py-2 text-xs font-semibold text-zinc-400 uppercase border-b border-zinc-100">
              <span>Etapa</span><span className="text-right">Base m²</span><span className="text-right">Preço/m²</span><span className="text-right">Subtotal</span>
            </div>
            <div className="grid grid-cols-4 py-3 text-sm border-b border-zinc-100">
              <span className="text-zinc-600">Massa Parede</span>
              <span className="text-right text-zinc-500 tabular-nums">{fmtN(orc.total_paredes)} m²</span>
              <span className="text-right text-zinc-500 tabular-nums">{fmt(precoMap.massa_parede ?? 0)}</span>
              <span className="text-right font-semibold text-zinc-800 tabular-nums">{fmt(orc.massa_parede)}</span>
            </div>
            <div className="grid grid-cols-4 py-3 text-sm border-b border-zinc-100">
              <span className="text-zinc-600">Massa Teto</span>
              <span className="text-right text-zinc-500 tabular-nums">{fmtN(totalTetos)} m²</span>
              <span className="text-right text-zinc-500 tabular-nums">{fmt(precoMap.massa_teto ?? 0)}</span>
              <span className="text-right font-semibold text-zinc-800 tabular-nums">{fmt(orc.massa_teto)}</span>
            </div>
            {(["lixacao","pintura","acabamento"] as const).map(e => (
              <div key={e} className="grid grid-cols-4 py-3 text-sm border-b border-zinc-100">
                <span className="text-zinc-600">{ETAPA_LABELS[e]}</span>
                <span className="text-right text-zinc-500 tabular-nums">{fmtN(orc.total_paredes + totalTetos)} m²</span>
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

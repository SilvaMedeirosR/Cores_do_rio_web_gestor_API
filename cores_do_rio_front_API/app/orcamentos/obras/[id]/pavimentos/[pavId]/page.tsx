"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";
const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"];
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixacao", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suite", varanda:"Varanda", lavatorio:"Lavatorio", circulacao:"Circulacao", corredor:"Corredor", escritorio:"Escritorio", area_tecnica:"Area Tecnica", escada:"Escada", casa_maquinas:"Casa de Maquinas", casa_exaustao:"Casa de Exaustao", estacionamento:"Estacionamento", garagem:"Garagem", deposito:"Deposito", area_lazer:"Area de Lazer" };
const TIPOS_COMODO = Object.entries(TIPO_LABELS).map(([value, label]) => ({ value, label }));

const fmt  = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtN = (v: unknown) => Number(v).toFixed(2).replace(".",",");
const n    = (v: string)  => parseFloat(v) || 0;

const INPUT_SM = "border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";
const BTN_SM   = "text-xs border border-zinc-200 hover:border-zinc-400 text-zinc-600 hover:text-zinc-800 px-3 py-1.5 rounded-lg transition-colors";

type EtapaKey = "massa_parede"|"massa_teto"|"lixacao"|"pintura"|"acabamento";

interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface Comodo    { id:string; tipo:string; nome:string|null; parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number; orcamento:OrcComodo; }
interface AptTipo   { id:string; nome:string; }
interface Apartamento { id:string; nome:string|null; numero:number|null; tipo_id:string|null; apartamento_tipos:AptTipo|null; comodos:Comodo[]; orcamento_total:number; }
interface PavOutro  { id:string; nome:string; numero:number; }
interface Pavimento { id:string; nome:string; numero:number; orcamento_total:number; comodos:Comodo[]; apartamentos:Apartamento[]; obras:{ id:string; nome:string; apartamento_tipos:AptTipo[]; pavimentos:PavOutro[] }; }

interface ComodoForm { tipo:string; nome:string; parede1_m2:string; parede2_m2:string; parede3_m2:string; parede4_m2:string; teto_m2:string; }
const emptyComodoForm = (): ComodoForm => ({ tipo:"sala", nome:"", parede1_m2:"", parede2_m2:"", parede3_m2:"", parede4_m2:"", teto_m2:"" });

interface AptForm { nome:string; numero:string; tipo_id:string; }
const emptyAptForm = (): AptForm => ({ nome:"", numero:"", tipo_id:"" });

export default function PavimentoDetailPage() {
  const { id, pavId } = useParams<{ id:string; pavId:string }>();
  const router = useRouter();
  const [pav,     setPav]     = useState<Pavimento | null>(null);
  const [loading, setLoading] = useState(true);

  // editar pavimento
  const [editingPav, setEditingPav] = useState(false);
  const [editNome, setEditNome]     = useState("");
  const [editNum,  setEditNum]      = useState("");
  const [savingPav, setSavingPav]   = useState(false);

  // deletar pavimento
  const [confirmDeletePav, setConfirmDeletePav] = useState(false);
  const [deletingPav, setDeletingPav]           = useState(false);

  // ── Apartamentos ───────────────────────────────────────────────────────────
  const [addingApt,    setAddingApt]    = useState(false);
  const [aptForm,      setAptForm]      = useState<AptForm>(emptyAptForm());
  const [submittingApt,setSubApt]       = useState(false);
  const [erroApt,      setErroApt]      = useState<string|null>(null);
  const [expandedApt,  setExpandedApt]  = useState<Record<string,boolean>>({});
  const [editingApt,   setEditingApt]   = useState<string|null>(null);
  const [editAptForm,  setEditAptForm]  = useState<AptForm>(emptyAptForm());
  const [confirmDelApt,setConfirmDelApt]= useState<string|null>(null);
  const [deletingApt,  setDeletingApt]  = useState(false);

  // clonar pavimento
  const [clonando,     setClonando]     = useState(false);
  const [origemId,     setOrigemId]     = useState("");
  const [manterMedidas,setManterMedidas]= useState(false);
  const [submittingClone,setSubClone]   = useState(false);
  const [erroClone,    setErroClone]    = useState<string|null>(null);

  // tipos de aptamento (gestão rápida)
  const [addingTipo,   setAddingTipo]   = useState(false);
  const [novoTipoNome, setNovoTipoNome] = useState("");
  const [submittingTipo,setSubTipo]     = useState(false);

  // ── Cômodos avulsos ────────────────────────────────────────────────────────
  const [addingCom,    setAddingCom]    = useState(false);
  const [newCom,       setNewCom]       = useState<ComodoForm>(emptyComodoForm());
  const [submittingCom,setSubCom]       = useState(false);
  const [erroCom,      setErroCom]      = useState<string|null>(null);

  // cômodo de apartamento
  const [addingComApt,    setAddingComApt]    = useState<string|null>(null); // aptId
  const [newComApt,       setNewComApt]       = useState<ComodoForm>(emptyComodoForm());
  const [submittingComApt,setSubComApt]       = useState(false);
  const [erroComApt,      setErroComApt]      = useState<string|null>(null);

  // deletar cômodo
  const [confirmDelCom,setConfirmDelCom]= useState<string|null>(null);
  const [deletingCom,  setDeletingCom]  = useState(false);

  const fetchPav = useCallback(async () => {
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}`);
      const j = await r.json();
      setPav(j.data ?? null);
    } catch { setPav(null); } finally { setLoading(false); }
  }, [pavId]);

  useEffect(() => { fetchPav(); }, [fetchPav]);

  // ── Handlers pavimento ─────────────────────────────────────────────────────

  const startEditPav = () => {
    if (!pav) return;
    setEditNome(pav.nome); setEditNum(String(pav.numero)); setEditingPav(true);
  };

  const handleSavePav = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingPav(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ nome:editNome, numero:parseInt(editNum)||0 }),
      });
      if (r.ok) { setEditingPav(false); await fetchPav(); }
    } finally { setSavingPav(false); }
  };

  const handleDeletePav = async () => {
    setDeletingPav(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}`, { method:"DELETE" });
      if (r.ok) router.push(`/orcamentos/obras/${id}`);
    } finally { setDeletingPav(false); }
  };

  // ── Handlers apartamentos ──────────────────────────────────────────────────

  const handleAddApt = async (e: React.FormEvent) => {
    e.preventDefault(); setErroApt(null); setSubApt(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}/apartamentos`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          nome:   aptForm.nome   || null,
          numero: aptForm.numero ? parseInt(aptForm.numero) : null,
          tipo_id:aptForm.tipo_id || null,
        }),
      });
      if (!r.ok) { const j = await r.json(); setErroApt(j.error ?? "Erro"); return; }
      setAptForm(emptyAptForm()); setAddingApt(false); await fetchPav();
    } catch { setErroApt("Erro de conexao"); } finally { setSubApt(false); }
  };

  const startEditApt = (apt: Apartamento) => {
    setEditAptForm({ nome:apt.nome??"", numero:apt.numero!=null?String(apt.numero):"", tipo_id:apt.tipo_id??"" });
    setEditingApt(apt.id);
  };

  const handleSaveApt = async (aptId: string) => {
    try {
      await fetch(`${API}/apartamentos/${aptId}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          nome:   editAptForm.nome   || null,
          numero: editAptForm.numero ? parseInt(editAptForm.numero) : null,
          tipo_id:editAptForm.tipo_id || null,
        }),
      });
      setEditingApt(null); await fetchPav();
    } catch {}
  };

  const handleDeleteApt = async (aptId: string) => {
    setDeletingApt(true);
    try {
      const r = await fetch(`${API}/apartamentos/${aptId}`, { method:"DELETE" });
      if (r.ok) { setConfirmDelApt(null); await fetchPav(); }
    } finally { setDeletingApt(false); }
  };

  // ── Handler clonar pavimento ────────────────────────────────────────────────

  const handleClonar = async (e: React.FormEvent) => {
    e.preventDefault(); setErroClone(null); setSubClone(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}/clonar`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ origem_id: origemId, manter_medidas: manterMedidas }),
      });
      if (!r.ok) { const j = await r.json(); setErroClone(j.error ?? "Erro"); return; }
      setClonando(false); setOrigemId(""); setManterMedidas(false);
      await fetchPav();
    } catch { setErroClone("Erro de conexao"); } finally { setSubClone(false); }
  };

  // ── Handler tipos ──────────────────────────────────────────────────────────

  const handleAddTipo = async (e: React.FormEvent) => {
    e.preventDefault(); setSubTipo(true);
    try {
      await fetch(`${API}/obras/${id}/apartamento-tipos`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ nome: novoTipoNome.trim() }),
      });
      setNovoTipoNome(""); setAddingTipo(false); await fetchPav();
    } finally { setSubTipo(false); }
  };

  const handleDeleteTipo = async (tipoId: string) => {
    await fetch(`${API}/apartamento-tipos/${tipoId}`, { method:"DELETE" });
    await fetchPav();
  };

  // ── Handlers cômodos ───────────────────────────────────────────────────────

  const handleAddComAvulso = async (e: React.FormEvent) => {
    e.preventDefault(); setErroCom(null); setSubCom(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}/comodos`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          tipo:newCom.tipo, nome:newCom.nome||null,
          parede1_m2:n(newCom.parede1_m2), parede2_m2:n(newCom.parede2_m2),
          parede3_m2:n(newCom.parede3_m2), parede4_m2:n(newCom.parede4_m2),
          teto_m2:n(newCom.teto_m2),
        }),
      });
      if (!r.ok) { const j = await r.json(); setErroCom(j.error ?? "Erro"); return; }
      setNewCom(emptyComodoForm()); setAddingCom(false); await fetchPav();
    } catch { setErroCom("Erro de conexao"); } finally { setSubCom(false); }
  };

  const handleAddComApt = async (e: React.FormEvent, aptId: string) => {
    e.preventDefault(); setErroComApt(null); setSubComApt(true);
    try {
      const r = await fetch(`${API}/apartamentos/${aptId}/comodos`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          tipo:newComApt.tipo, nome:newComApt.nome||null,
          parede1_m2:n(newComApt.parede1_m2), parede2_m2:n(newComApt.parede2_m2),
          parede3_m2:n(newComApt.parede3_m2), parede4_m2:n(newComApt.parede4_m2),
          teto_m2:n(newComApt.teto_m2),
        }),
      });
      if (!r.ok) { const j = await r.json(); setErroComApt(j.error ?? "Erro"); return; }
      setNewComApt(emptyComodoForm()); setAddingComApt(null); await fetchPav();
    } catch { setErroComApt("Erro de conexao"); } finally { setSubComApt(false); }
  };

  const handleDeleteCom = async (comId: string) => {
    setDeletingCom(true);
    try {
      const r = await fetch(`${API}/comodos/${comId}`, { method:"DELETE" });
      if (r.ok) { setConfirmDelCom(null); await fetchPav(); }
    } finally { setDeletingCom(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!pav)    return <div className="flex items-center justify-center py-40 text-zinc-400">Pavimento nao encontrado.</div>;

  const tipos  = pav.obras.apartamento_tipos;
  const outros = pav.obras.pavimentos.filter(p => p.id !== pavId);
  const aptLabel = (apt: Apartamento) => {
    const nome = apt.nome ?? (apt.numero != null ? `Apto ${apt.numero}` : "Apartamento");
    const tipo = apt.apartamento_tipos?.nome ? ` · ${apt.apartamento_tipos.nome}` : "";
    return nome + tipo;
  };

  const ComodoRow = ({ c, onDelete }: { c:Comodo; onDelete:(id:string)=>void }) => (
    <tr className="hover:bg-zinc-50/80 transition-colors group">
      <td className="px-4 sm:px-6 py-3">
        <div className="font-medium text-zinc-900 text-sm">{c.nome || TIPO_LABELS[c.tipo]}</div>
        <div className="text-xs text-zinc-400">{TIPO_LABELS[c.tipo]}</div>
      </td>
      <td className="px-3 py-3 text-right text-sm text-zinc-600 tabular-nums">{fmtN(c.orcamento.total_paredes)}</td>
      <td className="px-3 py-3 text-right text-sm text-zinc-600 tabular-nums">{fmtN(c.teto_m2)}</td>
      {ETAPAS.map(e => (
        <td key={e} className="px-3 py-3 text-right text-sm text-zinc-600 tabular-nums">{fmt(c.orcamento[e as EtapaKey])}</td>
      ))}
      <td className="px-3 py-3 text-right font-semibold text-orange-600 text-sm tabular-nums">{fmt(c.orcamento.total)}</td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link href={`/orcamentos/obras/${id}/pavimentos/${pavId}/comodos/${c.id}`}
            className="text-xs text-orange-600 hover:text-orange-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Detalhe
          </Link>
          {confirmDelCom === c.id ? (
            <span className="flex items-center gap-1 text-xs">
              <button onClick={() => onDelete(c.id)} disabled={deletingCom} className="text-red-600 font-semibold">Sim</button>
              <button onClick={() => setConfirmDelCom(null)} className="text-zinc-400">Nao</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelCom(c.id)} className="text-xs text-zinc-300 hover:text-red-500 transition-colors">Excluir</button>
          )}
        </div>
      </td>
    </tr>
  );

  const ComodoTableHead = () => (
    <thead className="bg-zinc-50 border-b border-zinc-100">
      <tr>
        <th className="text-left text-xs font-semibold text-zinc-500 px-4 sm:px-6 py-2">Comodo</th>
        <th className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">Paredes m²</th>
        <th className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">Teto m²</th>
        {ETAPAS.map(e => <th key={e} className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">{ETAPA_LABELS[e]}</th>)}
        <th className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">Total</th>
        <th className="px-3 py-2"></th>
      </tr>
    </thead>
  );

  const AddComodoForm = ({ onSubmit, form, setForm, erro, submitting, onCancel }: {
    onSubmit:(e:React.FormEvent)=>void; form:ComodoForm; setForm:(f:ComodoForm)=>void;
    erro:string|null; submitting:boolean; onCancel:()=>void;
  }) => (
    <form onSubmit={onSubmit} className="p-3 sm:p-4 border-t border-zinc-100 bg-zinc-50/50">
      {erro && <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{erro}</div>}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <select value={form.tipo} onChange={e => setForm({...form, tipo:e.target.value})}
          className="border border-zinc-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
          {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input value={form.nome} onChange={e => setForm({...form, nome:e.target.value})}
          className={`flex-1 min-w-28 ${INPUT_SM}`} placeholder="Nome opcional" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
        {(["parede1_m2","parede2_m2","parede3_m2","parede4_m2"] as const).map((f,fi) => (
          <div key={f}>
            <label className="block text-xs text-zinc-400 mb-1">Parede {fi+1} m²</label>
            <input type="number" step="0.01" min="0" value={form[f]}
              onChange={e => setForm({...form, [f]:e.target.value})}
              className={`w-full ${INPUT_SM}`} placeholder="0,00" />
          </div>
        ))}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Teto m²</label>
          <input type="number" step="0.01" min="0" value={form.teto_m2}
            onChange={e => setForm({...form, teto_m2:e.target.value})}
            className={`w-full ${INPUT_SM}`} placeholder="0,00" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg transition-colors">Cancelar</button>
        <button type="submit" disabled={submitting} className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
          {submitting ? "..." : "Adicionar"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/orcamentos/obras" className="hover:text-zinc-700">Obras</Link>
        <span>/</span>
        <Link href={`/orcamentos/obras/${id}`} className="hover:text-zinc-700 truncate max-w-[120px]">{pav.obras.nome}</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{pav.nome}</span>
      </div>

      {/* Header */}
      {editingPav ? (
        <form onSubmit={handleSavePav} className="flex items-end gap-3 flex-wrap mb-8">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Nome</label>
            <input required value={editNome} onChange={e => setEditNome(e.target.value)} className={INPUT_SM} placeholder="Nome do pavimento" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Numero</label>
            <input required type="number" min="0" value={editNum} onChange={e => setEditNum(e.target.value)} className={`w-20 ${INPUT_SM}`} placeholder="N°" />
          </div>
          <button type="submit" disabled={savingPav} className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {savingPav ? "..." : "Salvar"}
          </button>
          <button type="button" onClick={() => setEditingPav(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg transition-colors">Cancelar</button>
        </form>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs sm:text-sm text-zinc-400 mb-1">Pavimento {pav.numero} — {pav.obras.nome}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">{pav.nome}</h1>
          </div>
          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <div className="sm:text-right">
              <div className="text-xs text-zinc-400">Orcamento do Pavimento</div>
              <div className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={startEditPav} className={BTN_SM}>Editar</button>
              {confirmDeletePav ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-500">Excluir pavimento?</span>
                  <button onClick={handleDeletePav} disabled={deletingPav} className="text-red-600 font-semibold hover:text-red-700 disabled:opacity-50">Sim</button>
                  <button onClick={() => setConfirmDeletePav(false)} className="text-zinc-400 hover:text-zinc-600">Nao</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDeletePav(true)} className="text-xs text-zinc-400 hover:text-red-500 border border-zinc-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors">Excluir</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tipos de Apartamento ──────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Tipos de Apartamento</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Classificacoes para organizar apartamentos desta obra</p>
          </div>
          <button onClick={() => setAddingTipo(t => !t)} className="text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
            {addingTipo ? "Cancelar" : "+ Novo tipo"}
          </button>
        </div>

        {addingTipo && (
          <form onSubmit={handleAddTipo} className="px-4 sm:px-6 py-4 border-b border-zinc-100 flex gap-3">
            <input autoFocus required value={novoTipoNome} onChange={e => setNovoTipoNome(e.target.value)}
              className={`flex-1 ${INPUT_SM}`} placeholder="Ex: Tipo A, Tipo B, Kitnet..." />
            <button type="submit" disabled={submittingTipo} className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {submittingTipo ? "..." : "Criar"}
            </button>
          </form>
        )}

        {tipos.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm text-zinc-400">Nenhum tipo cadastrado ainda</div>
        ) : (
          <div className="flex flex-wrap gap-2 px-4 sm:px-6 py-4">
            {tipos.map(t => (
              <span key={t.id} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-orange-50 text-orange-800 border border-orange-200">
                {t.nome}
                <button onClick={() => handleDeleteTipo(t.id)} className="opacity-0 group-hover:opacity-100 text-orange-400 hover:text-red-500 transition-all text-xs leading-none">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Apartamentos ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">
            Apartamentos
            {pav.apartamentos.length > 0 && <span className="ml-2 text-xs font-normal text-zinc-400">({pav.apartamentos.length})</span>}
          </h2>
          <div className="flex gap-2">
            {outros.length > 0 && (
              <button onClick={() => setClonando(c => !c)} className={BTN_SM}>
                {clonando ? "Cancelar clonar" : "Clonar de outro pav."}
              </button>
            )}
            <button onClick={() => setAddingApt(a => !a)} className="text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
              {addingApt ? "Cancelar" : "+ Adicionar apartamento"}
            </button>
          </div>
        </div>

        {/* Form clonar */}
        {clonando && (
          <form onSubmit={handleClonar} className="px-4 sm:px-6 py-4 border-b border-zinc-100 bg-blue-50/40">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3">Clonar estrutura de outro pavimento</h3>
            {erroClone && <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{erroClone}</div>}
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-40">
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Copiar estrutura de:</label>
                <select required value={origemId} onChange={e => setOrigemId(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">Selecionar pavimento...</option>
                  {outros.map(p => <option key={p.id} value={p.id}>Pav. {p.numero} — {p.nome}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer pb-1.5">
                <input type="checkbox" checked={manterMedidas} onChange={e => setManterMedidas(e.target.checked)}
                  className="w-4 h-4 accent-orange-600" />
                Manter medidas
              </label>
              <button type="submit" disabled={submittingClone || !origemId}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                {submittingClone ? "Clonando..." : "Clonar"}
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Serão copiados os apartamentos e cômodos. {manterMedidas ? "As medidas serão mantidas." : "As medidas serão zeradas (apenas estrutura)."}</p>
          </form>
        )}

        {/* Form novo apartamento */}
        {addingApt && (
          <form onSubmit={handleAddApt} className="px-4 sm:px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
            {erroApt && <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{erroApt}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nome do apartamento</label>
                <input value={aptForm.nome} onChange={e => setAptForm({...aptForm, nome:e.target.value})}
                  className={`w-full ${INPUT_SM}`} placeholder="Ex: Apto 201" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Numero</label>
                <input type="number" value={aptForm.numero} onChange={e => setAptForm({...aptForm, numero:e.target.value})}
                  className={`w-full ${INPUT_SM}`} placeholder="201" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Tipo</label>
                <select value={aptForm.tipo_id} onChange={e => setAptForm({...aptForm, tipo_id:e.target.value})}
                  className="w-full border border-zinc-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">Sem tipo</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setAddingApt(false); setErroApt(null); setAptForm(emptyAptForm()); }}
                className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" disabled={submittingApt}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
                {submittingApt ? "..." : "Adicionar"}
              </button>
            </div>
          </form>
        )}

        {/* Lista de apartamentos */}
        {pav.apartamentos.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-zinc-400">
            Nenhum apartamento neste pavimento. Use o botão acima para adicionar.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {pav.apartamentos.map(apt => {
              const expanded = expandedApt[apt.id] ?? false;
              const isEditing = editingApt === apt.id;
              return (
                <div key={apt.id}>
                  {/* Apt header */}
                  <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 bg-zinc-50/60 hover:bg-zinc-50 transition-colors">
                    <button onClick={() => setExpandedApt(p => ({...p, [apt.id]: !p[apt.id]}))}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left">
                      <svg className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                          <input value={editAptForm.nome} onChange={e => setEditAptForm({...editAptForm, nome:e.target.value})}
                            className={`w-32 ${INPUT_SM} py-1`} placeholder="Nome" />
                          <input type="number" value={editAptForm.numero} onChange={e => setEditAptForm({...editAptForm, numero:e.target.value})}
                            className={`w-20 ${INPUT_SM} py-1`} placeholder="N°" />
                          <select value={editAptForm.tipo_id} onChange={e => setEditAptForm({...editAptForm, tipo_id:e.target.value})}
                            className="border border-zinc-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                            <option value="">Sem tipo</option>
                            {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                          </select>
                          <button onClick={() => handleSaveApt(apt.id)} className="text-xs font-medium text-orange-600 hover:text-orange-700">Salvar</button>
                          <button onClick={() => setEditingApt(null)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-zinc-800 text-sm truncate">{aptLabel(apt)}</span>
                          <span className="text-xs text-zinc-400 shrink-0">{apt.comodos.length} comodo{apt.comodos.length !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-orange-600 tabular-nums">{fmt(apt.orcamento_total)}</span>
                      {!isEditing && (
                        <>
                          <button onClick={() => startEditApt(apt)} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Editar</button>
                          {confirmDelApt === apt.id ? (
                            <span className="flex items-center gap-1 text-xs">
                              <button onClick={() => handleDeleteApt(apt.id)} disabled={deletingApt} className="text-red-600 font-semibold">Sim</button>
                              <button onClick={() => setConfirmDelApt(null)} className="text-zinc-400">Nao</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmDelApt(apt.id)} className="text-xs text-zinc-300 hover:text-red-500 transition-colors">Excluir</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Apt cômodos */}
                  {expanded && (
                    <div>
                      {apt.comodos.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px]">
                            <ComodoTableHead />
                            <tbody className="divide-y divide-zinc-50">
                              {apt.comodos.map(c => (
                                <ComodoRow key={c.id} c={c} onDelete={handleDeleteCom} />
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-orange-50/50">
                                <td colSpan={2+ETAPAS.length} className="px-4 sm:px-6 py-2 text-xs font-semibold text-zinc-600">Total {aptLabel(apt)}</td>
                                <td className="px-3 py-2 text-right font-bold text-orange-600 tabular-nums text-sm">{fmt(apt.orcamento_total)}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {/* Adicionar cômodo ao apartamento */}
                      {addingComApt === apt.id ? (
                        <AddComodoForm
                          onSubmit={(e) => handleAddComApt(e, apt.id)}
                          form={newComApt} setForm={setNewComApt}
                          erro={erroComApt} submitting={submittingComApt}
                          onCancel={() => { setAddingComApt(null); setErroComApt(null); setNewComApt(emptyComodoForm()); }}
                        />
                      ) : (
                        <div className="px-4 sm:px-6 py-2.5 border-t border-zinc-100">
                          <button onClick={() => { setAddingComApt(apt.id); setNewComApt(emptyComodoForm()); }}
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors">
                            + Adicionar comodo a este apartamento
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Cômodos avulsos ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Comodos Avulsos</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Comodos sem apartamento (halls, areas comuns, escadas...)</p>
          </div>
          <button onClick={() => setAddingCom(a => !a)} className="text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
            {addingCom ? "Cancelar" : "+ Adicionar comodo"}
          </button>
        </div>

        {pav.comodos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <ComodoTableHead />
              <tbody className="divide-y divide-zinc-50">
                {pav.comodos.map(c => <ComodoRow key={c.id} c={c} onDelete={handleDeleteCom} />)}
              </tbody>
            </table>
          </div>
        )}

        {addingCom ? (
          <AddComodoForm
            onSubmit={handleAddComAvulso}
            form={newCom} setForm={setNewCom}
            erro={erroCom} submitting={submittingCom}
            onCancel={() => { setAddingCom(false); setErroCom(null); setNewCom(emptyComodoForm()); }}
          />
        ) : pav.comodos.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-zinc-400">Nenhum comodo avulso neste pavimento</div>
        ) : null}
      </div>

      {/* Total geral */}
      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-sm sm:text-base font-semibold text-zinc-800">Orcamento Total do Pavimento</span>
        <span className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</span>
      </div>
    </div>
  );
}

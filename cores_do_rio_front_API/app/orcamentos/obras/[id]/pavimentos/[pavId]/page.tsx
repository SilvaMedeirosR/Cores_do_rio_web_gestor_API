"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { toastSuccess } from "@/lib/toast";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";
const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"];
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixação", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suíte", varanda:"Varanda", lavatorio:"Lavatório", circulacao:"Circulação", corredor:"Corredor", escritorio:"Escritório", area_tecnica:"Área Técnica", escada:"Escada", casa_maquinas:"Casa de Máquinas", casa_exaustao:"Casa de Exaustão", estacionamento:"Estacionamento", garagem:"Garagem", deposito:"Depósito", area_lazer:"Área de Lazer" };
const TIPOS_COMODO = Object.entries(TIPO_LABELS).map(([value, label]) => ({ value, label }));

const fmt  = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtN = (v: unknown) => Number(v).toFixed(2).replace(".",",");
const n    = (v: string)  => parseFloat(v) || 0;

const INPUT_SM = "border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";
const BTN_SM   = "text-xs border border-zinc-200 hover:border-zinc-400 text-zinc-600 hover:text-zinc-800 px-3 py-1.5 rounded-lg transition-colors";

type EtapaKey = "massa_parede"|"massa_teto"|"lixacao"|"pintura"|"acabamento";

interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface ParedeData { m2:number; cor?:string|null; }
interface TetoData   { m2:number; }
interface PrecoTipo  { id:string; nome:string; precos:{ etapa:string; preco_m2:number }[]; }
interface Comodo    { id:string; tipo:string; nome:string|null; parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number; paredes:ParedeData[]; tetos:TetoData[]; orcamento:OrcComodo; preco_tipo_id:string|null; preco_tipo_nome:string|null; }
interface AptTipo   { id:string; nome:string; }
interface Apartamento { id:string; nome:string|null; numero:number|null; tipo_id:string|null; preco_tipo_id:string|null; preco_tipo_nome:string|null; apartamento_tipos:AptTipo|null; comodos:Comodo[]; orcamento_total:number; }
interface PavOutro  { id:string; nome:string; numero:number; }
interface Pavimento { id:string; nome:string; numero:number; orcamento_total:number; comodos:Comodo[]; apartamentos:Apartamento[]; obras:{ id:string; nome:string; apartamento_tipos:AptTipo[]; preco_tipos:PrecoTipo[]; obra_precos:{etapa:string;preco_m2:number}[]; pavimentos:PavOutro[] }; }

interface ParedeInput { m2:string; cor:string; }
interface TetoInput   { m2:string; }
interface ComodoForm { tipo:string; nome:string; paredes:ParedeInput[]; tetos:TetoInput[]; preco_tipo_id:string; }
const emptyComodoForm = (): ComodoForm => ({ tipo:"sala", nome:"", paredes:[{m2:"", cor:""}], tetos:[{m2:""}], preco_tipo_id:"" });

interface AptForm { nome:string; numero:string; tipo_id:string; preco_tipo_id:string; }
const emptyAptForm = (): AptForm => ({ nome:"", numero:"", tipo_id:"", preco_tipo_id:"" });

// ── utilitários de preco_tipo ──────────────────────────────────────────────────
const emptyPrecoTipoPrecos = () => Object.fromEntries(ETAPAS.map(e => [e, ""]));

function tipoPrecoResumo(tipo: PrecoTipo): string {
  return tipo.precos.length === 0
    ? "usa preços gerais"
    : tipo.precos.map(p => `${ETAPA_LABELS[p.etapa]}: ${fmt(Number(p.preco_m2))}`).join(" · ");
}

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
  const [showPTApt,    setShowPTApt]    = useState(false); // toggle preco_tipo no add-apt
  const [expandedApt,  setExpandedApt]  = useState<Record<string,boolean>>({});
  const [editingApt,   setEditingApt]   = useState<string|null>(null);
  const [editAptForm,  setEditAptForm]  = useState<AptForm>(emptyAptForm());
  const [showPTEditApt,setShowPTEditApt]= useState(false); // toggle preco_tipo no edit-apt
  const [confirmDelApt,setConfirmDelApt]= useState<string|null>(null);
  const [deletingApt,  setDeletingApt]  = useState(false);

  // clonar pavimento
  const [clonando,     setClonando]     = useState(false);
  const [origemId,     setOrigemId]     = useState("");
  const [manterMedidas,setManterMedidas]= useState(false);
  const [submittingClone,setSubClone]   = useState(false);
  const [erroClone,    setErroClone]    = useState<string|null>(null);

  // tipos de apartamento
  const [addingTipo,   setAddingTipo]   = useState(false);
  const [novoTipoNome, setNovoTipoNome] = useState("");
  const [submittingTipo,setSubTipo]     = useState(false);

  // ── Preco Tipos ───────────────────────────────────────────────────────────
  const [addingPrecoTipo,   setAddingPrecoTipo]   = useState(false);
  const [novoPTNome,        setNovoPTNome]        = useState("");
  const [novoPTPrecos,      setNovoPTPrecos]      = useState<Record<string,string>>(emptyPrecoTipoPrecos());
  const [submittingPT,      setSubPT]             = useState(false);
  const [editingPrecoTipo,  setEditingPrecoTipo]  = useState<string|null>(null);
  const [editPTNome,        setEditPTNome]        = useState("");
  const [editPTPrecos,      setEditPTPrecos]      = useState<Record<string,string>>(emptyPrecoTipoPrecos());
  const [savingPT,          setSavingPT]          = useState(false);
  const [confirmDelPT,      setConfirmDelPT]      = useState<string|null>(null);

  // ── Cômodos avulsos ────────────────────────────────────────────────────────
  const [addingCom,    setAddingCom]    = useState(false);
  const [newCom,       setNewCom]       = useState<ComodoForm>(emptyComodoForm());
  const [submittingCom,setSubCom]       = useState(false);
  const [erroCom,      setErroCom]      = useState<string|null>(null);
  const [showPTCom,    setShowPTCom]    = useState(false); // toggle preco_tipo cômodo avulso

  // cômodo de apartamento
  const [addingComApt,    setAddingComApt]    = useState<string|null>(null);
  const [newComApt,       setNewComApt]       = useState<ComodoForm>(emptyComodoForm());
  const [submittingComApt,setSubComApt]       = useState(false);
  const [erroComApt,      setErroComApt]      = useState<string|null>(null);
  const [showPTComApt,    setShowPTComApt]    = useState(false); // toggle preco_tipo cômodo de apt

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
      if (r.ok) { toastSuccess("Pavimento salvo!"); setEditingPav(false); await fetchPav(); }
    } finally { setSavingPav(false); }
  };

  const handleDeletePav = async () => {
    setDeletingPav(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}`, { method:"DELETE" });
      if (r.ok) { toastSuccess("Pavimento excluído."); router.push(`/orcamentos/obras/${id}`); }
    } finally { setDeletingPav(false); }
  };

  // ── Handlers apartamentos ──────────────────────────────────────────────────

  const handleAddApt = async (e: React.FormEvent) => {
    e.preventDefault(); setErroApt(null); setSubApt(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}/apartamentos`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          nome:          aptForm.nome    || null,
          numero:        aptForm.numero  ? parseInt(aptForm.numero) : null,
          tipo_id:       aptForm.tipo_id || null,
          preco_tipo_id: aptForm.preco_tipo_id || null,
        }),
      });
      if (!r.ok) { const j = await r.json(); setErroApt(j.error ?? "Erro"); return; }
      toastSuccess("Apartamento adicionado!");
      setAptForm(emptyAptForm()); setAddingApt(false); setShowPTApt(false); await fetchPav();
    } catch { setErroApt("Erro de conexão"); } finally { setSubApt(false); }
  };

  const startEditApt = (apt: Apartamento) => {
    setEditAptForm({ nome:apt.nome??"", numero:apt.numero!=null?String(apt.numero):"", tipo_id:apt.tipo_id??"", preco_tipo_id:apt.preco_tipo_id??"" });
    setShowPTEditApt(!!apt.preco_tipo_id);
    setEditingApt(apt.id);
  };

  const handleSaveApt = async (aptId: string) => {
    try {
      await fetch(`${API}/apartamentos/${aptId}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          nome:          editAptForm.nome          || null,
          numero:        editAptForm.numero        ? parseInt(editAptForm.numero) : null,
          tipo_id:       editAptForm.tipo_id       || null,
          preco_tipo_id: editAptForm.preco_tipo_id || null,
        }),
      });
      toastSuccess("Apartamento salvo!");
      setEditingApt(null); setShowPTEditApt(false); await fetchPav();
    } catch {}
  };

  const handleDeleteApt = async (aptId: string) => {
    setDeletingApt(true);
    try {
      const r = await fetch(`${API}/apartamentos/${aptId}`, { method:"DELETE" });
      if (r.ok) { toastSuccess("Apartamento excluído."); setConfirmDelApt(null); await fetchPav(); }
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
      toastSuccess("Pavimento clonado com sucesso!");
      setClonando(false); setOrigemId(""); setManterMedidas(false);
      await fetchPav();
    } catch { setErroClone("Erro de conexão"); } finally { setSubClone(false); }
  };

  // ── Handlers tipos de apartamento ──────────────────────────────────────────

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

  // ── Handlers preco tipos ────────────────────────────────────────────────────

  const handleAddPrecoTipo = async (e: React.FormEvent) => {
    e.preventDefault(); setSubPT(true);
    try {
      const precos = ETAPAS
        .filter(et => novoPTPrecos[et] !== "")
        .map(et => ({ etapa: et, preco_m2: parseFloat(novoPTPrecos[et]) || 0 }));
      await fetch(`${API}/obras/${id}/preco-tipos`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ nome: novoPTNome.trim(), precos }),
      });
      setNovoPTNome(""); setNovoPTPrecos(emptyPrecoTipoPrecos()); setAddingPrecoTipo(false);
      await fetchPav();
    } finally { setSubPT(false); }
  };

  const startEditPrecoTipo = (tipo: PrecoTipo) => {
    setEditPTNome(tipo.nome);
    const map = emptyPrecoTipoPrecos();
    tipo.precos.forEach(p => { map[p.etapa] = String(p.preco_m2); });
    setEditPTPrecos(map);
    setEditingPrecoTipo(tipo.id);
  };

  const handleSavePrecoTipo = async (tipoId: string) => {
    setSavingPT(true);
    try {
      const precos = ETAPAS
        .filter(et => editPTPrecos[et] !== "")
        .map(et => ({ etapa: et, preco_m2: parseFloat(editPTPrecos[et]) || 0 }));
      await fetch(`${API}/preco-tipos/${tipoId}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ nome: editPTNome.trim(), precos }),
      });
      toastSuccess("Tipo de preço salvo!");
      setEditingPrecoTipo(null); await fetchPav();
    } finally { setSavingPT(false); }
  };

  const handleDeletePrecoTipo = async (tipoId: string) => {
    await fetch(`${API}/preco-tipos/${tipoId}`, { method:"DELETE" });
    setConfirmDelPT(null); await fetchPav();
  };

  // ── Handlers cômodos ───────────────────────────────────────────────────────

  const handleAddComAvulso = async (e: React.FormEvent) => {
    e.preventDefault(); setErroCom(null); setSubCom(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}/comodos`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          tipo:          newCom.tipo, nome:newCom.nome||null,
          preco_tipo_id: newCom.preco_tipo_id || null,
          paredes:       newCom.paredes.map(p => ({ m2:n(p.m2), cor:p.cor||null })),
          tetos:         newCom.tetos.map(t => ({ m2:n(t.m2) })),
        }),
      });
      if (!r.ok) { const j = await r.json(); setErroCom(j.error ?? "Erro"); return; }
      toastSuccess("Cômodo adicionado!");
      setNewCom(emptyComodoForm()); setAddingCom(false); setShowPTCom(false); await fetchPav();
    } catch { setErroCom("Erro de conexão"); } finally { setSubCom(false); }
  };

  const handleAddComApt = async (e: React.FormEvent, aptId: string) => {
    e.preventDefault(); setErroComApt(null); setSubComApt(true);
    try {
      const r = await fetch(`${API}/apartamentos/${aptId}/comodos`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          tipo:          newComApt.tipo, nome:newComApt.nome||null,
          preco_tipo_id: newComApt.preco_tipo_id || null,
          paredes:       newComApt.paredes.map(p => ({ m2:n(p.m2), cor:p.cor||null })),
          tetos:         newComApt.tetos.map(t => ({ m2:n(t.m2) })),
        }),
      });
      if (!r.ok) { const j = await r.json(); setErroComApt(j.error ?? "Erro"); return; }
      toastSuccess("Cômodo adicionado!");
      setNewComApt(emptyComodoForm()); setAddingComApt(null); setShowPTComApt(false); await fetchPav();
    } catch { setErroComApt("Erro de conexão"); } finally { setSubComApt(false); }
  };

  const handleDeleteCom = async (comId: string) => {
    setDeletingCom(true);
    try {
      const r = await fetch(`${API}/comodos/${comId}`, { method:"DELETE" });
      if (r.ok) { toastSuccess("Cômodo excluído."); setConfirmDelCom(null); await fetchPav(); }
    } finally { setDeletingCom(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!pav)    return <div className="flex items-center justify-center py-40 text-zinc-400">Pavimento não encontrado.</div>;

  const tipos      = pav.obras.apartamento_tipos;
  const precoTipos = pav.obras.preco_tipos;
  const obraPrecos = pav.obras.obra_precos;
  const outros     = pav.obras.pavimentos.filter(p => p.id !== pavId);
  const aptLabel   = (apt: Apartamento) => {
    const nome = apt.nome ?? (apt.numero != null ? `Apto ${apt.numero}` : "Apartamento");
    const tipo = apt.apartamento_tipos?.nome ? ` · ${apt.apartamento_tipos.nome}` : "";
    return nome + tipo;
  };

  // ── Componente de linha de cômodo ─────────────────────────────────────────
  const ComodoRow = ({ c, onDelete }: { c:Comodo; onDelete:(id:string)=>void }) => (
    <tr className="hover:bg-zinc-50/80 transition-colors group">
      <td className="px-4 sm:px-6 py-3">
        <div className="font-medium text-zinc-900 text-sm">{c.nome || TIPO_LABELS[c.tipo]}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-zinc-400">{TIPO_LABELS[c.tipo]}</span>
          {c.preco_tipo_nome && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              {c.preco_tipo_nome}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-right text-sm text-zinc-600 tabular-nums">{fmtN(c.orcamento.total_paredes)}</td>
      <td className="px-3 py-3 text-right text-sm text-zinc-600 tabular-nums">
        {fmtN(c.tetos?.length > 0 ? c.tetos.reduce((s,t) => s + Number(t.m2), 0) : c.teto_m2)}
      </td>
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
              <button onClick={() => setConfirmDelCom(null)} className="text-zinc-400">Não</button>
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
        <th className="text-left text-xs font-semibold text-zinc-500 px-4 sm:px-6 py-2">Cômodo</th>
        <th className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">Paredes m²</th>
        <th className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">Teto m²</th>
        {ETAPAS.map(e => <th key={e} className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">{ETAPA_LABELS[e]}</th>)}
        <th className="text-right text-xs font-semibold text-zinc-500 px-3 py-2">Total</th>
        <th className="px-3 py-2"></th>
      </tr>
    </thead>
  );

  // ── Formulário de cômodo (com toggle de preco_tipo) ───────────────────────
  const AddComodoForm = ({ onSubmit, form, setForm, erro, submitting, onCancel, showPT, setShowPT }: {
    onSubmit:(e:React.FormEvent)=>void; form:ComodoForm; setForm:(f:ComodoForm)=>void;
    erro:string|null; submitting:boolean; onCancel:()=>void;
    showPT:boolean; setShowPT:(v:boolean)=>void;
  }) => {
    const addParede = () => setForm({...form, paredes:[...form.paredes, {m2:"", cor:""}]});
    const removeParede = (i:number) => setForm({...form, paredes:form.paredes.filter((_,idx)=>idx!==i)});
    const updParede = (i:number, field:"m2"|"cor", val:string) => {
      const p = [...form.paredes]; p[i]={...p[i],[field]:val}; setForm({...form, paredes:p});
    };
    const addTeto = () => setForm({...form, tetos:[...form.tetos, {m2:""}]});
    const removeTeto = (i:number) => setForm({...form, tetos:form.tetos.filter((_,idx)=>idx!==i)});
    const updTeto = (i:number, val:string) => {
      const t=[...form.tetos]; t[i]={m2:val}; setForm({...form, tetos:t});
    };
    return (
      <form onSubmit={onSubmit} className="p-3 sm:p-4 border-t border-zinc-100 bg-zinc-50/50">
        {erro && <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{erro}</div>}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <select value={form.tipo} onChange={e => setForm({...form, tipo:e.target.value})}
            className="border border-zinc-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
            {TIPOS_COMODO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input value={form.nome} onChange={e => setForm({...form, nome:e.target.value})}
            className={`flex-1 min-w-28 ${INPUT_SM}`} placeholder="Nome opcional" />
        </div>

        {/* Paredes */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-zinc-500">Paredes</span>
            <button type="button" onClick={addParede} className="text-xs text-orange-600 hover:text-orange-700 font-medium">+ Adicionar parede</button>
          </div>
          <div className="space-y-2">
            {form.paredes.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 w-14 shrink-0">Parede {i+1}</span>
                <input type="number" step="0.01" min="0" value={p.m2}
                  onChange={e => updParede(i,"m2",e.target.value)}
                  className={`w-24 ${INPUT_SM}`} placeholder="0,00 m²" />
                <div className="flex items-center gap-1.5">
                  <input type="color" value={p.cor||"#ffffff"}
                    onChange={e => updParede(i,"cor",e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-zinc-200 p-0.5 bg-white" title="Cor da parede" />
                  <input type="text" value={p.cor||""} onChange={e => updParede(i,"cor",e.target.value)}
                    className={`w-24 ${INPUT_SM} font-mono text-xs`} placeholder="#rrggbb" />
                </div>
                {form.paredes.length > 1 && (
                  <button type="button" onClick={() => removeParede(i)} className="text-zinc-300 hover:text-red-500 text-sm leading-none ml-auto">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tetos */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-zinc-500">Tetos</span>
            <button type="button" onClick={addTeto} className="text-xs text-orange-600 hover:text-orange-700 font-medium">+ Adicionar teto</button>
          </div>
          <div className="space-y-2">
            {form.tetos.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 w-14 shrink-0">Teto {i+1}</span>
                <input type="number" step="0.01" min="0" value={t.m2}
                  onChange={e => updTeto(i, e.target.value)}
                  className={`w-24 ${INPUT_SM}`} placeholder="0,00 m²" />
                {form.tetos.length > 1 && (
                  <button type="button" onClick={() => removeTeto(i)} className="text-zinc-300 hover:text-red-500 text-sm leading-none">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tipo de Preço — oculto por padrão */}
        {precoTipos.length > 0 && (
          <div className="mb-3">
            {!showPT ? (
              <button type="button" onClick={() => setShowPT(true)}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-1">
                <span>Personalizar preço</span>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-zinc-500">Tipo de preço</span>
                  <button type="button" onClick={() => { setShowPT(false); setForm({...form, preco_tipo_id:""}); }}
                    className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1">
                    <span>Ocultar</span>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                </div>
                <select value={form.preco_tipo_id} onChange={e => setForm({...form, preco_tipo_id:e.target.value})}
                  className={`w-full ${INPUT_SM}`}>
                  <option value="">— Padrão geral da obra —</option>
                  {precoTipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg transition-colors">Cancelar</button>
          <button type="submit" disabled={submitting} className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
            {submitting ? "..." : "Adicionar"}
          </button>
        </div>
      </form>
    );
  };

  // ── Seção: Tipos de Preço ─────────────────────────────────────────────────
  const PrecoTiposSection = () => (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Tipos de Preço</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Grupos de preço/m² alternativos ao padrão da obra</p>
        </div>
        <button onClick={() => { setAddingPrecoTipo(p => !p); setNovoPTNome(""); setNovoPTPrecos(emptyPrecoTipoPrecos()); }}
          className="text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
          {addingPrecoTipo ? "Cancelar" : "+ Novo tipo"}
        </button>
      </div>

      {/* Form criar novo tipo de preço */}
      {addingPrecoTipo && (
        <form onSubmit={handleAddPrecoTipo} className="px-4 sm:px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div className="mb-3">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nome do tipo *</label>
            <input autoFocus required value={novoPTNome} onChange={e => setNovoPTNome(e.target.value)}
              className={`w-full max-w-xs ${INPUT_SM}`} placeholder="Ex: Tinta Epóxi, Massa Premium..." />
          </div>
          <div className="mb-1.5">
            <p className="text-xs text-zinc-400 mb-2">Preços/m² — deixe em branco para usar o padrão da obra nessa etapa</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {ETAPAS.map(et => (
                <div key={et}>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">
                    {ETAPA_LABELS[et]}
                    {obraPrecos.find(p => p.etapa === et) && (
                      <span className="text-zinc-300 font-normal ml-1">
                        (geral: {fmt(Number(obraPrecos.find(p => p.etapa === et)?.preco_m2))})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">R$</span>
                    <input type="number" step="0.01" min="0" value={novoPTPrecos[et]}
                      onChange={e => setNovoPTPrecos(p => ({...p, [et]: e.target.value}))}
                      className="w-full border border-zinc-200 rounded-lg pl-7 pr-2 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow"
                      placeholder="—" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <button type="button" onClick={() => setAddingPrecoTipo(false)}
              className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={submittingPT || !novoPTNome.trim()}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
              {submittingPT ? "..." : "Criar"}
            </button>
          </div>
        </form>
      )}

      {/* Lista de tipos de preço */}
      {precoTipos.length === 0 && !addingPrecoTipo ? (
        <div className="px-6 py-6 text-center text-sm text-zinc-400">Nenhum tipo de preço cadastrado</div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {precoTipos.map(tipo => (
            <div key={tipo.id}>
              {/* Header do tipo */}
              <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                {editingPrecoTipo === tipo.id ? (
                  <div className="flex-1 min-w-0">
                    <input value={editPTNome} onChange={e => setEditPTNome(e.target.value)}
                      className={`w-full max-w-xs ${INPUT_SM} mb-2`} placeholder="Nome do tipo" />
                    <p className="text-xs text-zinc-400 mb-2">Deixe em branco para usar o padrão da obra</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
                      {ETAPAS.map(et => (
                        <div key={et}>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">
                            {ETAPA_LABELS[et]}
                            {obraPrecos.find(p => p.etapa === et) && (
                              <span className="text-zinc-300 font-normal ml-1">({fmt(Number(obraPrecos.find(p => p.etapa === et)?.preco_m2))})</span>
                            )}
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">R$</span>
                            <input type="number" step="0.01" min="0" value={editPTPrecos[et]}
                              onChange={e => setEditPTPrecos(p => ({...p, [et]: e.target.value}))}
                              className="w-full border border-zinc-200 rounded-lg pl-6 pr-2 py-1.5 text-xs text-zinc-900 bg-white placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              placeholder="—" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSavePrecoTipo(tipo.id)} disabled={savingPT}
                        className="text-xs font-medium bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-3 py-1.5 rounded-lg transition-colors">
                        {savingPT ? "..." : "Salvar"}
                      </button>
                      <button onClick={() => setEditingPrecoTipo(null)}
                        className="text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 px-3 py-1.5 rounded-lg transition-colors">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <span className="font-semibold text-sm text-zinc-900">{tipo.nome}</span>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">{tipoPrecoResumo(tipo)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => startEditPrecoTipo(tipo)}
                        className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Editar</button>
                      {confirmDelPT === tipo.id ? (
                        <span className="flex items-center gap-1 text-xs">
                          <button onClick={() => handleDeletePrecoTipo(tipo.id)} className="text-red-600 font-semibold">Sim</button>
                          <button onClick={() => setConfirmDelPT(null)} className="text-zinc-400">Não</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDelPT(tipo.id)} className="text-xs text-zinc-300 hover:text-red-500 transition-colors">Excluir</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px", fontSize: "0.72rem", color: "rgba(26,42,58,0.4)", marginBottom: "clamp(1.25rem,3vw,2rem)" }}>
        <Link href="/orcamentos/obras" style={{ color: "rgba(26,42,58,0.4)", textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#1A2A3A"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(26,42,58,0.4)"}
        >Obras</Link>
        <ChevronRight size={11} />
        <Link href={`/orcamentos/obras/${id}`} style={{ color: "rgba(26,42,58,0.4)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#1A2A3A"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(26,42,58,0.4)"}
        >{pav.obras.nome}</Link>
        <ChevronRight size={11} />
        <span style={{ color: "#1A2A3A", fontWeight: 500 }}>{pav.nome}</span>
      </div>

      {/* Header */}
      {editingPav ? (
        <form onSubmit={handleSavePav} className="flex items-end gap-3 flex-wrap mb-8">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Nome</label>
            <input required value={editNome} onChange={e => setEditNome(e.target.value)} className={INPUT_SM} placeholder="Nome do pavimento" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Número</label>
            <input required type="number" min="0" value={editNum} onChange={e => setEditNum(e.target.value)} className={`w-20 ${INPUT_SM}`} placeholder="N°" />
          </div>
          <button type="submit" disabled={savingPav} className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {savingPav ? "..." : "Salvar"}
          </button>
          <button type="button" onClick={() => setEditingPav(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg transition-colors">Cancelar</button>
        </form>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "clamp(1.5rem,3vw,2rem)" }}>
          <div>
            <p style={{ fontSize: "0.75rem", color: "rgba(26,42,58,0.4)", marginBottom: "4px" }}>Pavimento {pav.numero} — {pav.obras.nome}</p>
            <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1 }}>{pav.nome}</h1>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.7rem", color: "rgba(26,42,58,0.4)", marginBottom: "2px" }}>Orçamento do Pavimento</div>
              <div style={{ fontSize: "clamp(1.25rem,3vw,1.75rem)", fontWeight: 700, color: "#1A2A3A", fontVariantNumeric: "tabular-nums" }}>{fmt(pav.orcamento_total)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={startEditPav}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "7px 12px", borderRadius: "8px", border: "1px solid rgba(26,42,58,0.14)", color: "#1A2A3A", background: "none", cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.35)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.14)"}
              ><Pencil size={11} strokeWidth={2} /> Editar</button>
              {confirmDeletePav ? (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
                  <span style={{ color: "rgba(26,42,58,0.5)" }}>Excluir?</span>
                  <button onClick={handleDeletePav} disabled={deletingPav} style={{ color: "#dc2626", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Sim</button>
                  <button onClick={() => setConfirmDeletePav(false)} style={{ color: "rgba(26,42,58,0.4)", background: "none", border: "none", cursor: "pointer" }}>Não</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDeletePav(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "7px 12px", borderRadius: "8px", border: "1px solid rgba(26,42,58,0.14)", color: "rgba(26,42,58,0.45)", background: "none", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#dc2626"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,38,38,0.3)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(26,42,58,0.45)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.14)"; }}
                ><Trash2 size={11} strokeWidth={2} /> Excluir</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tipos de Preço ────────────────────────────────────────────────────── */}
      <PrecoTiposSection />

      {/* ── Tipos de Apartamento ──────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Tipos de Apartamento</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Classificações para organizar apartamentos desta obra</p>
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
            <p className="text-xs text-zinc-400 mt-2">Os tipos de preço de cômodos e apartamentos também serão preservados.</p>
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
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Número</label>
                <input type="number" value={aptForm.numero} onChange={e => setAptForm({...aptForm, numero:e.target.value})}
                  className={`w-full ${INPUT_SM}`} placeholder="201" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Tipo de apt.</label>
                <select value={aptForm.tipo_id} onChange={e => setAptForm({...aptForm, tipo_id:e.target.value})}
                  className="w-full border border-zinc-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">Sem tipo</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            </div>
            {/* Tipo de preço — oculto por padrão */}
            {precoTipos.length > 0 && (
              <div className="mb-3">
                {!showPTApt ? (
                  <button type="button" onClick={() => setShowPTApt(true)}
                    className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-1">
                    <span>Personalizar preço do apartamento</span>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-zinc-500">Tipo de preço do apartamento</label>
                      <button type="button" onClick={() => { setShowPTApt(false); setAptForm({...aptForm, preco_tipo_id:""}); }}
                        className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1">
                        <span>Ocultar</span>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                    </div>
                    <select value={aptForm.preco_tipo_id} onChange={e => setAptForm({...aptForm, preco_tipo_id:e.target.value})}
                      className={`w-full max-w-xs ${INPUT_SM}`}>
                      <option value="">— Padrão geral da obra —</option>
                      {precoTipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                    <p className="text-xs text-zinc-400 mt-1">Os cômodos sem tipo próprio herdarão este preço</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setAddingApt(false); setErroApt(null); setAptForm(emptyAptForm()); setShowPTApt(false); }}
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
              const expanded  = expandedApt[apt.id] ?? false;
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
                        <div className="flex flex-col gap-2 w-full" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2 flex-wrap">
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
                            <button onClick={() => { setEditingApt(null); setShowPTEditApt(false); }} className="text-xs text-zinc-400 hover:text-zinc-600">Cancelar</button>
                          </div>
                          {/* Tipo de preço no edit — oculto por padrão */}
                          {precoTipos.length > 0 && (
                            <div>
                              {!showPTEditApt ? (
                                <button type="button" onClick={() => setShowPTEditApt(true)}
                                  className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1">
                                  <span>Personalizar preço</span>
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <select value={editAptForm.preco_tipo_id} onChange={e => setEditAptForm({...editAptForm, preco_tipo_id:e.target.value})}
                                    className={`${INPUT_SM} py-1`}>
                                    <option value="">— Padrão geral —</option>
                                    {precoTipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                  </select>
                                  <button type="button" onClick={() => { setShowPTEditApt(false); setEditAptForm({...editAptForm, preco_tipo_id:""}); }}
                                    className="text-xs text-zinc-400 hover:text-zinc-600">✕</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-zinc-800 text-sm truncate">{aptLabel(apt)}</span>
                          <span className="text-xs text-zinc-400 shrink-0">{apt.comodos.length} cômodo{apt.comodos.length !== 1 ? "s" : ""}</span>
                          {apt.preco_tipo_nome && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                              {apt.preco_tipo_nome}
                            </span>
                          )}
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
                              <button onClick={() => setConfirmDelApt(null)} className="text-zinc-400">Não</button>
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
                          showPT={showPTComApt} setShowPT={setShowPTComApt}
                          onCancel={() => { setAddingComApt(null); setErroComApt(null); setNewComApt(emptyComodoForm()); setShowPTComApt(false); }}
                        />
                      ) : (
                        <div className="px-4 sm:px-6 py-2.5 border-t border-zinc-100">
                          <button onClick={() => { setAddingComApt(apt.id); setNewComApt(emptyComodoForm()); setShowPTComApt(false); }}
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors">
                            + Adicionar cômodo a este apartamento
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
            <h2 className="text-sm font-semibold text-zinc-900">Cômodos Avulsos</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Cômodos sem apartamento (halls, áreas comuns, escadas...)</p>
          </div>
          <button onClick={() => { setAddingCom(a => !a); if (addingCom) { setShowPTCom(false); setNewCom(emptyComodoForm()); } }}
            className="text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-colors">
            {addingCom ? "Cancelar" : "+ Adicionar cômodo"}
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
            showPT={showPTCom} setShowPT={setShowPTCom}
            onCancel={() => { setAddingCom(false); setErroCom(null); setNewCom(emptyComodoForm()); setShowPTCom(false); }}
          />
        ) : pav.comodos.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-zinc-400">Nenhum cômodo avulso neste pavimento</div>
        ) : null}
      </div>

      {/* Total geral */}
      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-sm sm:text-base font-semibold text-zinc-800">Orçamento Total do Pavimento</span>
        <span className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</span>
      </div>
    </div>
  );
}

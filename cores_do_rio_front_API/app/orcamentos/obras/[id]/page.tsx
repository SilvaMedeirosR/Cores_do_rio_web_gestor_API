"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Pencil, Trash2, Plus } from "lucide-react";
import { toastSuccess } from "@/lib/toast";

const API  = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";
const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"];
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixação", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suíte", varanda:"Varanda", lavatorio:"Lavatório", circulacao:"Circulação", corredor:"Corredor", escritorio:"Escritório", area_tecnica:"Área Técnica", escada:"Escada", casa_maquinas:"Casa de Máquinas", casa_exaustao:"Casa de Exaustão", estacionamento:"Estacionamento", garagem:"Garagem", deposito:"Depósito", area_lazer:"Área de Lazer" };
const fmt = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtN = (v: unknown) => Number(v).toFixed(2).replace(".",",");

const INPUT_SM = "border border-zinc-200 rounded-lg px-2.5 py-2 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

type EtapaKey = "massa_parede"|"massa_teto"|"lixacao"|"pintura"|"acabamento";
interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface Comodo { id:string; tipo:string; nome:string|null; parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number; orcamento:OrcComodo; }
interface ApartamentoTipo { id:string; nome:string; }
interface Apartamento { id:string; nome:string|null; numero:number|null; tipo_id:string|null; apartamento_tipos:ApartamentoTipo|null; comodos:Comodo[]; orcamento_total:number; }
interface Pavimento { id:string; nome:string; numero:number; tipo:string; comodos:Comodo[]; apartamentos:Apartamento[]; orcamento_total:number; }
interface Obra { id:string; nome:string; local:string; created_at:string; orcamento_total:number; obra_precos:{etapa:string;preco_m2:number}[]; pavimentos:Pavimento[]; apartamento_tipos:ApartamentoTipo[]; }

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
  const [expandedPav, setExpandedPav] = useState<Record<string,boolean>>({});

  const fetchObra = useCallback(async () => {
    try { const r = await fetch(`${API}/obras/${id}`); const j = await r.json(); setObra(j.data ?? null); }
    catch { setObra(null); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchObra(); }, [fetchObra]);

  const togglePav = (pavId: string) =>
    setExpandedPav(p => ({ ...p, [pavId]: !p[pavId] }));

  const handleDeleteObra = async () => {
    setDeletingObra(true);
    try {
      const r = await fetch(`${API}/obras/${id}`, { method: "DELETE" });
      if (r.ok) { toastSuccess("Obra excluída."); router.push("/orcamentos/obras"); }
    } finally { setDeletingObra(false); }
  };

  const handleDeletePav = async (pavId: string) => {
    setDeletingPav(true);
    try {
      const r = await fetch(`${API}/pavimentos/${pavId}`, { method: "DELETE" });
      if (r.ok) { toastSuccess("Pavimento excluído."); setConfirmDeletePav(null); await fetchObra(); }
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
      toastSuccess("Pavimento adicionado!");
      setNewPavNome(""); setNewPavNum(""); setAddingPav(false);
      await fetchObra();
    } catch { setErroPav("Erro de conexão"); } finally { setSubPav(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!obra)   return <div className="flex items-center justify-center py-40 text-zinc-400">Obra não encontrada.</div>;

  const aptLabel = (apt: Apartamento) => {
    const n = apt.nome ?? (apt.numero != null ? `Apto ${apt.numero}` : "Apartamento");
    const t = apt.apartamento_tipos?.nome ? ` · ${apt.apartamento_tipos.nome}` : "";
    return n + t;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px", fontSize: "0.72rem", color: "rgba(26,42,58,0.4)", marginBottom: "clamp(1.25rem,3vw,2rem)" }}>
        <Link href="/orcamentos" style={{ color: "rgba(26,42,58,0.4)", textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#1A2A3A"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(26,42,58,0.4)"}
        >Orçamentos</Link>
        <ChevronRight size={11} />
        <Link href="/orcamentos/obras" style={{ color: "rgba(26,42,58,0.4)", textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#1A2A3A"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(26,42,58,0.4)"}
        >Obras</Link>
        <ChevronRight size={11} />
        <span style={{ color: "#1A2A3A", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{obra.nome}</span>
      </div>

      {/* Page header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "clamp(1.5rem,3vw,2rem)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1, marginBottom: "4px" }}>{obra.nome}</h1>
          <p style={{ fontSize: "0.85rem", color: "rgba(26,42,58,0.5)" }}>{obra.local}</p>
          {obra.apartamento_tipos.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
              {obra.apartamento_tipos.map(t => (
                <span key={t.id} style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "99px", fontSize: "0.7rem", fontWeight: 500, backgroundColor: "rgba(26,42,58,0.07)", color: "#1A2A3A" }}>
                  {t.nome}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(26,42,58,0.4)", marginBottom: "2px" }}>Orçamento Total</div>
            <div style={{ fontSize: "clamp(1.25rem,3vw,1.75rem)", fontWeight: 700, color: "#1A2A3A", fontVariantNumeric: "tabular-nums" }}>{fmt(obra.orcamento_total)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link href={`/orcamentos/obras/${id}/editar`}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "7px 12px", borderRadius: "8px", border: "1px solid rgba(26,42,58,0.14)", color: "#1A2A3A", textDecoration: "none", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.35)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.14)"}
            >
              <Pencil size={11} strokeWidth={2} /> Editar
            </Link>
            {confirmDeleteObra ? (
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
                <span style={{ color: "rgba(26,42,58,0.5)" }}>Excluir?</span>
                <button onClick={handleDeleteObra} disabled={deletingObra} style={{ color: "#dc2626", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Sim</button>
                <button onClick={() => setConfirmDeleteObra(false)} style={{ color: "rgba(26,42,58,0.4)", background: "none", border: "none", cursor: "pointer" }}>Não</button>
              </span>
            ) : (
              <button onClick={() => setConfirmDeleteObra(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "7px 12px", borderRadius: "8px", border: "1px solid rgba(26,42,58,0.14)", color: "rgba(26,42,58,0.45)", background: "none", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#dc2626"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,38,38,0.3)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(26,42,58,0.45)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.14)"; }}
              >
                <Trash2 size={11} strokeWidth={2} /> Excluir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Precos */}
      <div style={{ backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.10)", borderRadius: "14px", padding: "clamp(1rem,3vw,1.5rem)", marginBottom: "clamp(1rem,2vw,1.5rem)", boxShadow: "0 1px 4px rgba(26,42,58,0.07)" }}>
        <h2 style={{ fontSize: "0.65rem", fontWeight: 600, color: "rgba(26,42,58,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "14px" }}>Preços por m² / Etapa</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
          {ETAPAS.map(e => {
            const p = obra.obra_precos.find(x => x.etapa === e);
            return (
              <div key={e} style={{ textAlign: "center", padding: "10px 12px", backgroundColor: "rgba(26,42,58,0.03)", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.65rem", color: "rgba(26,42,58,0.45)", marginBottom: "4px" }}>{ETAPA_LABELS[e]}</div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1A2A3A" }}>{p ? fmt(Number(p.preco_m2)) : "—"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pavimentos */}
      <div className="space-y-4">
        {obra.pavimentos.map(pav => {
          const totalApts  = pav.apartamentos.length;
          const totalAvul  = pav.comodos.length;
          const expanded   = expandedPav[pav.id] ?? false;

          return (
            <div key={pav.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">

              {/* Pavimento header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-4 bg-zinc-50 border-b border-zinc-200">
                <button onClick={() => togglePav(pav.id)} className="flex items-center gap-2 text-left min-w-0">
                  <ChevronRight size={15} style={{ color: "rgba(26,42,58,0.35)", flexShrink: 0, transition: "transform 0.2s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }} />
                  <div>
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-2">{pav.tipo === "subsolo" ? "Subsolo" : "Pavimento"} {pav.numero}</span>
                    <span className="text-base font-semibold text-zinc-900">{pav.nome}</span>
                  </div>
                </button>
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap pl-6 sm:pl-0">
                  <div className="flex gap-2 text-xs text-zinc-400">
                    {totalApts > 0 && <span className="bg-zinc-100 px-2 py-0.5 rounded-full">{totalApts} apto{totalApts !== 1 ? "s" : ""}</span>}
                    {totalAvul > 0 && <span className="bg-zinc-100 px-2 py-0.5 rounded-full">{totalAvul} avulso{totalAvul !== 1 ? "s" : ""}</span>}
                  </div>
                  <span className="text-sm font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</span>
                  <Link href={`/orcamentos/obras/${obra.id}/pavimentos/${pav.id}`}
                    className="text-xs text-orange-600 hover:text-orange-800 border border-orange-200 hover:border-orange-400 px-3 py-1 rounded-md transition-colors whitespace-nowrap">
                    Gerenciar
                  </Link>
                  {confirmDeletePav === pav.id ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="text-zinc-500">Excluir?</span>
                      <button onClick={() => handleDeletePav(pav.id)} disabled={deletingPav}
                        className="text-red-600 font-semibold hover:text-red-700 disabled:opacity-50">Sim</button>
                      <button onClick={() => setConfirmDeletePav(null)} className="text-zinc-400 hover:text-zinc-600">Não</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDeletePav(pav.id)}
                      className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
                      Excluir
                    </button>
                  )}
                </div>
              </div>

              {/* Detalhes expandidos */}
              {expanded && (
                <div className="divide-y divide-zinc-100">

                  {/* Apartamentos */}
                  {pav.apartamentos.map(apt => (
                    <div key={apt.id}>
                      <div className="px-4 sm:px-6 py-2.5 bg-blue-50/40 flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-800">{aptLabel(apt)}</span>
                        <span className="text-xs font-bold text-orange-600 tabular-nums">{fmt(apt.orcamento_total)}</span>
                      </div>
                      {apt.comodos.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[540px]">
                            <tbody className="divide-y divide-zinc-50">
                              {apt.comodos.map(c => (
                                <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                                  <td className="px-6 py-2.5">
                                    <div className="font-medium text-zinc-800 text-sm">{c.nome || TIPO_LABELS[c.tipo] || c.tipo}</div>
                                    <div className="text-xs text-zinc-400">{TIPO_LABELS[c.tipo]}</div>
                                  </td>
                                  <td className="px-3 py-2.5 text-right text-xs text-zinc-500 tabular-nums">{fmtN(c.orcamento.total_paredes)} m²</td>
                                  <td className="px-3 py-2.5 text-right text-xs text-zinc-500 tabular-nums">{fmtN(c.teto_m2)} m²</td>
                                  {ETAPAS.map(e => (
                                    <td key={e} className="px-3 py-2.5 text-right text-xs text-zinc-600 tabular-nums">{fmt(c.orcamento[e as EtapaKey])}</td>
                                  ))}
                                  <td className="px-4 py-2.5 text-right text-sm font-semibold text-orange-600 tabular-nums">{fmt(c.orcamento.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Cômodos avulsos */}
                  {pav.comodos.length > 0 && (
                    <div>
                      <div className="px-4 sm:px-6 py-2.5 bg-zinc-50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-500">Cômodos avulsos</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[540px]">
                          <tbody className="divide-y divide-zinc-50">
                            {pav.comodos.map(c => (
                              <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-6 py-2.5">
                                  <div className="font-medium text-zinc-800 text-sm">{c.nome || TIPO_LABELS[c.tipo] || c.tipo}</div>
                                  <div className="text-xs text-zinc-400">{TIPO_LABELS[c.tipo]}</div>
                                </td>
                                <td className="px-3 py-2.5 text-right text-xs text-zinc-500 tabular-nums">{fmtN(c.orcamento.total_paredes)} m²</td>
                                <td className="px-3 py-2.5 text-right text-xs text-zinc-500 tabular-nums">{fmtN(c.teto_m2)} m²</td>
                                {ETAPAS.map(e => (
                                  <td key={e} className="px-3 py-2.5 text-right text-xs text-zinc-600 tabular-nums">{fmt(c.orcamento[e as EtapaKey])}</td>
                                ))}
                                <td className="px-4 py-2.5 text-right text-sm font-semibold text-orange-600 tabular-nums">{fmt(c.orcamento.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {pav.apartamentos.length === 0 && pav.comodos.length === 0 && (
                    <div className="px-6 py-8 text-center text-sm text-zinc-400">
                      Nenhum cômodo ou apartamento. <Link href={`/orcamentos/obras/${obra.id}/pavimentos/${pav.id}`} className="text-orange-600 hover:underline">Adicionar</Link>
                    </div>
                  )}

                  {/* Total do pavimento */}
                  <div className="px-4 sm:px-6 py-3 bg-orange-50 flex justify-between items-center">
                    <span className="text-sm font-semibold text-zinc-700">Total {pav.nome}</span>
                    <span className="font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Número *</label>
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
            style={{ width: "100%", padding: "14px", border: "2px dashed rgba(26,42,58,0.14)", borderRadius: "12px", backgroundColor: "transparent", color: "rgba(26,42,58,0.4)", fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", transition: "border-color 0.15s, color 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.35)"; (e.currentTarget as HTMLElement).style.color = "#1A2A3A"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,42,58,0.14)"; (e.currentTarget as HTMLElement).style.color = "rgba(26,42,58,0.4)"; }}
          >
            <Plus size={14} strokeWidth={2} /> Adicionar Pavimento
          </button>
        )}
      </div>

      {/* Total geral */}
      <div style={{ marginTop: "clamp(1rem,2vw,1.5rem)", backgroundColor: "rgba(26,42,58,0.04)", border: "1px solid rgba(26,42,58,0.12)", borderRadius: "14px", padding: "clamp(1rem,3vw,1.5rem)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#1A2A3A" }}>Orçamento Total da Obra</span>
        <span style={{ fontSize: "clamp(1.25rem,3vw,1.75rem)", fontWeight: 700, color: "#1A2A3A", fontVariantNumeric: "tabular-nums" }}>{fmt(obra.orcamento_total)}</span>
      </div>
    </div>
  );
}

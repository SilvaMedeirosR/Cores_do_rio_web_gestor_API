"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API_FIN = process.env.NEXT_PUBLIC_API_FINANCEIRO ?? "";
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixação", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suíte", varanda:"Varanda", lavatorio:"Lavatório", circulacao:"Circulação", escritorio:"Escritório", area_tecnica:"Área Técnica", escada:"Escada", corredor:"Corredor", casa_maquinas:"Casa de Máquinas", casa_exaustao:"Casa de Exaustão", estacionamento:"Estacionamento", garagem:"Garagem", deposito:"Depósito", area_lazer:"Área de Lazer" };
const fmt     = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const calcPct = (pago: number, teto: number) => teto > 0 ? Math.min(Math.round((pago / teto) * 100), 100) : 0;

interface EtapaProgresso { etapa: string; orcamento: number; valor_pago: number; concluida: boolean; }
interface ComodoFin { id: string; tipo: string; nome: string|null; etapa_atual: string; orcamento_total: number; valor_pago: number; etapas: EtapaProgresso[]; }
interface PavimentoFin { id: string; nome: string; numero: number; orcamento_total: number; valor_pago: number; comodos: ComodoFin[]; }
interface ObraFin { id: string; nome: string; local: string; orcamento_total: number; valor_pago: number; pavimentos: PavimentoFin[]; }

export default function FinanceiroObraPage() {
  const { id } = useParams<{ id: string }>();
  const [obra,     setObra]     = useState<ObraFin | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${API_FIN}/obras/${id}`)
      .then(r => r.json())
      .then(j => {
        setObra(j.data ?? null);
        if (j.data?.pavimentos) {
          setExpanded(new Set(j.data.pavimentos.map((p: PavimentoFin) => p.id)));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const togglePav = (pavId: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(pavId) ? next.delete(pavId) : next.add(pavId);
      return next;
    });

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!obra)   return <div className="flex items-center justify-center py-40 text-zinc-400">Obra não encontrada.</div>;

  const totalPct = calcPct(obra.valor_pago, obra.orcamento_total);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/financeiro" className="hover:text-zinc-700 shrink-0">Financeiro</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium truncate max-w-[200px] sm:max-w-none">{obra.nome}</span>
      </div>

      {/* Obra header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">{obra.nome}</h1>
            <p className="text-zinc-500 mt-1 text-sm sm:text-base">{obra.local}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
              <span>{obra.pavimentos.length} pavimento{obra.pavimentos.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{obra.pavimentos.reduce((s, p) => s + p.comodos.length, 0)} cômodo{obra.pavimentos.reduce((s, p) => s + p.comodos.length, 0) !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="sm:text-right shrink-0">
            <div className="text-xs text-zinc-400">Orçamento Total</div>
            <div className="text-2xl font-bold text-orange-600 tabular-nums">{fmt(obra.orcamento_total)}</div>
            <div className="text-xs text-zinc-400 mt-0.5 tabular-nums">{fmt(obra.valor_pago)} pago</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
          <span className="font-semibold">Progresso Geral da Obra</span>
          <span className="tabular-nums">{totalPct}%</span>
        </div>
        <div className="h-3 bg-zinc-200 rounded-full overflow-hidden">
          <div className="h-full bg-orange-600 rounded-full transition-all duration-500" style={{ width: `${totalPct}%` }} />
        </div>
      </div>

      {/* Pavimentos */}
      <div className="space-y-4">
        {obra.pavimentos.map(pav => {
          const pavPct = calcPct(pav.valor_pago, pav.orcamento_total);
          const isOpen = expanded.has(pav.id);
          return (
            <div key={pav.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">

              {/* Header clicável */}
              <button
                onClick={() => togglePav(pav.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 bg-zinc-50 border-b border-zinc-200 hover:bg-zinc-100 transition-colors text-left">
                <div className="flex items-center gap-2 flex-1">
                  <svg className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div>
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-2">Pav. {pav.numero}</span>
                    <span className="text-base font-semibold text-zinc-900">{pav.nome}</span>
                    <span className="ml-2 text-xs text-zinc-400">{pav.comodos.length} cômodo{pav.comodos.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="pl-6 sm:pl-0 sm:text-right shrink-0">
                  <div className="text-xs text-zinc-400">Orçamento</div>
                  <div className="text-base font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</div>
                </div>
              </button>

              {/* Barra do pavimento */}
              <div className="px-5 py-2.5 border-b border-zinc-100">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>Progresso do Pavimento</span>
                  <span className="tabular-nums">{fmt(pav.valor_pago)} pago · {pavPct}%</span>
                </div>
                <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${pavPct}%` }} />
                </div>
              </div>

              {/* Comodos */}
              {isOpen && (
                <div className="divide-y divide-zinc-100">
                  {pav.comodos.map(c => {
                    const comPct = calcPct(c.valor_pago, c.orcamento_total);
                    return (
                      <div key={c.id} className="p-5">
                        {/* Cabeçalho do cômodo */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div>
                            <div className="font-semibold text-zinc-900">
                              {c.nome ? c.nome : (TIPO_LABELS[c.tipo] ?? c.tipo)}
                            </div>
                            {c.nome && <div className="text-xs text-zinc-400">{TIPO_LABELS[c.tipo] ?? c.tipo}</div>}
                          </div>
                          <div className="sm:text-right shrink-0">
                            <div className="text-xs text-zinc-400">Orçamento</div>
                            <div className="font-bold text-orange-600 tabular-nums">{fmt(c.orcamento_total)}</div>
                          </div>
                        </div>

                        {/* Badge etapa atual */}
                        <div className="mb-4">
                          <span className="inline-flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                            Etapa atual: {ETAPA_LABELS[c.etapa_atual] ?? c.etapa_atual}
                          </span>
                        </div>

                        {/* Barras por etapa */}
                        <div className="space-y-3.5">
                          {c.etapas.map(e => {
                            const ePct = calcPct(e.valor_pago, e.orcamento);
                            return (
                              <div key={e.etapa}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-zinc-600">{ETAPA_LABELS[e.etapa]}</span>
                                    {e.concluida && (
                                      <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Concluída</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-zinc-400 tabular-nums">{fmt(e.valor_pago)} / {fmt(e.orcamento)}</span>
                                </div>
                                <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${e.concluida ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                    style={{ width: `${ePct}%` }}
                                  />
                                </div>
                                <div className="text-right text-xs text-zinc-400 mt-0.5 tabular-nums">{ePct}%</div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Barra total do cômodo */}
                        <div className="mt-4 pt-3.5 border-t border-zinc-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-zinc-700">Total Cômodo</span>
                            <span className="text-xs text-zinc-500 tabular-nums">{fmt(c.valor_pago)} / {fmt(c.orcamento_total)}</span>
                          </div>
                          <div className="h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-600 rounded-full transition-all duration-500" style={{ width: `${comPct}%` }} />
                          </div>
                          <div className="text-right text-xs text-zinc-400 mt-0.5 tabular-nums">{comPct}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

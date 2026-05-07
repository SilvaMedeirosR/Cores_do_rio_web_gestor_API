"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API     = process.env.NEXT_PUBLIC_API_ORCAMENTO  ?? "";
const API_FIN = process.env.NEXT_PUBLIC_API_FINANCEIRO ?? "";

const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"];
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixacao", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suite", varanda:"Varanda", lavatorio:"Lavatorio", circulacao:"Circulacao", escritorio:"Escritorio", area_tecnica:"Area Tecnica", escada:"Escada" };
const fmt = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtN = (v: unknown) => Number(v).toFixed(2).replace(".",",");
const calcPct = (pago: number, teto: number) => teto > 0 ? Math.min(Math.round((pago / teto) * 100), 100) : 0;

type EtapaKey = "massa_parede"|"massa_teto"|"lixacao"|"pintura"|"acabamento";
interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface Comodo { id:string; tipo:string; nome:string|null; parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number; orcamento:OrcComodo; }
interface Pavimento { id:string; nome:string; numero:number; comodos:Comodo[]; orcamento_total:number; }
interface Obra { id:string; nome:string; local:string; created_at:string; orcamento_total:number; obra_precos:{etapa:string;preco_m2:number}[]; pavimentos:Pavimento[]; }
interface ProgressoEtapa { comodo_id:string; etapa:string; valor_pago:number; concluida:boolean; }

export default function ObraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [obra,     setObra]     = useState<Obra | null>(null);
  const [progresso, setProgresso] = useState<ProgressoEtapa[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch(`${API}/obras/${id}`)
      .then(r => r.json()).then(j => setObra(j.data ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!obra) return;
    const ids = obra.pavimentos.flatMap(p => p.comodos.map(c => c.id)).join(',');
    if (!ids) return;
    fetch(`${API_FIN}/progresso?ids=${ids}`)
      .then(r => r.json()).then(j => setProgresso(j.data ?? []));
  }, [obra]);

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!obra)   return <div className="flex items-center justify-center py-40 text-zinc-400">Obra nao encontrada.</div>;

  const getProgPav = (pav: Pavimento) => {
    const ids = new Set(pav.comodos.map(c => c.id));
    const etapas = progresso.filter(p => ids.has(p.comodo_id));
    const pago   = etapas.reduce((s, p) => s + Number(p.valor_pago), 0);
    return { pago, p: calcPct(pago, pav.orcamento_total) };
  };

  const totalPago = progresso.reduce((s, p) => s + Number(p.valor_pago), 0);
  const totalPct  = calcPct(totalPago, obra.orcamento_total);

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
        <div className="sm:text-right shrink-0">
          <div className="text-xs sm:text-sm text-zinc-400">Orcamento Total</div>
          <div className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(obra.orcamento_total)}</div>
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
        {obra.pavimentos.map(pav => {
          const { pago: pavPago, p: pavPct } = getProgPav(pav);
          return (
            <div key={pav.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-4 bg-zinc-50 border-b border-zinc-200">
                <div>
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-2">Pavimento {pav.numero}</span>
                  <span className="text-base font-semibold text-zinc-900">{pav.nome}</span>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-sm font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</span>
                  <Link href={`/orcamentos/obras/${obra.id}/pavimentos/${pav.id}`}
                    className="text-xs text-orange-600 hover:text-orange-800 border border-orange-200 hover:border-orange-400 px-3 py-1 rounded-md transition-colors whitespace-nowrap">
                    Ver pavimento
                  </Link>
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

              {/* Barra de progresso do pavimento */}
              <div className="px-4 sm:px-6 py-3 border-t border-zinc-100 bg-zinc-50">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
                  <span className="font-medium">Progresso Financeiro</span>
                  <span className="tabular-nums">{fmt(pavPago)} pago · {pavPct}%</span>
                </div>
                <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${pavPct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total geral com barra de progresso */}
      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <span className="text-sm sm:text-base font-semibold text-zinc-800">Orcamento Total da Obra</span>
          <span className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(obra.orcamento_total)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
          <span className="font-medium">Progresso Financeiro</span>
          <span className="tabular-nums">{fmt(totalPago)} pago · {totalPct}%</span>
        </div>
        <div className="h-3 bg-orange-200 rounded-full overflow-hidden">
          <div className="h-full bg-orange-600 rounded-full transition-all duration-500" style={{ width: `${totalPct}%` }} />
        </div>
        <div className="text-right text-xs text-orange-700 mt-0.5 tabular-nums">{totalPct}%</div>
      </div>
    </div>
  );
}

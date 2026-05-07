"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API     = process.env.NEXT_PUBLIC_API_ORCAMENTO  ?? "";
const API_FIN = process.env.NEXT_PUBLIC_API_FINANCEIRO ?? "";

const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"];
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixacao", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suite", varanda:"Varanda", lavatorio:"Lavatorio", circulacao:"Circulacao", escritorio:"Escritorio", area_tecnica:"Area Tecnica", escada:"Escada" };
const fmt  = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtN = (v: unknown) => Number(v).toFixed(2).replace(".",",");
const calcPct = (pago: number, teto: number) => teto > 0 ? Math.min(Math.round((pago / teto) * 100), 100) : 0;

type ParadeKey = "parede1_m2"|"parede2_m2"|"parede3_m2"|"parede4_m2";
type EtapaKey  = "massa_parede"|"massa_teto"|"lixacao"|"pintura"|"acabamento";
interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface Comodo { id:string; tipo:string; nome:string|null; parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number; orcamento:OrcComodo; }
interface Pavimento { id:string; nome:string; numero:number; orcamento_total:number; comodos:Comodo[]; obras: { id:string; nome:string }; }
interface ProgressoEtapa { comodo_id:string; etapa:string; valor_pago:number; concluida:boolean; }

export default function PavimentoDetailPage() {
  const { id, pavId } = useParams<{ id: string; pavId: string }>();
  const [pav,      setPav]      = useState<Pavimento | null>(null);
  const [progresso, setProgresso] = useState<ProgressoEtapa[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch(`${API}/pavimentos/${pavId}`)
      .then(r => r.json()).then(j => setPav(j.data ?? null))
      .finally(() => setLoading(false));
  }, [pavId]);

  useEffect(() => {
    if (!pav || pav.comodos.length === 0) return;
    const ids = pav.comodos.map(c => c.id).join(',');
    fetch(`${API_FIN}/progresso?ids=${ids}`)
      .then(r => r.json()).then(j => setProgresso(j.data ?? []));
  }, [pav]);

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!pav)    return <div className="flex items-center justify-center py-40 text-zinc-400">Pavimento nao encontrado.</div>;

  const getProgComodo = (comodoId: string, teto: number) => {
    const etapas = progresso.filter(p => p.comodo_id === comodoId);
    const pago   = etapas.reduce((s, p) => s + Number(p.valor_pago), 0);
    return { pago, p: calcPct(pago, teto) };
  };

  const totalPago = progresso.reduce((s, p) => s + Number(p.valor_pago), 0);
  const totalPct  = calcPct(totalPago, pav.orcamento_total);

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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs sm:text-sm text-zinc-400 mb-1">Pavimento {pav.numero} — {pav.obras.nome}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">{pav.nome}</h1>
        </div>
        <div className="sm:text-right shrink-0">
          <div className="text-xs sm:text-sm text-zinc-400">Orcamento do Pavimento</div>
          <div className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</div>
        </div>
      </div>

      {/* Comodos */}
      <div className="space-y-4">
        {pav.comodos.map(c => {
          const { pago, p } = getProgComodo(c.id, c.orcamento.total);
          return (
            <div key={c.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-4 bg-zinc-50 border-b border-zinc-100">
                <div>
                  <span className="text-base font-semibold text-zinc-900">{c.nome || TIPO_LABELS[c.tipo] || c.tipo}</span>
                  <span className="ml-2 text-xs text-zinc-400">{TIPO_LABELS[c.tipo]}</span>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="font-bold text-orange-600 tabular-nums">{fmt(c.orcamento.total)}</span>
                  <Link href={`/orcamentos/obras/${id}/pavimentos/${pavId}/comodos/${c.id}`}
                    className="text-xs text-orange-600 hover:text-orange-800 border border-orange-200 hover:border-orange-400 px-3 py-1 rounded-md transition-colors whitespace-nowrap">
                    Ver comodo
                  </Link>
                </div>
              </div>
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Medicoes</h3>
                  <div className="space-y-2">
                    {([1,2,3,4] as const).map(n => (
                      <div key={n} className="flex justify-between text-sm">
                        <span className="text-zinc-500">Parede {n}</span>
                        <span className="font-medium text-zinc-800 tabular-nums">{fmtN(c[`parede${n}_m2` as ParadeKey])} m²</span>
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

              {/* Barra de progresso do comodo */}
              <div className="px-4 sm:px-6 pb-4 pt-1 border-t border-zinc-100">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
                  <span className="font-medium">Progresso Financeiro</span>
                  <span className="tabular-nums">{fmt(pago)} pago · {p}%</span>
                </div>
                <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${p}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total geral com barra de progresso */}
      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <span className="text-sm sm:text-base font-semibold text-zinc-800">Orcamento Total do Pavimento</span>
          <span className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">{fmt(pav.orcamento_total)}</span>
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

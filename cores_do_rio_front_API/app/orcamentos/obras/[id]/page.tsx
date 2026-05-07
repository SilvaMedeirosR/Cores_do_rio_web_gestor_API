"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API  = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";
const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"];
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixacao", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suite", varanda:"Varanda", lavatorio:"Lavatorio", circulacao:"Circulacao", escritorio:"Escritorio", area_tecnica:"Area Tecnica", escada:"Escada" };
const fmt = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtN = (v: unknown) => Number(v).toFixed(2).replace(".",",");

interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface Comodo { id:string; tipo:string; nome:string|null; parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number; orcamento:OrcComodo; }
interface Pavimento { id:string; nome:string; numero:number; comodos:Comodo[]; orcamento_total:number; }
interface Obra { id:string; nome:string; local:string; created_at:string; orcamento_total:number; obra_precos:{etapa:string;preco_m2:number}[]; pavimentos:Pavimento[]; }

export default function ObraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [obra, setObra]     = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/obras/${id}`)
      .then(r => r.json()).then(j => setObra(j.data ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!obra)   return <div className="flex items-center justify-center py-40 text-zinc-400">Obra nao encontrada.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/orcamentos" className="hover:text-zinc-700">Orcamentos</Link>
        <span>/</span>
        <Link href="/orcamentos/obras" className="hover:text-zinc-700">Obras</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{obra.nome}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">{obra.nome}</h1>
          <p className="text-zinc-500 mt-1">{obra.local}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-zinc-400">Orcamento Total</div>
          <div className="text-2xl font-bold text-orange-600">{fmt(obra.orcamento_total)}</div>
        </div>
      </div>

      {/* Precos */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Precos por m² / Etapa</h2>
        <div className="grid grid-cols-5 gap-4">
          {ETAPAS.map(e => {
            const p = obra.obra_precos.find(x => x.etapa === e);
            return (
              <div key={e} className="text-center p-3 bg-zinc-50 rounded-lg">
                <div className="text-xs text-zinc-500 mb-1">{ETAPA_LABELS[e]}</div>
                <div className="text-base font-semibold text-zinc-800">{p ? fmt(Number(p.preco_m2)) : "—"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pavimentos */}
      <div className="space-y-6">
        {obra.pavimentos.map(pav => (
          <div key={pav.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-2">Pavimento {pav.numero}</span>
                <span className="text-base font-semibold text-zinc-900">{pav.nome}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-orange-600">{fmt(pav.orcamento_total)}</span>
                <Link href={`/orcamentos/obras/${obra.id}/pavimentos/${pav.id}`}
                  className="text-xs text-orange-600 hover:text-orange-800 border border-orange-200 hover:border-orange-400 px-3 py-1 rounded-md transition-colors">
                  Ver pavimento
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
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
                      <td className="px-3 py-3 text-right text-sm text-zinc-600">{fmtN(c.orcamento.total_paredes)}</td>
                      <td className="px-3 py-3 text-right text-sm text-zinc-600">{fmtN(c.teto_m2)}</td>
                      {ETAPAS.map(e => (
                        <td key={e} className="px-3 py-3 text-right text-sm text-zinc-600">{fmt((c.orcamento as Record<string,number>)[e])}</td>
                      ))}
                      <td className="px-4 py-3 text-right font-semibold text-orange-600 text-sm">{fmt(c.orcamento.total)}</td>
                      <td className="px-3 py-3">
                        <Link href={`/orcamentos/obras/${obra.id}/pavimentos/${pav.id}/comodos/${c.id}`}
                          className="text-xs text-orange-600 hover:text-orange-800">
                          Detalhe
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-orange-50">
                    <td colSpan={2+ETAPAS.length} className="px-4 py-3 text-sm font-semibold text-zinc-700">Total do Pavimento</td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600">{fmt(pav.orcamento_total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Total geral */}
      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-6 flex items-center justify-between">
        <span className="text-base font-semibold text-zinc-800">Orcamento Total da Obra</span>
        <span className="text-2xl font-bold text-orange-600">{fmt(obra.orcamento_total)}</span>
      </div>
    </div>
  );
}
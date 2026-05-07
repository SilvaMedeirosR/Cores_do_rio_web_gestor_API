"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_ORCAMENTO ?? "";
const ETAPAS = ["massa_parede","massa_teto","lixacao","pintura","acabamento"];
const ETAPA_LABELS: Record<string,string> = { massa_parede:"Massa Parede", massa_teto:"Massa Teto", lixacao:"Lixacao", pintura:"Pintura", acabamento:"Acabamento" };
const TIPO_LABELS:  Record<string,string> = { sala:"Sala", quarto:"Quarto", banheiro:"Banheiro", suite:"Suite", varanda:"Varanda", lavatorio:"Lavatorio", circulacao:"Circulacao", escritorio:"Escritorio", area_tecnica:"Area Tecnica", escada:"Escada" };
const fmt  = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const fmtN = (v: unknown) => Number(v).toFixed(2).replace(".",",");

type ParadeKey = "parede1_m2"|"parede2_m2"|"parede3_m2"|"parede4_m2";
interface OrcComodo { massa_parede:number; massa_teto:number; lixacao:number; pintura:number; acabamento:number; total:number; total_paredes:number; }
interface Comodo {
  id:string; tipo:string; nome:string|null;
  parede1_m2:number; parede2_m2:number; parede3_m2:number; parede4_m2:number; teto_m2:number;
  orcamento:OrcComodo;
  pavimentos: { id:string; nome:string; numero:number; obras: { id:string; nome:string; obra_precos:{etapa:string;preco_m2:number}[] } };
}

export default function ComodoDetailPage() {
  const { id, pavId, comId } = useParams<{ id: string; pavId: string; comId: string }>();
  const [comodo, setComodo]    = useState<Comodo | null>(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    fetch(`${API}/comodos/${comId}`)
      .then(r => r.json()).then(j => setComodo(j.data ?? null))
      .finally(() => setLoading(false));
  }, [comId]);

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;
  if (!comodo) return <div className="flex items-center justify-center py-40 text-zinc-400">Comodo nao encontrado.</div>;

  const pav  = comodo.pavimentos;
  const obra = pav.obras;
  const precoMap = Object.fromEntries(obra.obra_precos.map(p => [p.etapa, Number(p.preco_m2)]));
  const orc  = comodo.orcamento;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <Link href="/orcamentos" className="hover:text-zinc-700">Orcamentos</Link>
        <span>/</span>
        <Link href="/orcamentos/obras" className="hover:text-zinc-700">Obras</Link>
        <span>/</span>
        <Link href={`/orcamentos/obras/${id}`} className="hover:text-zinc-700">{obra.nome}</Link>
        <span>/</span>
        <Link href={`/orcamentos/obras/${id}/pavimentos/${pavId}`} className="hover:text-zinc-700">{pav.nome}</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{comodo.nome || TIPO_LABELS[comodo.tipo]}</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-zinc-400 mb-1">{obra.nome} / Pav. {pav.numero} — {pav.nome}</p>
          <h1 className="text-3xl font-bold text-zinc-900">{comodo.nome || TIPO_LABELS[comodo.tipo]}</h1>
          <p className="text-zinc-400 text-sm mt-1">{TIPO_LABELS[comodo.tipo]}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-zinc-400">Orcamento do Comodo</div>
          <div className="text-2xl font-bold text-orange-600">{fmt(orc.total)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">

        {/* Medicoes */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Medicoes</h2>
          <div className="space-y-3">
            {([1,2,3,4] as const).map(n => (
              <div key={n} className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Parede {n}</span>
                <span className="text-sm font-semibold text-zinc-800">{fmtN(comodo[`parede${n}_m2` as ParadeKey])} m²</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="text-sm font-semibold text-zinc-700">Total Paredes</span>
              <span className="text-sm font-bold text-zinc-900">{fmtN(orc.total_paredes)} m²</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Teto</span>
              <span className="text-sm font-semibold text-zinc-800">{fmtN(comodo.teto_m2)} m²</span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="text-sm font-semibold text-zinc-700">Area Total</span>
              <span className="text-sm font-bold text-zinc-900">{fmtN(orc.total_paredes + Number(comodo.teto_m2))} m²</span>
            </div>
          </div>
        </div>

        {/* Precos de referencia */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Precos de Referencia (m²)</h2>
          <div className="space-y-3">
            {ETAPAS.map(e => (
              <div key={e} className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">{ETAPA_LABELS[e]}</span>
                <span className="text-sm font-semibold text-zinc-800">{fmt(precoMap[e] ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orcamento detalhado */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">Detalhamento do Orcamento</h2>
        <div className="space-y-0 divide-y divide-zinc-100">
          <div className="grid grid-cols-4 py-2 text-xs font-semibold text-zinc-400 uppercase">
            <span>Etapa</span><span className="text-right">Base m²</span><span className="text-right">Preco/m²</span><span className="text-right">Subtotal</span>
          </div>
          <div className="grid grid-cols-4 py-3 text-sm">
            <span className="text-zinc-600">Massa Parede</span>
            <span className="text-right text-zinc-500">{fmtN(orc.total_paredes)} m²</span>
            <span className="text-right text-zinc-500">{fmt(precoMap.massa_parede ?? 0)}</span>
            <span className="text-right font-semibold text-zinc-800">{fmt(orc.massa_parede)}</span>
          </div>
          <div className="grid grid-cols-4 py-3 text-sm">
            <span className="text-zinc-600">Massa Teto</span>
            <span className="text-right text-zinc-500">{fmtN(comodo.teto_m2)} m²</span>
            <span className="text-right text-zinc-500">{fmt(precoMap.massa_teto ?? 0)}</span>
            <span className="text-right font-semibold text-zinc-800">{fmt(orc.massa_teto)}</span>
          </div>
          {(["lixacao","pintura","acabamento"] as const).map(e => (
            <div key={e} className="grid grid-cols-4 py-3 text-sm">
              <span className="text-zinc-600">{ETAPA_LABELS[e]}</span>
              <span className="text-right text-zinc-500">{fmtN(orc.total_paredes + Number(comodo.teto_m2))} m²</span>
              <span className="text-right text-zinc-500">{fmt(precoMap[e] ?? 0)}</span>
              <span className="text-right font-semibold text-zinc-800">{fmt(orc[e])}</span>
            </div>
          ))}
          <div className="grid grid-cols-4 py-3 bg-orange-50 rounded-b-lg">
            <span className="font-bold text-zinc-800">Total</span>
            <span></span><span></span>
            <span className="text-right font-bold text-orange-600">{fmt(orc.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

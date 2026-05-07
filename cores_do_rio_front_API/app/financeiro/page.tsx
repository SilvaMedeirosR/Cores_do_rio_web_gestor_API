"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API_FIN = process.env.NEXT_PUBLIC_API_FINANCEIRO ?? "";
const fmt     = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const calcPct = (pago: number, teto: number) => teto > 0 ? Math.min(Math.round((pago / teto) * 100), 100) : 0;

interface ObraResumo {
  id: string;
  nome: string;
  local: string;
  orcamento_total: number;
  valor_pago: number;
  num_pavimentos: number;
  num_comodos: number;
}

export default function FinanceiroPage() {
  const [obras,   setObras]   = useState<ObraResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_FIN}/obras`)
      .then(r => r.json())
      .then(j => setObras(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Financeiro</h1>
          <p className="text-zinc-500 mt-1 text-sm sm:text-base">Acompanhamento financeiro das obras</p>
        </div>
      </div>

      {obras.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-zinc-400 shadow-sm">
          Nenhuma obra cadastrada em orcamentos.
        </div>
      ) : (
        <div className="space-y-4">
          {obras.map(o => {
            const p = calcPct(o.valor_pago, o.orcamento_total);
            return (
              <Link key={o.id} href={`/financeiro/obras/${o.id}`}
                className="group block bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-orange-600 transition-colors">{o.nome}</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{o.local}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                      <span>{o.num_pavimentos} pavimento{o.num_pavimentos !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{o.num_comodos} comodo{o.num_comodos !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <div className="text-xs text-zinc-400">Orcamento Total</div>
                    <div className="text-xl font-bold text-orange-600 tabular-nums">{fmt(o.orcamento_total)}</div>
                    <div className="text-xs text-zinc-400 mt-0.5 tabular-nums">{fmt(o.valor_pago)} pago</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
                  <span className="font-medium">Progresso</span>
                  <span className="tabular-nums">{p}%</span>
                </div>
                <div className="h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${p}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

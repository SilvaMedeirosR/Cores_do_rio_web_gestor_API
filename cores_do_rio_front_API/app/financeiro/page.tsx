"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePagination } from "@/lib/hooks/usePagination";
import Pagination from "@/components/Pagination";

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
  const pag = usePagination(obras);

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
          <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1, marginBottom: "6px" }}>Financeiro</h1>
          <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.45)" }}>Acompanhamento financeiro das obras</p>
        </div>
      </div>

      {obras.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-zinc-400 shadow-sm">
          Nenhuma obra cadastrada em orçamentos.
        </div>
      ) : (
        <>
          <div key={pag.animKey} className={`space-y-4 ${pag.animClass}`}>
            {pag.pageItems.map(o => {
              const p = calcPct(o.valor_pago, o.orcamento_total);
              return (
                <Link key={o.id} href={`/financeiro/obras/${o.id}`}
                  className="group block bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div style={{ minWidth: 0 }}>
                      <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-orange-600 transition-colors" style={{ overflowWrap: "break-word" }}>{o.nome}</h2>
                      <p className="text-sm text-zinc-500 mt-0.5" style={{ overflowWrap: "break-word" }}>{o.local}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                        <span>{o.num_pavimentos} pav.</span>
                        <span>·</span>
                        <span>{o.num_comodos} côm.</span>
                      </div>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <div className="text-xs text-zinc-400">Orçamento Total</div>
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
          <Pagination
            page={pag.page} totalPages={pag.totalPages}
            from={pag.from} to={pag.to} total={pag.total}
            onPrev={pag.goPrev} onNext={pag.goNext}
          />
        </>
      )}
    </div>
  );
}

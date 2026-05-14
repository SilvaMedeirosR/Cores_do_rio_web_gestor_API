"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_METRICAS ?? "";

const fmt    = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtPct = (v: number) => `${v}%`;

interface Resumo {
  obras:        { total: number };
  pavimentos:   { total: number };
  comodos:      { total: number };
  orcamento:    { total: number; pago: number; pendente: number; progresso_pct: number };
  funcionarios: { ativos: number; total: number };
  compras:      { pendentes: number; valor_pendente: number };
  financeiro:   { entradas: number; saidas: number; saldo: number };
}

interface ObraMetrica {
  id: string; nome: string; local: string | null; empreiteira: string | null;
  num_pavimentos: number; num_comodos: number;
  orcamento_total: number; valor_pago: number; progresso_pct: number;
}

interface FinanceiroMetrica {
  totais:        { entradas: number; saidas: number; saldo: number };
  por_categoria: { categoria: string; entradas: number; saidas: number }[];
  recentes:      { id: string; descricao: string; valor: number; tipo: string; categoria: string | null; data: string }[];
}

function Card({ label, value, sub, color = "zinc" }: { label: string; value: string; sub?: string; color?: "zinc" | "orange" | "green" | "red" | "blue" }) {
  const colors: Record<string, string> = {
    zinc:   "text-zinc-900",
    orange: "text-orange-600",
    green:  "text-emerald-600",
    red:    "text-red-600",
    blue:   "text-blue-600",
  };
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ProgressBar({ pct, color = "orange" }: { pct: number; color?: string }) {
  const colors: Record<string, string> = { orange: "bg-orange-500", green: "bg-emerald-500", blue: "bg-blue-500" };
  return (
    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${colors[color] ?? "bg-orange-500"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MetricasPage() {
  const [resumo,      setResumo]      = useState<Resumo | null>(null);
  const [obras,       setObras]       = useState<ObraMetrica[]>([]);
  const [financeiro,  setFinanceiro]  = useState<FinanceiroMetrica | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [erro,        setErro]        = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/resumo`).then(r => r.json()),
      fetch(`${API}/obras`).then(r => r.json()),
      fetch(`${API}/financeiro`).then(r => r.json()),
    ])
      .then(([r, o, f]) => {
        setResumo(r.data ?? null);
        setObras(o.data ?? []);
        setFinanceiro(f.data ?? null);
      })
      .catch(() => setErro("Erro ao carregar métricas."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-40 text-zinc-400 text-sm">Carregando...</div>
  );
  if (erro) return (
    <div className="flex items-center justify-center py-40 text-red-500 text-sm">{erro}</div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Métricas</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Visão geral do negócio</p>
      </div>

      {/* Cards resumo */}
      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card label="Obras"        value={String(resumo.obras.total)}           color="zinc"   />
          <Card label="Pavimentos"   value={String(resumo.pavimentos.total)}       color="zinc"   />
          <Card label="Cômodos"      value={String(resumo.comodos.total)}          color="zinc"   />
          <Card label="Funcionários" value={String(resumo.funcionarios.ativos)}
            sub={`${resumo.funcionarios.total} cadastrados`}                       color="blue"   />
          <Card label="Orçamento Total"  value={fmt(resumo.orcamento.total)}
            sub={`${fmt(resumo.orcamento.pago)} pago · ${fmtPct(resumo.orcamento.progresso_pct)}`}
            color="orange" />
          <Card label="Saldo Financeiro" value={fmt(resumo.financeiro.saldo)}
            sub={resumo.financeiro.saldo >= 0 ? "Positivo" : "Negativo"}
            color={resumo.financeiro.saldo >= 0 ? "green" : "red"} />
          <Card label="Compras Pendentes" value={String(resumo.compras.pendentes)}
            sub={fmt(resumo.compras.valor_pendente)}                               color="red"    />
          <Card label="Entradas"     value={fmt(resumo.financeiro.entradas)}       color="green"  />
        </div>
      )}

      {/* Progresso geral */}
      {resumo && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-zinc-700">Progresso Geral das Obras</p>
            <span className="text-sm font-bold text-orange-600">{fmtPct(resumo.orcamento.progresso_pct)}</span>
          </div>
          <ProgressBar pct={resumo.orcamento.progresso_pct} />
          <div className="flex justify-between text-xs text-zinc-400 mt-1.5">
            <span>{fmt(resumo.orcamento.pago)} pago</span>
            <span>{fmt(resumo.orcamento.pendente)} pendente</span>
          </div>
        </div>
      )}

      {/* Obras */}
      {obras.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Obras</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {obras.map(o => (
              <div key={o.id} className="px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                  <div>
                    <p className="font-semibold text-zinc-900 text-sm">{o.nome}</p>
                    <p className="text-xs text-zinc-400">{o.local ?? "—"}{o.empreiteira ? ` · ${o.empreiteira}` : ""}</p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <p className="text-sm font-bold text-orange-600 tabular-nums">{fmt(o.orcamento_total)}</p>
                    <p className="text-xs text-zinc-400 tabular-nums">{fmt(o.valor_pago)} pago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar pct={o.progresso_pct} color={o.progresso_pct === 100 ? "green" : "orange"} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-500 tabular-nums w-8 text-right">{fmtPct(o.progresso_pct)}</span>
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-zinc-400">
                  <span>{o.num_pavimentos} pav.</span>
                  <span>·</span>
                  <span>{o.num_comodos} cômodos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financeiro */}
      {financeiro && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Totais + categorias */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Financeiro</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">Entradas</span>
                <span className="text-sm font-bold text-emerald-600 tabular-nums">{fmt(financeiro.totais.entradas)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">Saídas</span>
                <span className="text-sm font-bold text-red-600 tabular-nums">{fmt(financeiro.totais.saidas)}</span>
              </div>
              <div className="h-px bg-zinc-100" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-zinc-800">Saldo</span>
                <span className={`text-sm font-bold tabular-nums ${financeiro.totais.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmt(financeiro.totais.saldo)}
                </span>
              </div>
              {financeiro.por_categoria.length > 0 && (
                <>
                  <div className="h-px bg-zinc-100 mt-1" />
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Por categoria</p>
                  <div className="space-y-1.5">
                    {financeiro.por_categoria.map(c => (
                      <div key={c.categoria} className="flex justify-between items-center">
                        <span className="text-xs text-zinc-600">{c.categoria}</span>
                        <span className="text-xs tabular-nums text-zinc-500">
                          {c.entradas > 0 && <span className="text-emerald-600">+{fmt(c.entradas)}</span>}
                          {c.entradas > 0 && c.saidas > 0 && " / "}
                          {c.saidas > 0 && <span className="text-red-500">-{fmt(c.saidas)}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Lançamentos recentes */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Lançamentos Recentes</h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {financeiro.recentes.length === 0 ? (
                <p className="px-5 py-8 text-sm text-zinc-400 text-center">Nenhum lançamento.</p>
              ) : (
                financeiro.recentes.map(l => (
                  <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-800 font-medium truncate">{l.descricao}</p>
                      <p className="text-xs text-zinc-400">
                        {l.categoria ?? "—"} · {new Date(l.data).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${l.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}>
                      {l.tipo === "entrada" ? "+" : "-"}{fmt(Number(l.valor))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  fmt, fmtK, fmtPct,
  KpiCard, SectionTitle,
  TOOLTIP_STYLE,
  type Resumo, type ObraMetrica,
} from "./_shared";

const API = process.env.NEXT_PUBLIC_API_METRICAS ?? "";

export default function MetricasPage() {
  const [resumo,  setResumo]  = useState<Resumo | null>(null);
  const [obras,   setObras]   = useState<ObraMetrica[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/resumo`).then(r => r.json()),
      fetch(`${API}/obras`).then(r => r.json()),
    ])
      .then(([r, o]) => {
        setResumo(r.data ?? null);
        setObras((o.data ?? []).slice(0, 10));
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

  const dadosObras = obras.map(o => ({
    nome:     o.nome.length > 16 ? o.nome.slice(0, 14) + "…" : o.nome,
    pago:     Math.round(o.valor_pago),
    pendente: Math.round(o.orcamento_total - o.valor_pago),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Métricas</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Visão geral do negócio</p>
      </div>

      {/* ── KPIs ── */}
      {resumo && (
        <section>
          <SectionTitle>Painel Geral</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <KpiCard label="Obras"            value={String(resumo.obras.total)}           color="zinc"   />
            <KpiCard label="Cômodos"          value={String(resumo.comodos.total)}          color="zinc"   />
            <KpiCard label="Funcionários"     value={String(resumo.funcionarios.ativos)}
              sub={`${resumo.funcionarios.total} cadastrados`}                               color="blue"   />
            <KpiCard label="Compras Pend."    value={fmt(resumo.compras.valor_pendente)}
              sub={`${resumo.compras.pendentes} item${resumo.compras.pendentes !== 1 ? "s" : ""}`}
              color="red" />
            <KpiCard label="Orçamento Total"  value={fmt(resumo.orcamento.total)}
              sub={`${fmtPct(resumo.orcamento.progresso_pct)} executado`}                    color="orange" />
            <KpiCard label="Valor Pago"       value={fmt(resumo.orcamento.pago)}             color="orange" />
            <KpiCard label="Saldo Financeiro" value={fmt(resumo.financeiro.saldo)}
              sub={resumo.financeiro.saldo >= 0 ? "Positivo" : "Atenção"}
              color={resumo.financeiro.saldo >= 0 ? "green" : "red"} />
            <KpiCard label="Entradas"         value={fmt(resumo.financeiro.entradas)}        color="green"  />
          </div>

          {/* Progresso geral */}
          <div className="mt-4 bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-zinc-700">Progresso Geral das Obras</span>
              <span className="text-sm font-bold text-orange-600">{fmtPct(resumo.orcamento.progresso_pct)}</span>
            </div>
            <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${resumo.orcamento.progresso_pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400 mt-1.5">
              <span>{fmt(resumo.orcamento.pago)} pago</span>
              <span>{fmt(resumo.orcamento.pendente)} pendente</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Orçamento por Obra ── */}
      {dadosObras.length > 0 && (
        <section>
          <SectionTitle>Orçamento por Obra (pago vs pendente)</SectionTitle>
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <ResponsiveContainer width="100%" height={Math.max(220, dadosObras.length * 42)}>
              <BarChart layout="vertical" data={dadosObras} margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11, fill: "#52525b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v, name) => [fmt(Number(v)), name === "pago" ? "Pago" : "Pendente"]}
                />
                <Legend formatter={v => v === "pago" ? "Pago" : "Pendente"} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pago"     stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendente" stackId="a" fill="#e4e4e7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Progresso detalhado por obra ── */}
      {obras.length > 0 && (
        <section>
          <SectionTitle>Progresso por Obra</SectionTitle>
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-zinc-100">
              {obras.map(o => (
                <div key={o.id} className="px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                    <div>
                      <p className="font-semibold text-zinc-900 text-sm">{o.nome}</p>
                      <p className="text-xs text-zinc-400">
                        {o.local ?? "—"} · {o.num_pavimentos} pav. · {o.num_comodos} cômodos
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <p className="text-sm font-bold text-orange-600 tabular-nums">{fmt(o.orcamento_total)}</p>
                      <p className="text-xs text-zinc-400 tabular-nums">{fmt(o.valor_pago)} pago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          o.progresso_pct === 100 ? "bg-emerald-500" : "bg-orange-500"
                        }`}
                        style={{ width: `${o.progresso_pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-zinc-500 tabular-nums w-8 text-right">
                      {fmtPct(o.progresso_pct)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

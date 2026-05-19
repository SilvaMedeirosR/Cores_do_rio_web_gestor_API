"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useWindowSize } from "@/lib/hooks/useWindowSize";
import {
  fmt, fmtK, fmtPct,
  KpiCard, SectionTitle, ChartCard,
  TOOLTIP_STYLE,
  type Resumo, type ObraMetrica,
} from "./_shared";

const API = process.env.NEXT_PUBLIC_API_METRICAS ?? "";

export default function MetricasPage() {
  const [resumo,  setResumo]  = useState<Resumo | null>(null);
  const [obras,   setObras]   = useState<ObraMetrica[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState<string | null>(null);
  const { isMobile, isXs }   = useWindowSize();

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

  const nomeMax    = isXs ? 9 : isMobile ? 12 : 16;
  const yAxisW     = isXs ? 72 : isMobile ? 88 : 110;
  const dadosObras = obras.map(o => ({
    nome:     o.nome.length > nomeMax ? o.nome.slice(0, nomeMax - 1) + "…" : o.nome,
    pago:     Math.round(o.valor_pago),
    pendente: Math.round(o.orcamento_total - o.valor_pago),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">

      <div>
        <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1, marginBottom: "6px" }}>Métricas</h1>
        <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.45)" }}>Visão geral do negócio</p>
      </div>

      {/* ── KPIs ── */}
      {resumo && (
        <section>
          <SectionTitle>Painel Geral</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 kpi-grid">
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
          <div style={{ marginTop: "12px", backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.09)", borderRadius: "12px", padding: "16px 18px", boxShadow: "0 1px 3px rgba(26,42,58,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(26,42,58,0.65)" }}>Progresso Geral das Obras</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1A2A3A", fontVariantNumeric: "tabular-nums" }}>{fmtPct(resumo.orcamento.progresso_pct)}</span>
            </div>
            <div style={{ height: "8px", backgroundColor: "rgba(26,42,58,0.07)", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "99px",
                transition: "width 0.7s ease",
                width: `${resumo.orcamento.progresso_pct}%`,
                backgroundColor: resumo.orcamento.progresso_pct >= 100 ? "#16a34a" : "#1A2A3A",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "rgba(26,42,58,0.38)", marginTop: "6px" }}>
              <span>{fmt(resumo.orcamento.pago)} pago</span>
              <span>{fmt(resumo.orcamento.pendente)} pendente</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Orçamento por Obra ── */}
      {dadosObras.length > 0 && (
        <section>
          <ChartCard title="Orçamento por Obra — pago vs pendente">
            <ResponsiveContainer width="100%" height={Math.max(220, dadosObras.length * 42)}>
              <BarChart layout="vertical" data={dadosObras} margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" width={yAxisW} tick={{ fontSize: isXs ? 9 : 11, fill: "#52525b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v, name) => [fmt(Number(v)), name === "pago" ? "Pago" : "Pendente"]}
                />
                <Legend formatter={v => v === "pago" ? "Pago" : "Pendente"} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pago"     stackId="a" fill="#1A2A3A" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendente" stackId="a" fill="rgba(26,42,58,0.12)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>
      )}

      {/* ── Progresso detalhado por obra ── */}
      {obras.length > 0 && (
        <section>
          <SectionTitle>Progresso por Obra</SectionTitle>
          <div style={{ backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.09)", borderRadius: "12px", boxShadow: "0 1px 3px rgba(26,42,58,0.05)", overflow: "hidden" }}>
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
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(26,42,58,0.07)" }}>
                      <div style={{
                        height: "100%", borderRadius: "9999px",
                        transition: "width 0.7s ease",
                        width: `${o.progresso_pct}%`,
                        backgroundColor: o.progresso_pct >= 100 ? "#16a34a" : "#1A2A3A",
                      }} />
                    </div>
                    <span className="text-xs font-semibold tabular-nums w-8 text-right" style={{ color: "rgba(26,42,58,0.5)" }}>
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

"use client";
import { useState, useEffect } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_METRICAS ?? "";

const fmt    = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtK   = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`;
const fmtPct = (v: number) => `${v}%`;

// ── Types ─────────────────────────────────────────────────────────────────────

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
  id: string; nome: string; local: string | null;
  num_pavimentos: number; num_comodos: number;
  orcamento_total: number; valor_pago: number; progresso_pct: number;
}

interface MesSerie {
  mes: string; entradas: number; saidas: number; saldo: number;
}

interface Analytics {
  financeiro_mensal: MesSerie[];
  projecao: { mes: string; saldo_projetado: number }[];
  tendencia: { slope: number; direcao: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mesLabel(ym: string) {
  const [y, m] = ym.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = "zinc" }: {
  label: string; value: string; sub?: string;
  color?: "zinc" | "orange" | "green" | "red" | "blue";
}) {
  const colors = { zinc: "text-zinc-900", orange: "text-orange-600", green: "text-emerald-600", red: "text-red-600", blue: "text-blue-600" };
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">{children}</h2>
  );
}

const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 12, padding: "8px 12px" },
  labelStyle: { fontWeight: 600, color: "#18181b" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MetricasPage() {
  const [resumo,    setResumo]    = useState<Resumo | null>(null);
  const [obras,     setObras]     = useState<ObraMetrica[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [erro,      setErro]      = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/resumo`).then(r => r.json()),
      fetch(`${API}/obras`).then(r => r.json()),
      fetch(`${API}/analytics`).then(r => r.json()).catch(() => ({ data: null })),
    ])
      .then(([r, o, a]) => {
        setResumo(r.data ?? null);
        setObras((o.data ?? []).slice(0, 10));
        setAnalytics(a.data ?? null);
      })
      .catch(() => setErro("Erro ao carregar métricas."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-40 text-zinc-400 text-sm">Carregando...</div>;
  if (erro)    return <div className="flex items-center justify-center py-40 text-red-500 text-sm">{erro}</div>;

  // Prepara dados para os gráficos
  const dadosFinanceiros: (MesSerie & { saldo_projetado?: number })[] = [
    ...(analytics?.financeiro_mensal ?? []).map(d => ({ ...d, mes: mesLabel(d.mes) })),
    ...(analytics?.projecao ?? []).map(p => ({
      mes: mesLabel(p.mes),
      entradas: 0, saidas: 0, saldo: 0,
      saldo_projetado: p.saldo_projetado,
    })),
  ];

  const dadosObras = obras.map(o => ({
    nome: o.nome.length > 16 ? o.nome.slice(0, 14) + "…" : o.nome,
    pago: Math.round(o.valor_pago),
    pendente: Math.round(o.orcamento_total - o.valor_pago),
    total: Math.round(o.orcamento_total),
  }));

  const tendencia = analytics?.tendencia;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Métricas</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Visão geral do negócio</p>
      </div>

      {/* ── KPIs ── */}
      {resumo && (
        <section>
          <SectionTitle>Painel Geral</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <KpiCard label="Obras"           value={String(resumo.obras.total)}          color="zinc"   />
            <KpiCard label="Cômodos"         value={String(resumo.comodos.total)}         color="zinc"   />
            <KpiCard label="Funcionários"    value={String(resumo.funcionarios.ativos)}
              sub={`${resumo.funcionarios.total} cadastrados`}                             color="blue"   />
            <KpiCard label="Compras Pend."   value={fmt(resumo.compras.valor_pendente)}
              sub={`${resumo.compras.pendentes} item${resumo.compras.pendentes !== 1 ? "s" : ""}`}
              color="red" />
            <KpiCard label="Orçamento Total" value={fmt(resumo.orcamento.total)}
              sub={`${fmtPct(resumo.orcamento.progresso_pct)} executado`}                  color="orange" />
            <KpiCard label="Valor Pago"      value={fmt(resumo.orcamento.pago)}            color="orange" />
            <KpiCard label="Saldo Financeiro" value={fmt(resumo.financeiro.saldo)}
              sub={resumo.financeiro.saldo >= 0 ? "Positivo" : "Atenção"}
              color={resumo.financeiro.saldo >= 0 ? "green" : "red"} />
            <KpiCard label="Entradas"        value={fmt(resumo.financeiro.entradas)}       color="green"  />
          </div>

          {/* Progresso geral */}
          <div className="mt-4 bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-zinc-700">Progresso Geral das Obras</span>
              <span className="text-sm font-bold text-orange-600">{fmtPct(resumo.orcamento.progresso_pct)}</span>
            </div>
            <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${resumo.orcamento.progresso_pct}%` }} />
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

      {/* ── Financeiro mensal + projeção ── */}
      {dadosFinanceiros.length > 0 && (
        <section>
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <SectionTitle>Financeiro Mensal</SectionTitle>
            {tendencia && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                tendencia.direcao === "positiva"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : tendencia.direcao === "negativa"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200"
              }`}>
                Tendência {tendencia.direcao} · {tendencia.slope >= 0 ? "+" : ""}{fmt(tendencia.slope)}/mês
              </span>
            )}
          </div>

          {/* Área: entradas vs saídas */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm mb-4">
            <p className="text-xs font-medium text-zinc-400 mb-3">Entradas vs Saídas</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dadosFinanceiros.filter(d => d.entradas > 0 || d.saidas > 0)}
                margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.20} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [fmt(Number(v)), name === "entradas" ? "Entradas" : "Saídas"]} />
                <Legend formatter={v => v === "entradas" ? "Entradas" : "Saídas"} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={2} fill="url(#gEntradas)" dot={false} />
                <Area type="monotone" dataKey="saidas"   stroke="#ef4444" strokeWidth={2} fill="url(#gSaidas)"   dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Linha: saldo real + projeção */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-400 mb-3">Saldo mensal + projeção (3 meses)</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dadosFinanceiros} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [fmt(Number(v)), name === "saldo" ? "Saldo" : "Projeção"]} />
                <Legend formatter={v => v === "saldo" ? "Saldo real" : "Projeção"} wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke="#d4d4d8" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="saldo"            stroke="#f97316" strokeWidth={2.5} dot={{ r: 3, fill: "#f97316" }} connectNulls={false} />
                <Line type="monotone" dataKey="saldo_projetado"  stroke="#a1a1aa" strokeWidth={2}   dot={{ r: 3, fill: "#a1a1aa" }} strokeDasharray="6 3" connectNulls={false} />
              </LineChart>
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
                      <p className="text-xs text-zinc-400">{o.local ?? "—"} · {o.num_pavimentos} pav. · {o.num_comodos} cômodos</p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <p className="text-sm font-bold text-orange-600 tabular-nums">{fmt(o.orcamento_total)}</p>
                      <p className="text-xs text-zinc-400 tabular-nums">{fmt(o.valor_pago)} pago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${o.progresso_pct === 100 ? "bg-emerald-500" : "bg-orange-500"}`}
                        style={{ width: `${o.progresso_pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-zinc-500 tabular-nums w-8 text-right">{fmtPct(o.progresso_pct)}</span>
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

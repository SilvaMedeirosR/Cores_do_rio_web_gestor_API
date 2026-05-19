"use client";
import { useState, useEffect } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import {
  fmt, fmtK, mesLabel, corObra,
  IDO_BRL_PT, IDO_ABS_PCT, IDO_MAT_PCT,
  SectionTitle, ChartCard, TOOLTIP_STYLE,
  type Analytics, type MesSerie, type ObraMetrica,
  type ObraCiclos, type RelatorioObras,
  type ObraAgregada, type CicloAgregado,
  type DeltaTransicao, type Nivel,
} from "../_shared";

const API      = process.env.NEXT_PUBLIC_API_METRICAS ?? "";
const API_PESS = process.env.NEXT_PUBLIC_API_DEP_PESS ?? "";

const IDO_H_DIA = 8; // horas úteis por dia

// Exibe minutos como "Xm" ou "Xh" / "X,Xh" quando >= 60 min.
function fmtTempo(minutos: number): string {
  const abs = Math.abs(minutos);
  if (abs < 60) return `${minutos}m`;
  const h = minutos / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

// Converte faltas (dias inteiros) para string de tempo: cada falta = IDO_H_DIA horas.
function fmtFaltas(faltas: number): string {
  return fmtTempo(faltas * IDO_H_DIA * 60);
}

// IDO de um único ciclo quinzenal usando teto de tolerância operacional.
// Retorna valor sem cap — pode ultrapassar 10 quando cruza o limite tolerável.
function idoFromCiclo(
  faltas: number, atMin: number, matExc: number,
  nFuncionarios: number, horasMensais: number,
  orcTotal: number, totalQ: number,
): number {
  const horasQ      = horasMensais / 2;
  const totalHorasQ = nFuncionarios * horasQ;
  const orcQ        = totalQ > 0 ? orcTotal / totalQ : 0;

  const Pt         = (atMin / 60 + faltas * IDO_H_DIA) * 0.5;
  const Pm         = matExc / IDO_BRL_PT;
  const Ptotal     = Pt + Pm;

  // P_threshold = teto de tolerância operacional (10% absenteísmo + 15% material)
  const tetoTempo  = totalHorasQ * IDO_ABS_PCT * 0.5;
  const tetoMat    = orcQ * IDO_MAT_PCT / IDO_BRL_PT;
  const Pthreshold = tetoTempo + tetoMat;

  if (Pthreshold <= 0) return 0;
  return parseFloat(((Ptotal / Pthreshold) * 10).toFixed(2));
}

// Média harmônica de (10 - IDO_i) por quinzenal, convertida de volta ao espaço do IDO.
// Penaliza picos de desperdício: uma quinzena ruim "puxa" o agregado para cima.
// Suporta overflow (IDO > 10): cada unidade acima de 10 é somada proporcionalmente.
function idoHarmonico(idos: number[]): number {
  if (!idos.length) return 0;
  const overflows = idos.map(v => Math.max(v - 10, 0));
  const avgOverflow = overflows.reduce((s, v) => s + v, 0) / idos.length;
  const perfs = idos.map(v => Math.max(10 - v, 0.001));
  const hPerf = perfs.length / perfs.reduce((s, p) => s + 1 / p, 0);
  return parseFloat((10 - hPerf + avgOverflow).toFixed(2));
}

function idoColor(v: number): { bg: string; border: string; txt: string; label: string } {
  if (v < 2)   return { bg: 'bg-emerald-50', border: 'border-emerald-200', txt: 'text-emerald-700', label: 'Excelente'   };
  if (v < 4)   return { bg: 'bg-green-50',   border: 'border-green-200',   txt: 'text-green-700',   label: 'Bom'         };
  if (v < 6)   return { bg: 'bg-amber-50',   border: 'border-amber-200',   txt: 'text-amber-700',   label: 'Atenção'     };
  if (v < 8)   return { bg: 'bg-red-50',     border: 'border-red-200',     txt: 'text-red-700',     label: 'Crítico'     };
  if (v <= 10) return { bg: 'bg-red-100',    border: 'border-red-400',     txt: 'text-red-800',     label: 'Catástrofe'  };
  return       { bg: 'bg-red-950',   border: 'border-red-600',   txt: 'text-red-200',   label: '⚠ Limite Ultrapassado' };
}

function idoBarColor(v: number): string {
  if (v < 2)   return '#10b981';
  if (v < 4)   return '#22c55e';
  if (v < 6)   return '#f59e0b';
  if (v < 8)   return '#ef4444';
  if (v <= 10) return '#991b1b';
  return '#450a0a';
}

export default function DesempenhoPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [relatorio, setRelatorio] = useState<RelatorioObras | null>(null);
  const [obrasMap,  setObrasMap]  = useState<Record<string, number>>({});
  const [mesesSel,  setMesesSel]  = useState(3);
  const [nivel,     setNivel]     = useState<Nivel>('anual');
  const [anoSel,    setAnoSel]    = useState<number | null>(null);
  const [semSel,    setSemSel]    = useState<1 | 2 | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [erro,      setErro]      = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/analytics`).then(r => r.json()).catch(() => ({ data: null })),
      fetch(`${API_PESS}/pontotel/relatorios/obras?meses=24`).then(r => r.json()).catch(() => ({ data: null })),
      fetch(`${API}/obras`).then(r => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([a, p, o]) => {
        setAnalytics(a.data ?? null);
        setRelatorio(p.data ?? null);
        const map: Record<string, number> = {};
        (o.data ?? []).forEach((obra: ObraMetrica) => { map[obra.id] = obra.orcamento_total; });
        setObrasMap(map);
      })
      .catch(() => setErro("Erro ao carregar dados de desempenho."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-40 text-zinc-400 text-sm">Carregando...</div>
  );
  if (erro) return (
    <div className="flex items-center justify-center py-40 text-red-500 text-sm">{erro}</div>
  );

  // ── Dados financeiros ───────────────────────────────────────────────────────
  const dadosFinanceiros: (MesSerie & { saldo_projetado?: number })[] = [
    ...(analytics?.financeiro_mensal ?? []).map(d => ({ ...d, mes: mesLabel(d.mes) })),
    ...(analytics?.projecao ?? []).map(p => ({
      mes: mesLabel(p.mes),
      entradas: 0, saidas: 0, saldo: 0,
      saldo_projetado: p.saldo_projetado,
    })),
  ];
  const tendencia = analytics?.tendencia;

  // ── Agregação anual ─────────────────────────────────────────────────────────
  function agregaAnual(src: ObraCiclos[]): { obras: ObraAgregada[]; labels: { periodo: string; label: string }[] } {
    const anos = [...new Set(src.flatMap(o => o.ciclos.map(c => c.mes_ano.slice(0, 4))))].sort();
    return {
      labels: anos.map(a => ({ periodo: a, label: a })),
      obras: src.map(o => {
        const orcTotal    = obrasMap[o.obra_id] ?? 0;
        const totalCiclos = o.ciclos.length;
        return {
          obra_id: o.obra_id, obra_nome: o.obra_nome, encarregado: o.encarregado,
          ciclos: anos.map(ano => {
            const cs = o.ciclos.filter(c => c.mes_ano.startsWith(ano));
            if (!cs.length) return null;
            const faltas  = cs.reduce((s, c) => s + c.faltas, 0);
            const atMin   = cs.reduce((s, c) => s + c.atrasos_minutos, 0);
            const mat     = cs.reduce((s, c) => s + c.material_excedente_valor, 0);
            const custo   = cs.reduce((s, c) => s + c.custo_perdido_pessoal, 0);
            const indice  = cs.reduce((s, c) => s + c.indice, 0) / cs.length;
            const hEsp    = o.n_funcionarios * o.horas_mensais * 12;
            const pct     = hEsp > 0 ? (faltas * 480 + atMin) / (hEsp * 60) * 100 : 0;
            const ido     = idoHarmonico(cs.map(c => idoFromCiclo(c.faltas, c.atrasos_minutos, c.material_excedente_valor, o.n_funcionarios, o.horas_mensais, orcTotal, totalCiclos)));
            return {
              periodo: ano, label: ano, faltas, atrasos_minutos: atMin,
              material_excedente_valor: parseFloat(mat.toFixed(2)),
              custo_perdido_pessoal:    parseFloat(custo.toFixed(2)),
              indice:                   parseFloat(indice.toFixed(2)),
              prejuizo_total:           parseFloat((custo + mat).toFixed(2)),
              horas_esperadas:          hEsp,
              pct_horas_perdidas:       parseFloat(pct.toFixed(2)),
              ido,
            } as CicloAgregado;
          }).filter(Boolean) as CicloAgregado[],
        };
      }),
    };
  }

  // ── Agregação semestral ─────────────────────────────────────────────────────
  function agregaSemestral(src: ObraCiclos[], ano: number | null): { obras: ObraAgregada[]; labels: { periodo: string; label: string }[] } {
    const semKeys = [...new Set(src.flatMap(o => o.ciclos.map(c => {
      const [y, m] = c.mes_ano.split('-').map(Number);
      if (ano && y !== ano) return '';
      return `${y}-S${m <= 6 ? 1 : 2}`;
    })))].filter(Boolean).sort();
    return {
      labels: semKeys.map(k => {
        const [y, s] = k.split('-S').map(Number);
        return { periodo: k, label: `S${s}/${String(y).slice(2)}` };
      }),
      obras: src.map(o => {
        const orcTotal    = obrasMap[o.obra_id] ?? 0;
        const totalCiclos = o.ciclos.length;
        return {
          obra_id: o.obra_id, obra_nome: o.obra_nome, encarregado: o.encarregado,
          ciclos: semKeys.map(k => {
            const [y, s] = k.split('-S').map(Number);
            const mSet   = s === 1 ? [1,2,3,4,5,6] : [7,8,9,10,11,12];
            const cs     = o.ciclos.filter(c => {
              const [cy, cm] = c.mes_ano.split('-').map(Number);
              return cy === y && mSet.includes(cm);
            });
            if (!cs.length) return null;
            const faltas  = cs.reduce((a, c) => a + c.faltas, 0);
            const atMin   = cs.reduce((a, c) => a + c.atrasos_minutos, 0);
            const mat     = cs.reduce((a, c) => a + c.material_excedente_valor, 0);
            const custo   = cs.reduce((a, c) => a + c.custo_perdido_pessoal, 0);
            const indice  = cs.reduce((a, c) => a + c.indice, 0) / cs.length;
            const hEsp    = o.n_funcionarios * o.horas_mensais * 6;
            const pct     = hEsp > 0 ? (faltas * 480 + atMin) / (hEsp * 60) * 100 : 0;
            const ido     = idoHarmonico(cs.map(c => idoFromCiclo(c.faltas, c.atrasos_minutos, c.material_excedente_valor, o.n_funcionarios, o.horas_mensais, orcTotal, totalCiclos)));
            const lbl     = `S${s}/${String(y).slice(2)}`;
            return {
              periodo: k, label: lbl, faltas, atrasos_minutos: atMin,
              material_excedente_valor: parseFloat(mat.toFixed(2)),
              custo_perdido_pessoal:    parseFloat(custo.toFixed(2)),
              indice:                   parseFloat(indice.toFixed(2)),
              prejuizo_total:           parseFloat((custo + mat).toFixed(2)),
              horas_esperadas:          hEsp,
              pct_horas_perdidas:       parseFloat(pct.toFixed(2)),
              ido,
            } as CicloAgregado;
          }).filter(Boolean) as CicloAgregado[],
        };
      }),
    };
  }

  // ── Filtra quinzenal ────────────────────────────────────────────────────────
  function filtraQuinzenal(src: ObraCiclos[]): { obras: ObraAgregada[]; labels: { periodo: string; label: string }[] } {
    const mSet = semSel === 1 ? [1,2,3,4,5,6] : semSel === 2 ? [7,8,9,10,11,12] : null;
    const filtradas = src.map(o => ({
      ...o,
      ciclos: o.ciclos.filter(c => {
        const [y, m] = c.mes_ano.split('-').map(Number);
        if (anoSel && y !== anoSel) return false;
        if (mSet && !mSet.includes(m)) return false;
        return true;
      }),
    }));
    const todosMeses = [...new Set(filtradas.flatMap(o => o.ciclos.map(c => c.mes_ano)))].sort();
    const mesesAtivos = new Set(todosMeses.slice(-mesesSel));
    const cortadas = filtradas.map(o => ({
      ...o,
      ciclos: o.ciclos.filter(c => mesesAtivos.has(c.mes_ano)),
    }));
    const labels = [...new Set(
      cortadas.flatMap(o => o.ciclos.map(c => JSON.stringify({ periodo: c.periodo, label: c.label })))
    )].map(s => JSON.parse(s) as { periodo: string; label: string })
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
    return {
      labels,
      obras: cortadas.map(o => {
        const orcTotal    = obrasMap[o.obra_id] ?? 0;
        const totalCiclos = src.find(s => s.obra_id === o.obra_id)?.ciclos.length ?? o.ciclos.length;
        return {
          obra_id: o.obra_id, obra_nome: o.obra_nome, encarregado: o.encarregado,
          ciclos: o.ciclos.map(c => ({
            ...c,
            horas_esperadas:    o.n_funcionarios * o.horas_mensais,
            pct_horas_perdidas: 0,
            ido: idoFromCiclo(c.faltas, c.atrasos_minutos, c.material_excedente_valor, o.n_funcionarios, o.horas_mensais, orcTotal, totalCiclos),
          })) as CicloAgregado[],
        };
      }),
    };
  }

  const dadosNivel = relatorio ? (
    nivel === 'anual'     ? agregaAnual(relatorio.obras) :
    nivel === 'semestral' ? agregaSemestral(relatorio.obras, anoSel) :
    filtraQuinzenal(relatorio.obras)
  ) : null;

  function buildSerieAg(campo: keyof CicloAgregado, dados: { obras: ObraAgregada[]; labels: { periodo: string; label: string }[] }) {
    return dados.labels.map(lbl => {
      const row: Record<string, string | number> = { label: lbl.label };
      dados.obras.forEach(o => {
        const c = o.ciclos.find(x => x.periodo === lbl.periodo);
        row[o.obra_id] = c ? Number(c[campo]) : 0;
      });
      return row;
    });
  }

  const dadosComparativo = relatorio && nivel !== 'quinzenal'
    ? (nivel === 'anual'
        ? agregaAnual(relatorio.obras)
        : agregaSemestral(relatorio.obras, null))
    : null;

  const deltasComparativo: DeltaTransicao[] = dadosComparativo ? (() => {
    const { obras, labels } = dadosComparativo;
    return labels.slice(1).map((lbl, i) => {
      const prevLbl = labels[i];
      const obras_  = obras.map(o => {
        const cPrev = o.ciclos.find(c => c.periodo === prevLbl.periodo);
        const cCurr = o.ciclos.find(c => c.periodo === lbl.periodo);
        return {
          obra_id:        o.obra_id,
          obra_nome:      o.obra_nome,
          encarregado:    o.encarregado.nome,
          delta_prejuizo: parseFloat(((cCurr?.prejuizo_total ?? 0) - (cPrev?.prejuizo_total ?? 0)).toFixed(2)),
          delta_faltas:   (cCurr?.faltas ?? 0) - (cPrev?.faltas ?? 0),
          delta_atrasos:  (cCurr?.atrasos_minutos ?? 0) - (cPrev?.atrasos_minutos ?? 0),
          delta_material: parseFloat(((cCurr?.material_excedente_valor ?? 0) - (cPrev?.material_excedente_valor ?? 0)).toFixed(2)),
          prej_anterior:  parseFloat((cPrev?.prejuizo_total ?? 0).toFixed(2)),
          prej_atual:     parseFloat((cCurr?.prejuizo_total ?? 0).toFixed(2)),
        };
      });
      return {
        transicao:   `${prevLbl.label} → ${lbl.label}`,
        de:          prevLbl.label,
        para:        lbl.label,
        obras:       obras_,
        total_delta: parseFloat(obras_.reduce((s, o) => s + o.delta_prejuizo, 0).toFixed(2)),
      };
    });
  })() : [];

  const anosDisponiveis = relatorio
    ? [...new Set(relatorio.obras.flatMap(o => o.ciclos.map(c => c.mes_ano.slice(0, 4))))].sort()
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">

      <div>
        <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1 }}>Desempenho</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Indicadores financeiros e de pessoal por obra</p>
      </div>

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

          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm mb-4">
            <p className="text-xs font-medium text-zinc-400 mb-3">Entradas vs Saídas</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={dadosFinanceiros.filter(d => d.entradas > 0 || d.saidas > 0)}
                margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
              >
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
                <Line type="monotone" dataKey="saldo"           stroke="#1A2A3A" strokeWidth={2.5} dot={{ r: 3, fill: "#1A2A3A" }} connectNulls={false} />
                <Line type="monotone" dataKey="saldo_projetado" stroke="#a1a1aa" strokeWidth={2}   dot={{ r: 3, fill: "#a1a1aa" }} strokeDasharray="6 3" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Pessoal por Obra — drill-down anual → semestral → quinzenal ── */}
      {dadosNivel && dadosNivel.obras.length > 0 && (() => {
        const d       = dadosNivel;
        const obras_r = d.obras;

        const LinhasObras = () => (
          <>
            {obras_r.map((o, i) => (
              <Line
                key={o.obra_id}
                type="monotone"
                dataKey={o.obra_id}
                name={o.obra_nome}
                stroke={corObra(o.obra_id, i)}
                strokeWidth={2}
                dot={{ r: 3, fill: corObra(o.obra_id, i) }}
                connectNulls
              />
            ))}
          </>
        );

        const nivelLabel = nivel === 'anual'
          ? 'Visão Anual'
          : nivel === 'semestral'
            ? `Semestres de ${anoSel ?? ''}`
            : `Quinzenais${anoSel ? ` — ${anoSel}` : ''}${semSel ? ` S${semSel}` : ''}`;

        return (
          <section>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <SectionTitle>Pessoal por Obra · {nivelLabel}</SectionTitle>

              {nivel === 'quinzenal' && (
                <div className="flex items-center gap-1">
                  {[{ label: '1M', meses: 1 }, { label: '3M', meses: 3 }, { label: '6M', meses: 6 }].map(op => (
                    <button
                      key={op.meses}
                      onClick={() => setMesesSel(op.meses)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        mesesSel === op.meses ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                      }`}
                    >{op.label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* ── IDO Scorecards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {obras_r.map((o, i) => {
                const lastCiclo = o.ciclos[o.ciclos.length - 1];
                const ido       = lastCiclo?.ido ?? 0;
                const { bg, border, txt, label } = idoColor(ido);
                return (
                  <div key={o.obra_id} className={`rounded-xl border p-4 ${bg} ${border}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: corObra(o.obra_id, i) }} />
                      <p className="text-xs font-semibold text-zinc-700 truncate">{o.obra_nome}</p>
                    </div>
                    <p className={`text-3xl font-bold tabular-nums ${txt}`}>
                      {ido.toFixed(2)}
                      {ido > 10 && <span className="text-xs font-semibold ml-1 align-middle animate-pulse">↑</span>}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{lastCiclo?.label ?? '—'} · IDO</p>
                    {/* Barra: 10 = 100%. Se overflow, barra cheia + marcador extra */}
                    <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(ido / 10 * 100, 100)}%`, background: idoBarColor(ido) }}
                      />
                    </div>
                    {ido > 10 && (
                      <p className="text-xs font-bold mt-1 tabular-nums text-red-300">
                        +{(ido - 10).toFixed(2)} acima do limite
                      </p>
                    )}
                    <p className={`text-xs font-semibold ${ido > 10 ? 'mt-0.5' : 'mt-1.5'} ${txt}`}>{label}</p>
                  </div>
                );
              })}

              {/* Legenda de interpretação */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 col-span-2 sm:col-span-1">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">IDO · Escala</p>
                <div className="space-y-1 text-xs">
                  {[
                    { range: '0,0 – 2,0', cor: 'bg-emerald-500', txt: 'text-emerald-700', label: 'Excelente'    },
                    { range: '2,0 – 4,0', cor: 'bg-green-500',   txt: 'text-green-700',   label: 'Bom'          },
                    { range: '4,0 – 6,0', cor: 'bg-amber-500',   txt: 'text-amber-700',   label: 'Atenção'      },
                    { range: '6,0 – 8,0', cor: 'bg-red-500',     txt: 'text-red-700',     label: 'Crítico'      },
                    { range: '8,0 – 10', cor: 'bg-red-800',     txt: 'text-red-800',     label: 'Catástrofe'  },
                    { range: '> 10',     cor: 'bg-red-950',     txt: 'text-red-200',     label: '⚠ Ultrapassa' },
                  ].map(r => (
                    <div key={r.range} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${r.cor}`} />
                      <span className="text-zinc-400 tabular-nums w-16">{r.range}</span>
                      <span className={`font-semibold ${r.txt}`}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm mb-4">
              <button
                onClick={() => { setNivel('anual'); setAnoSel(null); setSemSel(null); }}
                className={nivel === 'anual' ? 'font-bold text-zinc-900' : 'text-orange-600 hover:underline'}
              >Anos</button>

              {(nivel === 'semestral' || nivel === 'quinzenal') && (
                <>
                  <span className="text-zinc-400">/</span>
                  <button
                    onClick={() => { setNivel('semestral'); setSemSel(null); }}
                    className={nivel === 'semestral' ? 'font-bold text-zinc-900' : 'text-orange-600 hover:underline'}
                  >{anoSel}</button>
                </>
              )}
              {nivel === 'quinzenal' && semSel !== null && (
                <>
                  <span className="text-zinc-400">/</span>
                  <span className="font-bold text-zinc-900">S{semSel}</span>
                </>
              )}
            </div>

            {/* Botões drill-down */}
            {nivel === 'anual' && (
              <div className="flex flex-wrap gap-2 mb-5">
                {anosDisponiveis.map(a => (
                  <button
                    key={a}
                    onClick={() => { setAnoSel(Number(a)); setNivel('semestral'); }}
                    className="px-4 py-1.5 rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:border-orange-400 hover:text-orange-600 transition-colors shadow-sm"
                  >
                    {a} — ver semestres →
                  </button>
                ))}
              </div>
            )}
            {nivel === 'semestral' && (
              <div className="flex flex-wrap gap-2 mb-5">
                {[1, 2].map(s => (
                  <button
                    key={s}
                    onClick={() => { setSemSel(s as 1 | 2); setNivel('quinzenal'); setMesesSel(6); }}
                    className="px-4 py-1.5 rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:border-orange-400 hover:text-orange-600 transition-colors shadow-sm"
                  >
                    S{s}/{String(anoSel).slice(2)} — ver quinzenais →
                  </button>
                ))}
              </div>
            )}

            {/* Legenda de obras */}
            <div className="flex flex-wrap gap-4 mb-5">
              {obras_r.map((o, i) => (
                <div key={o.obra_id} className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: corObra(o.obra_id, i) }} />
                  <span className="font-medium">{o.obra_nome}</span>
                  <span className="text-zinc-400">— {o.encarregado.nome}</span>
                </div>
              ))}
            </div>

            {/* Comparativo período a período */}
            {nivel !== 'quinzenal' && deltasComparativo.length > 0 && (() => {
              const lastDelta = deltasComparativo[deltasComparativo.length - 1];
              const economia  = -lastDelta.total_delta;
              const melhorou  = economia > 0;

              const deltaObrasData = lastDelta.obras.map(o => ({
                name:    o.obra_nome.length > 20 ? o.obra_nome.slice(0, 18) + '…' : o.obra_nome,
                delta:   o.delta_prejuizo,
                obra_id: o.obra_id,
              }));

              const deltaEvolData = deltasComparativo.map(dt => ({
                label: dt.para,
                total: dt.total_delta,
              }));

              const cumAcc: Record<string, number> = {};
              obras_r.forEach(o => { cumAcc[o.obra_id] = 0; });
              const cumData = d.labels.map(lbl => {
                const row: Record<string, string | number> = { label: lbl.label };
                obras_r.forEach(o => {
                  const c = o.ciclos.find(x => x.periodo === lbl.periodo);
                  cumAcc[o.obra_id] = parseFloat((cumAcc[o.obra_id] + (c?.prejuizo_total ?? 0)).toFixed(2));
                  row[o.obra_id] = cumAcc[o.obra_id];
                });
                return row;
              });

              return (
                <div className="space-y-4 mb-6">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Desempenho · Comparativo {lastDelta.transicao}
                  </p>

                  <div className={`rounded-xl p-5 border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                    melhorou ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${melhorou ? 'text-emerald-600' : 'text-red-500'}`}>
                        {melhorou ? '↓ Redução de prejuízo vs período anterior' : '↑ Aumento de prejuízo vs período anterior'}
                      </p>
                      <p className={`text-4xl font-bold tabular-nums mt-1 ${melhorou ? 'text-emerald-700' : 'text-red-700'}`}>
                        {melhorou ? '−' : '+'}{fmt(Math.abs(economia))}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Soma de todas as obras · {lastDelta.de} → {lastDelta.para}</p>
                    </div>
                    <div className="text-sm space-y-1 shrink-0">
                      {lastDelta.obras.map(o => (
                        <div key={o.obra_id} className="flex items-center justify-between gap-6">
                          <span className="text-zinc-600 font-medium">{o.obra_nome.split(' ').slice(0, 2).join(' ')}</span>
                          <span className={`font-bold tabular-nums ${o.delta_prejuizo <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {o.delta_prejuizo <= 0 ? '−' : '+'}{fmt(Math.abs(o.delta_prejuizo))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lastDelta.obras.map((o, i) => {
                      const melh = o.delta_prejuizo <= 0;
                      return (
                        <div key={o.obra_id} className={`rounded-xl border p-4 ${melh ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: corObra(o.obra_id, i) }} />
                            <p className="font-semibold text-zinc-900 text-sm truncate">{o.obra_nome}</p>
                          </div>
                          <p className="text-xs text-zinc-400 mb-3">{o.encarregado}</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-zinc-500">
                              <span>{lastDelta.de}</span>
                              <span className="font-medium tabular-nums text-zinc-800">{fmt(o.prej_anterior)}</span>
                            </div>
                            <div className="flex justify-between text-zinc-500">
                              <span>{lastDelta.para}</span>
                              <span className="font-medium tabular-nums text-zinc-800">{fmt(o.prej_atual)}</span>
                            </div>
                            <div className={`flex justify-between font-bold border-t border-zinc-200 pt-1 mt-1 ${melh ? 'text-emerald-600' : 'text-red-600'}`}>
                              <span>Variação</span>
                              <span className="tabular-nums">{melh ? '−' : '+'}{fmt(Math.abs(o.delta_prejuizo))}</span>
                            </div>
                            <div className="flex gap-3 text-zinc-400 pt-0.5">
                              <span className={o.delta_faltas > 0 ? 'text-red-500' : o.delta_faltas < 0 ? 'text-emerald-600' : ''}>
                                {o.delta_faltas > 0 ? '+' : ''}{o.delta_faltas} faltas
                              </span>
                              <span className={o.delta_atrasos > 0 ? 'text-red-500' : o.delta_atrasos < 0 ? 'text-emerald-600' : ''}>
                                {o.delta_atrasos > 0 ? '+' : ''}{o.delta_atrasos}m atraso
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <ChartCard title={`Variação de prejuízo por obra · ${lastDelta.de} → ${lastDelta.para} (verde = melhora)`}>
                    <ResponsiveContainer width="100%" height={Math.max(140, lastDelta.obras.length * 56)}>
                      <BarChart layout="vertical" data={deltaObrasData} margin={{ left: 8, right: 64, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                        <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "#52525b" }} axisLine={false} tickLine={false} />
                        <ReferenceLine x={0} stroke="#d4d4d8" />
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          formatter={(v) => [
                            `${Number(v) <= 0 ? '−' : '+'}${fmt(Math.abs(Number(v)))}`,
                            Number(v) <= 0 ? 'Economia' : 'Prejuízo adicional',
                          ]}
                        />
                        <Bar dataKey="delta" radius={4} maxBarSize={36}>
                          {deltaObrasData.map((row, idx) => (
                            <Cell key={idx} fill={row.delta <= 0 ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {deltasComparativo.length > 1 && (
                    <ChartCard title="Histórico de variação total entre períodos (soma das obras) · verde = melhora">
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={deltaEvolData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                          <ReferenceLine y={0} stroke="#d4d4d8" strokeDasharray="4 4" />
                          <Tooltip
                            {...TOOLTIP_STYLE}
                            formatter={(v) => [`${Number(v) <= 0 ? '−' : '+'}${fmt(Math.abs(Number(v)))}`, Number(v) <= 0 ? 'Economia' : 'Piora']}
                          />
                          <Bar dataKey="total" radius={4} maxBarSize={40}>
                            {deltaEvolData.map((row, idx) => (
                              <Cell key={idx} fill={row.total <= 0 ? '#10b981' : '#ef4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  <ChartCard title="Prejuízo acumulado no período por obra (R$)">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={cumData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                        <defs>
                          {obras_r.map((o, i) => (
                            <linearGradient key={o.obra_id} id={`gCum${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={corObra(o.obra_id, i)} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={corObra(o.obra_id, i)} stopOpacity={0}   />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v, _, p) => [fmt(Number(v)), p.name]} />
                        <Legend formatter={v => obras_r.find(o => o.obra_id === v)?.encarregado.nome ?? v} wrapperStyle={{ fontSize: 12 }} />
                        {obras_r.map((o, i) => (
                          <Area
                            key={o.obra_id}
                            type="monotone"
                            dataKey={o.obra_id}
                            name={o.obra_nome}
                            stroke={corObra(o.obra_id, i)}
                            strokeWidth={2}
                            fill={`url(#gCum${i})`}
                            connectNulls
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-zinc-400 mt-2">
                      Soma progressiva de prejuízo ao longo dos períodos · {nivelLabel}
                    </p>
                  </ChartCard>

                  <div className="border-t border-zinc-100 pt-2">
                    <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-4">Detalhamento por Métrica</p>
                  </div>
                </div>
              );
            })()}

            {/* ── IDO — Índice de Desperdício Operacional ── */}
            <ChartCard title="IDO — Índice de Desperdício Operacional · média harmônica por período · escala aberta (10 = limite de tolerância)">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={buildSerieAg('ido', d)} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#a1a1aa" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => v.toFixed(0)}
                    domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.15), 12)]}
                  />
                  <ReferenceLine y={5}  stroke="#d97706" strokeDasharray="5 3" label={{ value: "crítico",  position: "insideTopRight", fontSize: 9, fill: "#d97706" }} />
                  <ReferenceLine y={10} stroke="#dc2626" strokeDasharray="3 2" label={{ value: "limite",   position: "insideTopRight", fontSize: 9, fill: "#dc2626" }} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(v, _, p) => {
                      const val = Number(v);
                      const suffix = val > 10 ? ` ⚠ +${(val - 10).toFixed(2)} acima` : '';
                      return [val.toFixed(2) + suffix, p.name];
                    }}
                  />
                  <Legend formatter={v => obras_r.find(o => o.obra_id === v)?.encarregado.nome ?? v} wrapperStyle={{ fontSize: 12 }} />
                  <LinhasObras />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-zinc-400 mt-2">
                P_threshold: 10% absenteísmo + 15% material excedente · Agregado via média harmônica de (10 − IDO_quinzenal) · valores acima de 10 indicam ultrapassagem do limite tolerável
              </p>
            </ChartCard>

            {/* Grade: faltas + atrasos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 mt-4">
              <ChartCard title="Faltas por obra (tempo equivalente)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={buildSerieAg('faltas', d)} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtFaltas(Number(v))} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v, _, p) => [`${v} falta${Number(v) !== 1 ? 's' : ''} · ${fmtFaltas(Number(v))}`, p.name]} />
                    <LinhasObras />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Atrasos por obra">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={buildSerieAg('atrasos_minutos', d)} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmtTempo(Number(v))} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v, _, p) => [fmtTempo(Number(v)), p.name]} />
                    <LinhasObras />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {nivel !== 'quinzenal' && (
              <ChartCard title="% horas perdidas sobre horas esperadas do período">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={buildSerieAg('pct_horas_perdidas', d)} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v, _, p) => [`${Number(v).toFixed(1)}%`, p.name]} />
                    <LinhasObras />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Grade: material + custo pessoal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 mb-4">
              <ChartCard title="Material excedente por obra (R$)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={buildSerieAg('material_excedente_valor', d)} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v, _, p) => [fmt(Number(v)), p.name]} />
                    <LinhasObras />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Custo perdido com ausências por obra (R$)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={buildSerieAg('custo_perdido_pessoal', d)} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v, _, p) => [fmt(Number(v)), p.name]} />
                    <LinhasObras />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard title="Prejuízo total por encarregado (R$) — ausências + material excedente">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={buildSerieAg('prejuizo_total', d)} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                  <ReferenceLine y={0} stroke="#d4d4d8" strokeDasharray="4 4" />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v, _, p) => [fmt(Number(v)), p.name]} />
                  <Legend formatter={v => obras_r.find(o => o.obra_id === v)?.encarregado.nome ?? v} wrapperStyle={{ fontSize: 12 }} />
                  <LinhasObras />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-zinc-400 mt-2">
                Prejuízo = custo/h × horas perdidas (faltas + atrasos) + valor de material excedente do período
              </p>
            </ChartCard>
          </section>
        );
      })()}

    </div>
  );
}

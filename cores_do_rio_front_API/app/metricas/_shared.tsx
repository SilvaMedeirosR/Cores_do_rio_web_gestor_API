// ── Formatters ────────────────────────────────────────────────────────────────

export const fmt    = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
export const fmtK   = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`;
export const fmtPct = (v: number) => `${v}%`;

export function mesLabel(ym: string) {
  const [y, m] = ym.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`;
}

export const IDO_BRL_PT  = 14.74; // R$ por ponto (R$7,37 = 0,5pt ⇒ 1pt = R$14,74)
export const IDO_ABS_PCT = 0.10;  // 10% de absenteísmo = teto tolerável de tempo
export const IDO_MAT_PCT = 0.15;  // 15% de material excedente = teto tolerável de material

export const OBRA_CORES: Record<string, string> = {
  'obra-001': '#ef4444',
  'obra-002': '#3b82f6',
  'obra-003': '#f97316',
};

export const corObra = (id: string, idx: number) =>
  OBRA_CORES[id] ?? ['#8b5cf6', '#10b981', '#ec4899'][idx % 3];

export const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 12, padding: "8px 12px" },
  labelStyle: { fontWeight: 600, color: "#18181b" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Resumo {
  obras:        { total: number };
  pavimentos:   { total: number };
  comodos:      { total: number };
  orcamento:    { total: number; pago: number; pendente: number; progresso_pct: number };
  funcionarios: { ativos: number; total: number };
  compras:      { pendentes: number; valor_pendente: number };
  financeiro:   { entradas: number; saidas: number; saldo: number };
}

export interface ObraMetrica {
  id: string; nome: string; local: string | null;
  num_pavimentos: number; num_comodos: number;
  orcamento_total: number; valor_pago: number; progresso_pct: number;
}

export interface MesSerie {
  mes: string; entradas: number; saidas: number; saldo: number;
}

export interface Analytics {
  financeiro_mensal: MesSerie[];
  projecao: { mes: string; saldo_projetado: number }[];
  tendencia: { slope: number; direcao: string };
}

export interface CicloQuinzenal {
  periodo:                  string;
  mes_ano:                  string;
  label:                    string;
  faltas:                   number;
  atrasos_eventos:          number;
  atrasos_minutos:          number;
  material_excedente_valor: number;
  custo_perdido_pessoal:    number;
  indice:                   number;
  prejuizo_total:           number;
}

export interface ObraCiclos {
  obra_id:        string;
  obra_nome:      string;
  encarregado:    { id: string; nome: string };
  n_funcionarios: number;
  horas_mensais:  number;
  ciclos:         CicloQuinzenal[];
}

export interface RelatorioObras {
  obras:           ObraCiclos[];
  ciclos_labels:   { periodo: string; label: string }[];
  meses_filtrados: number;
}

export interface CicloAgregado {
  periodo:                  string;
  label:                    string;
  faltas:                   number;
  atrasos_minutos:          number;
  material_excedente_valor: number;
  custo_perdido_pessoal:    number;
  indice:                   number;
  prejuizo_total:           number;
  horas_esperadas:          number;
  pct_horas_perdidas:       number;
  ido:                      number;
}

export interface ObraAgregada {
  obra_id:     string;
  obra_nome:   string;
  encarregado: { id: string; nome: string };
  ciclos:      CicloAgregado[];
}

export type Nivel = 'anual' | 'semestral' | 'quinzenal';

export interface DeltaTransicao {
  transicao: string;
  de:        string;
  para:      string;
  obras: Array<{
    obra_id:        string;
    obra_nome:      string;
    encarregado:    string;
    delta_prejuizo: number;
    delta_faltas:   number;
    delta_atrasos:  number;
    delta_material: number;
    prej_anterior:  number;
    prej_atual:     number;
  }>;
  total_delta: number;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

export function KpiCard({ label, value, sub, color = "zinc" }: {
  label: string; value: string; sub?: string;
  color?: "zinc" | "orange" | "green" | "red" | "blue";
}) {
  const colors = {
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

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">{children}</h2>
  );
}

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
      <p className="text-xs font-medium text-zinc-400 mb-3">{title}</p>
      {children}
    </div>
  );
}

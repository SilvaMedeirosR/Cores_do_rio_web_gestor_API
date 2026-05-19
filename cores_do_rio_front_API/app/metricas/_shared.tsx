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
  'obra-001': '#1A2A3A',
  'obra-002': '#4a7fa5',
  'obra-003': '#8da8be',
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
  const accents: Record<string, string> = {
    zinc:   "#1A2A3A",
    orange: "#1A2A3A",
    green:  "#16a34a",
    red:    "#dc2626",
    blue:   "#1d4ed8",
  };
  const accent = accents[color];
  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid rgba(26,42,58,0.09)",
      borderTop: `2px solid ${accent}`,
      borderRadius: "12px",
      padding: "16px 18px 18px",
      boxShadow: "0 1px 3px rgba(26,42,58,0.05)",
    }}>
      <p style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(26,42,58,0.38)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</p>
      <p style={{ fontSize: "1.6rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1, color: accent, letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ fontSize: "0.67rem", color: "rgba(26,42,58,0.38)", marginTop: "5px" }}>{sub}</p>}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <span style={{ display: "block", width: "3px", height: "12px", backgroundColor: "#1A2A3A", borderRadius: "2px", opacity: 0.2, flexShrink: 0 }} />
      <h2 style={{ fontSize: "0.67rem", fontWeight: 700, color: "rgba(26,42,58,0.48)", letterSpacing: "0.10em", textTransform: "uppercase", margin: 0 }}>{children}</h2>
    </div>
  );
}

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid rgba(26,42,58,0.09)",
      borderRadius: "12px",
      boxShadow: "0 1px 3px rgba(26,42,58,0.05)",
    }}>
      <div style={{ padding: "11px 18px", borderBottom: "1px solid rgba(26,42,58,0.06)" }}>
        <p style={{ fontSize: "0.67rem", fontWeight: 600, color: "rgba(26,42,58,0.42)", letterSpacing: "0.04em" }}>{title}</p>
      </div>
      <div style={{ padding: "16px 18px" }}>
        {children}
      </div>
    </div>
  );
}

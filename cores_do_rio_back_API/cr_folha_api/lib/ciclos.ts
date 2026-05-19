export type Workflow = 'pagamento_1' | 'pagamento_2' | 'passagens';
export type Dept     = 'dp' | 'financeiro' | 'beneficios';

export interface EtapaParaInserir {
  tipo_workflow:    Workflow;
  ciclo_ref:        string;
  etapa_nome:       string;
  etapa_label:      string;
  dept_responsavel: Dept;
  data_prevista:    string;
}

// Pagamento 1 — pagamento dia 08, início dia 27 mês anterior (usa dias do mês corrente)
const P1: Array<{ nome: string; label: string; dept: Dept; dia: number }> = [
  { nome: 'folha_escritorio',   label: 'Folha no Escritório',   dept: 'dp',         dia: 2  },
  { nome: 'lancamento_sistema', label: 'Lançamento no Sistema', dept: 'dp',         dia: 3  },
  { nome: 'conferencias',       label: 'Conferências',          dept: 'financeiro', dia: 4  },
  { nome: 'lancamento_banco',   label: 'Lançamento no Banco',   dept: 'financeiro', dia: 5  },
];

// Pagamento 2 — pagamento dia 25
const P2: Array<{ nome: string; label: string; dept: Dept; dia: number }> = [
  { nome: 'folha_escritorio',   label: 'Folha no Escritório',   dept: 'dp',         dia: 17 },
  { nome: 'lancamento_sistema', label: 'Lançamento no Sistema', dept: 'dp',         dia: 18 },
  { nome: 'conferencias',       label: 'Conferências',          dept: 'financeiro', dia: 19 },
  { nome: 'lancamento_banco',   label: 'Lançamento no Banco',   dept: 'financeiro', dia: 20 },
];

// Passagens — semanal, cada dept confirma independentemente
const PASSAGENS: Array<{ nome: string; label: string; dept: Dept; dow: number }> = [
  { nome: 'relatorio_ponto_dp',         label: 'Relatório de Ponto',  dept: 'dp',         dow: 3 }, // Quarta
  { nome: 'relatorio_ponto_beneficios', label: 'Relatório de Ponto',  dept: 'beneficios', dow: 3 }, // Quarta
  { nome: 'conferencia_dp',             label: 'Conferência',         dept: 'dp',         dow: 4 }, // Quinta
  { nome: 'conferencia_beneficios',     label: 'Conferência',         dept: 'beneficios', dow: 4 }, // Quinta
  { nome: 'conferencia_financeiro',     label: 'Conferência',         dept: 'financeiro', dow: 4 }, // Quinta
];

function pad(n: number): string { return String(n).padStart(2, '0'); }

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function isoWeek(d: Date): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${pad(week)}`;
}

// Monday of the ISO week that contains `d`
function mondayOf(d: Date): Date {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() - (day - 1));
  return tmp;
}

// Next occurrence of dow (0=Sun … 6=Sat) on or after `from`
function nextDow(from: Date, dow: number): Date {
  const d = new Date(from);
  const diff = (dow - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function gerarEtapasMensais(ano: number, mes: number): EtapaParaInserir[] {
  const ref = `${ano}-${pad(mes)}`;
  const out: EtapaParaInserir[] = [];

  for (const e of P1) {
    out.push({ tipo_workflow: 'pagamento_1', ciclo_ref: ref, etapa_nome: e.nome, etapa_label: e.label, dept_responsavel: e.dept, data_prevista: isoDate(ano, mes, e.dia) });
  }
  for (const e of P2) {
    out.push({ tipo_workflow: 'pagamento_2', ciclo_ref: ref, etapa_nome: e.nome, etapa_label: e.label, dept_responsavel: e.dept, data_prevista: isoDate(ano, mes, e.dia) });
  }
  return out;
}

export function gerarEtapasPassagens(semana: Date): EtapaParaInserir[] {
  const monday  = mondayOf(semana);
  const cicloRef = isoWeek(monday);

  return PASSAGENS.map(e => {
    const dia = nextDow(monday, e.dow);
    return {
      tipo_workflow:    'passagens',
      ciclo_ref:        cicloRef,
      etapa_nome:       e.nome,
      etapa_label:      e.label,
      dept_responsavel: e.dept,
      data_prevista:    `${dia.getUTCFullYear()}-${pad(dia.getUTCMonth() + 1)}-${pad(dia.getUTCDate())}`,
    };
  });
}

// UTC-3 (Brazil)
export function hoje(): string {
  const d = new Date();
  d.setHours(d.getHours() - 3);
  return d.toISOString().split('T')[0];
}

export function addDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().split('T')[0];
}

export const DEPT_EMAIL: Record<Dept, string> = {
  dp:         'dp@coresdorio.net.br',
  financeiro: 'financeiro@coresdorio.net.br',
  beneficios: 'beneficios@coresdorio.net.br',
};

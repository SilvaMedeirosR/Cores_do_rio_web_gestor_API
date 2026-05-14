import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';

export type RouteHandler = (req: VercelRequest, res: VercelResponse, params?: Record<string, string>) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

const ETAPAS = ['massa_parede', 'massa_teto', 'lixacao', 'pintura', 'acabamento'] as const;
type Etapa = typeof ETAPAS[number];

interface ComodoCalculo {
  id: string;
  parede1_m2: unknown;
  parede2_m2: unknown;
  parede3_m2: unknown;
  parede4_m2: unknown;
  teto_m2: unknown;
}

function calcOrcamento(c: ComodoCalculo, precoMap: Record<string, number>): number {
  const totalParedes =
    Number(c.parede1_m2) + Number(c.parede2_m2) +
    Number(c.parede3_m2) + Number(c.parede4_m2);
  const teto      = Number(c.teto_m2);
  const totalArea = totalParedes + teto;
  return (
    totalParedes * (precoMap.massa_parede ?? 0) +
    teto         * (precoMap.massa_teto   ?? 0) +
    totalArea    * ((precoMap.lixacao ?? 0) + (precoMap.pintura ?? 0) + (precoMap.acabamento ?? 0))
  );
}

// ── GET /resumo ────────────────────────────────────────────────────────────────
// Painel geral: obras, orçamento total, progresso, funcionários, compras
const getResumo: RouteHandler = async (_req, res) => {
  const [obrasRes, funcionariosRes, comprasRes, lancamentosRes] = await Promise.all([
    supabase.from('obras').select(`
      id, nome,
      obra_precos(etapa, preco_m2),
      pavimentos(
        comodos(id, parede1_m2, parede2_m2, parede3_m2, parede4_m2, teto_m2)
      )
    `),
    supabase.from('funcionarios').select('id, status'),
    supabase.from('compras').select('id, valor, status'),
    supabase.from('lancamentos').select('valor, tipo'),
  ]);

  if (obrasRes.error)  return res.status(500).json({ error: obrasRes.error.message });

  type ObraRow = {
    id: string; nome: string;
    obra_precos: { etapa: string; preco_m2: unknown }[];
    pavimentos: { comodos: ComodoCalculo[] }[];
  };

  const obras = (obrasRes.data ?? []) as unknown as ObraRow[];

  // Calcula orçamento total e IDs de todos os cômodos
  let orcamentoTotal = 0;
  const allComodoIds: string[] = [];

  for (const o of obras) {
    const precoMap = Object.fromEntries(
      o.obra_precos.map(p => [p.etapa, Number(p.preco_m2)])
    ) as Record<Etapa, number>;

    for (const pav of o.pavimentos) {
      for (const c of pav.comodos) {
        orcamentoTotal += calcOrcamento(c, precoMap);
        allComodoIds.push(c.id);
      }
    }
  }

  // Valor total pago
  let valorPago = 0;
  if (allComodoIds.length > 0) {
    const { data: progressos } = await supabase
      .from('etapa_progresso')
      .select('valor_pago')
      .in('comodo_id', allComodoIds);
    valorPago = (progressos ?? []).reduce((s, p) => s + Number(p.valor_pago), 0);
  }

  const funcionarios   = funcionariosRes.data ?? [];
  const compras        = comprasRes.data ?? [];
  const lancamentos    = lancamentosRes.data ?? [];

  const totalFuncionariosAtivos = funcionarios.filter(f => f.status === 'ativo').length;
  const comprasPendentes        = compras.filter(c => c.status === 'pendente');
  const totalComprasPendentes   = comprasPendentes.reduce((s, c) => s + Number(c.valor), 0);

  const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0);
  const saidas   = lancamentos.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0);

  const totalComodos    = allComodoIds.length;
  const totalPavimentos = obras.reduce((s, o) => s + o.pavimentos.length, 0);
  const progresso       = orcamentoTotal > 0 ? Math.min(Math.round((valorPago / orcamentoTotal) * 100), 100) : 0;

  return res.status(200).json({
    data: {
      obras: { total: obras.length },
      pavimentos: { total: totalPavimentos },
      comodos: { total: totalComodos },
      orcamento: {
        total: orcamentoTotal,
        pago: valorPago,
        pendente: orcamentoTotal - valorPago,
        progresso_pct: progresso,
      },
      funcionarios: {
        ativos: totalFuncionariosAtivos,
        total: funcionarios.length,
      },
      compras: {
        pendentes: comprasPendentes.length,
        valor_pendente: totalComprasPendentes,
      },
      financeiro: {
        entradas,
        saidas,
        saldo: entradas - saidas,
      },
    },
  });
};

// ── GET /obras ─────────────────────────────────────────────────────────────────
// Lista de obras com orçamento e progresso individual
const getObras: RouteHandler = async (_req, res) => {
  const { data: obrasRaw, error } = await supabase.from('obras').select(`
    id, nome, local, empreiteira, created_at,
    obra_precos(etapa, preco_m2),
    pavimentos(
      id,
      comodos(id, parede1_m2, parede2_m2, parede3_m2, parede4_m2, teto_m2)
    )
  `);

  if (error) return res.status(500).json({ error: error.message });

  type ObraRow = {
    id: string; nome: string; local: string | null; empreiteira: string | null; created_at: string;
    obra_precos: { etapa: string; preco_m2: unknown }[];
    pavimentos: { id: string; comodos: ComodoCalculo[] }[];
  };

  const obras = (obrasRaw ?? []) as unknown as ObraRow[];

  // Coleta todos os IDs de cômodo
  const allComodoIds = obras.flatMap(o => o.pavimentos.flatMap(p => p.comodos.map(c => c.id)));
  const progressoMap: Record<string, number> = {};

  if (allComodoIds.length > 0) {
    const { data: progressos } = await supabase
      .from('etapa_progresso')
      .select('comodo_id, valor_pago')
      .in('comodo_id', allComodoIds);

    for (const p of progressos ?? []) {
      progressoMap[p.comodo_id] = (progressoMap[p.comodo_id] ?? 0) + Number(p.valor_pago);
    }
  }

  const result = obras.map(o => {
    const precoMap = Object.fromEntries(
      o.obra_precos.map(p => [p.etapa, Number(p.preco_m2)])
    ) as Record<Etapa, number>;

    let orcamento = 0;
    let pago      = 0;
    let numComodos = 0;

    for (const pav of o.pavimentos) {
      for (const c of pav.comodos) {
        orcamento += calcOrcamento(c, precoMap);
        pago      += progressoMap[c.id] ?? 0;
        numComodos++;
      }
    }

    return {
      id: o.id,
      nome: o.nome,
      local: o.local,
      empreiteira: o.empreiteira,
      num_pavimentos: o.pavimentos.length,
      num_comodos: numComodos,
      orcamento_total: orcamento,
      valor_pago: pago,
      progresso_pct: orcamento > 0 ? Math.min(Math.round((pago / orcamento) * 100), 100) : 0,
    };
  });

  return res.status(200).json({ data: result });
};

// ── GET /financeiro ────────────────────────────────────────────────────────────
// Resumo financeiro: entradas, saídas, saldo e últimos lançamentos
const getFinanceiro: RouteHandler = async (_req, res) => {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('id, descricao, valor, tipo, categoria, data')
    .order('data', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  const lancamentos = data ?? [];
  const entradas    = lancamentos.filter(l => l.tipo === 'entrada');
  const saidas      = lancamentos.filter(l => l.tipo === 'saida');

  const totalEntradas = entradas.reduce((s, l) => s + Number(l.valor), 0);
  const totalSaidas   = saidas.reduce((s, l) => s + Number(l.valor), 0);

  // Agrupamento por categoria
  const porCategoria: Record<string, { entradas: number; saidas: number }> = {};
  for (const l of lancamentos) {
    const cat = l.categoria ?? 'Outros';
    if (!porCategoria[cat]) porCategoria[cat] = { entradas: 0, saidas: 0 };
    if (l.tipo === 'entrada') porCategoria[cat].entradas += Number(l.valor);
    else                       porCategoria[cat].saidas   += Number(l.valor);
  }

  return res.status(200).json({
    data: {
      totais: {
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo: totalEntradas - totalSaidas,
      },
      por_categoria: Object.entries(porCategoria).map(([cat, v]) => ({ categoria: cat, ...v })),
      recentes: lancamentos.slice(0, 10),
    },
  });
};

// ── GET /funcionarios ──────────────────────────────────────────────────────────
const getFuncionarios: RouteHandler = async (_req, res) => {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('id, nome, cargo, status, salario, data_admissao')
    .order('nome');

  if (error) return res.status(500).json({ error: error.message });

  const funcionarios = data ?? [];
  const ativos       = funcionarios.filter(f => f.status === 'ativo');

  // Distribuição por cargo
  const porCargo: Record<string, number> = {};
  for (const f of ativos) {
    porCargo[f.cargo] = (porCargo[f.cargo] ?? 0) + 1;
  }

  const folhaMensal = ativos.reduce((s, f) => s + Number(f.salario ?? 0), 0);

  return res.status(200).json({
    data: {
      total: funcionarios.length,
      ativos: ativos.length,
      inativos: funcionarios.length - ativos.length,
      folha_mensal: folhaMensal,
      por_cargo: Object.entries(porCargo).map(([cargo, count]) => ({ cargo, count })),
      lista: funcionarios,
    },
  });
};

// ── GET /health ────────────────────────────────────────────────────────────────
const health: RouteHandler = (_req, res) => res.status(200).json({ ok: true });

export const routes: Route[] = [
  { method: 'GET',  path: '/resumo',       handler: getResumo       },
  { method: 'GET',  path: '/obras',        handler: getObras        },
  { method: 'GET',  path: '/financeiro',   handler: getFinanceiro   },
  { method: 'GET',  path: '/funcionarios', handler: getFuncionarios  },
  { method: 'GET',  path: '/health',       handler: health          },
];

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
type PrecoMap = Record<string, number>;
type ParedeItem = { m2: number };
type TetoItem   = { m2: number };

// ── helpers de cascata de preços ──────────────────────────────────────────────

function buildPrecoMap(precos: { etapa: string; preco_m2: unknown }[]): PrecoMap {
  return Object.fromEntries(precos.map(p => [p.etapa, Number(p.preco_m2)]));
}

function buildPrecoTiposMap(tipos: { id: string; preco_tipo_precos: { etapa: string; preco_m2: unknown }[] }[]): Record<string, PrecoMap> {
  return Object.fromEntries(tipos.map(t => [t.id, buildPrecoMap(t.preco_tipo_precos)]));
}

function resolvePrecos(tipoId: string | null | undefined, precoTiposMap: Record<string, PrecoMap>, base: PrecoMap): PrecoMap {
  if (tipoId && precoTiposMap[tipoId]) return { ...base, ...precoTiposMap[tipoId] };
  return base;
}

function somarParedes(c: Record<string, unknown>): number {
  const arr = Array.isArray(c.paredes) ? c.paredes as ParedeItem[] : [];
  if (arr.length > 0) return arr.reduce((s, p) => s + Number(p.m2), 0);
  return Number(c.parede1_m2 ?? 0) + Number(c.parede2_m2 ?? 0) + Number(c.parede3_m2 ?? 0) + Number(c.parede4_m2 ?? 0);
}

function somarTetos(c: Record<string, unknown>): number {
  const arr = Array.isArray(c.tetos) ? c.tetos as TetoItem[] : [];
  if (arr.length > 0) return arr.reduce((s, t) => s + Number(t.m2), 0);
  return Number(c.teto_m2 ?? 0);
}

function calcOrcamentoComodo(c: Record<string, unknown>, precoMap: PrecoMap): Record<Etapa, number> & { total: number } {
  const totalParedes = somarParedes(c);
  const teto         = somarTetos(c);
  const totalArea    = totalParedes + teto;
  const etapas = {
    massa_parede: totalParedes * (precoMap.massa_parede ?? 0),
    massa_teto:   teto         * (precoMap.massa_teto   ?? 0),
    lixacao:      totalArea    * (precoMap.lixacao      ?? 0),
    pintura:      totalArea    * (precoMap.pintura      ?? 0),
    acabamento:   totalArea    * (precoMap.acabamento   ?? 0),
  };
  const total = Object.values(etapas).reduce((s, v) => s + v, 0);
  return { ...etapas, total };
}

// ── Lancamentos ───────────────────────────────────────────────────────────────

async function listarLancamentos(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase.from('lancamentos').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

async function criarLancamento(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Corpo da requisicao invalido' });
  }
  const { descricao, valor, tipo, categoria, data } = body as Record<string, unknown>;
  if (!descricao || typeof descricao !== 'string' || descricao.trim() === '') {
    return res.status(400).json({ error: 'Campo "descricao" e obrigatorio' });
  }
  if (valor === undefined || valor === null || isNaN(Number(valor))) {
    return res.status(400).json({ error: 'Campo "valor" e obrigatorio e deve ser numerico' });
  }
  if (tipo !== 'receita' && tipo !== 'despesa') {
    return res.status(400).json({ error: 'Campo "tipo" deve ser "receita" ou "despesa"' });
  }
  const payload: Record<string, unknown> = { descricao: (descricao as string).trim(), valor: Number(valor), tipo };
  if (categoria !== undefined && categoria !== null && String(categoria).trim() !== '') payload.categoria = String(categoria).trim();
  if (data) payload.data = String(data);
  const { data: result, error } = await supabase.from('lancamentos').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ message: 'Lancamento financeiro criado com sucesso', data: result });
}

// ── Obras (visao financeira) ──────────────────────────────────────────────────

async function listarObras(_req: VercelRequest, res: VercelResponse) {
  const { data: obras, error } = await supabase
    .from('obras')
    .select(`
      id, nome, local, created_at,
      obra_precos(etapa, preco_m2),
      preco_tipos(id, preco_tipo_precos(etapa, preco_m2)),
      pavimentos(
        id, preco_tipo_id,
        apartamentos(id, preco_tipo_id),
        comodos(id, preco_tipo_id, apartamento_id, parede1_m2, parede2_m2, parede3_m2, parede4_m2, teto_m2, paredes, tetos)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  if (!obras || obras.length === 0) return res.status(200).json({ data: [] });

  type AptRow = { id: string; preco_tipo_id: string | null; };
  type ComodoRow = { id: string; preco_tipo_id: string | null; apartamento_id: string | null; [k: string]: unknown; };
  type PavRow = { id: string; preco_tipo_id: string | null; apartamentos: AptRow[]; comodos: ComodoRow[]; };
  type PrecoTipoRow = { id: string; preco_tipo_precos: { etapa: string; preco_m2: unknown }[]; };
  type ObraRow = {
    id: string; nome: string; local: string;
    obra_precos: { etapa: string; preco_m2: unknown }[];
    preco_tipos: PrecoTipoRow[];
    pavimentos: PavRow[];
  };

  const rows = obras as unknown as ObraRow[];
  const allComodoIds = rows.flatMap(o => o.pavimentos.flatMap(p => p.comodos.map(c => c.id)));

  const { data: progresso } = allComodoIds.length > 0
    ? await supabase.from('etapa_progresso').select('comodo_id, valor_pago').in('comodo_id', allComodoIds)
    : { data: [] };

  const pagoMap: Record<string, number> = {};
  for (const p of (progresso ?? []) as { comodo_id: string; valor_pago: unknown }[]) {
    pagoMap[p.comodo_id] = (pagoMap[p.comodo_id] ?? 0) + Number(p.valor_pago);
  }

  const result = rows.map(o => {
    const obraPrecos    = buildPrecoMap(o.obra_precos);
    const precoTiposMap = buildPrecoTiposMap(o.preco_tipos);
    let orcamento_total = 0;
    let valor_pago = 0;
    let num_comodos = 0;

    for (const pav of o.pavimentos) {
      const pavPrecos = resolvePrecos(pav.preco_tipo_id, precoTiposMap, obraPrecos);
      const aptPrecoMap: Record<string, string | null> = {};
      for (const apt of pav.apartamentos) aptPrecoMap[apt.id] = apt.preco_tipo_id;

      for (const c of pav.comodos) {
        const aptPrecos = c.apartamento_id
          ? resolvePrecos(aptPrecoMap[c.apartamento_id] ?? null, precoTiposMap, pavPrecos)
          : pavPrecos;
        const efetivos = resolvePrecos(c.preco_tipo_id, precoTiposMap, aptPrecos);
        orcamento_total += calcOrcamentoComodo(c, efetivos).total;
        valor_pago      += pagoMap[c.id] ?? 0;
        num_comodos++;
      }
    }

    return {
      id: o.id, nome: o.nome, local: o.local,
      orcamento_total, valor_pago,
      num_pavimentos: o.pavimentos.length, num_comodos,
    };
  });

  return res.status(200).json({ data: result });
}

async function getObraDetalhe(_req: VercelRequest, res: VercelResponse, params?: Record<string, string>) {
  const obraId = params?.obraId;
  if (!obraId) return res.status(400).json({ error: 'obraId obrigatorio' });

  const { data: obra, error } = await supabase
    .from('obras')
    .select(`
      id, nome, local,
      obra_precos(etapa, preco_m2),
      preco_tipos(id, preco_tipo_precos(etapa, preco_m2)),
      pavimentos(
        id, nome, numero, preco_tipo_id,
        apartamentos(id, preco_tipo_id),
        comodos(id, tipo, nome, etapa_atual, preco_tipo_id, apartamento_id, parede1_m2, parede2_m2, parede3_m2, parede4_m2, teto_m2, paredes, tetos)
      )
    `)
    .eq('id', obraId)
    .single();

  if (error) return res.status(404).json({ error: 'Obra nao encontrada' });

  type AptDetail   = { id: string; preco_tipo_id: string | null; };
  type ComodoDetail = { id: string; tipo: string; nome: string | null; etapa_atual: string | null; preco_tipo_id: string | null; apartamento_id: string | null; [k: string]: unknown; };
  type PavDetail   = { id: string; nome: string; numero: number; preco_tipo_id: string | null; apartamentos: AptDetail[]; comodos: ComodoDetail[]; };
  type PrecoTipoRow = { id: string; preco_tipo_precos: { etapa: string; preco_m2: unknown }[]; };
  type ObraDetail  = {
    id: string; nome: string; local: string;
    obra_precos: { etapa: string; preco_m2: unknown }[];
    preco_tipos: PrecoTipoRow[];
    pavimentos: PavDetail[];
  };

  const o = obra as unknown as ObraDetail;
  const obraPrecos    = buildPrecoMap(o.obra_precos);
  const precoTiposMap = buildPrecoTiposMap(o.preco_tipos);
  const allComodoIds  = o.pavimentos.flatMap(p => p.comodos.map(c => c.id));

  // Auto-create missing etapa_progresso records
  const { data: existingProg } = await supabase
    .from('etapa_progresso').select('comodo_id, etapa').in('comodo_id', allComodoIds);

  const existingSet = new Set(
    (existingProg ?? []).map((r: { comodo_id: string; etapa: string }) => `${r.comodo_id}:${r.etapa}`)
  );
  const toInsert: { comodo_id: string; etapa: string; valor_pago: number; concluida: boolean }[] = [];
  for (const comodoId of allComodoIds) {
    for (const etapa of ETAPAS) {
      if (!existingSet.has(`${comodoId}:${etapa}`)) {
        toInsert.push({ comodo_id: comodoId, etapa, valor_pago: 0, concluida: false });
      }
    }
  }
  if (toInsert.length > 0) await supabase.from('etapa_progresso').insert(toInsert);

  const { data: progresso } = await supabase
    .from('etapa_progresso').select('comodo_id, etapa, valor_pago, concluida').in('comodo_id', allComodoIds);

  type ProgRecord = { comodo_id: string; etapa: string; valor_pago: unknown; concluida: boolean };
  const progMap: Record<string, Record<string, ProgRecord>> = {};
  for (const p of (progresso ?? []) as ProgRecord[]) {
    if (!progMap[p.comodo_id]) progMap[p.comodo_id] = {};
    progMap[p.comodo_id][p.etapa] = p;
  }

  let obra_orcamento = 0;
  let obra_pago = 0;

  const pavimentos = o.pavimentos
    .sort((a, b) => a.numero - b.numero)
    .map(pav => {
      const pavPrecos = resolvePrecos(pav.preco_tipo_id, precoTiposMap, obraPrecos);
      const aptPrecoMap: Record<string, string | null> = {};
      for (const apt of pav.apartamentos) aptPrecoMap[apt.id] = apt.preco_tipo_id;

      let pav_orcamento = 0;
      let pav_pago = 0;

      const comodos = pav.comodos.map(c => {
        const aptPrecos = c.apartamento_id
          ? resolvePrecos(aptPrecoMap[c.apartamento_id] ?? null, precoTiposMap, pavPrecos)
          : pavPrecos;
        const efetivos  = resolvePrecos(c.preco_tipo_id, precoTiposMap, aptPrecos);
        const orcEtapas = calcOrcamentoComodo(c, efetivos);

        const etapas = ETAPAS.map(e => {
          const orcEtapa   = orcEtapas[e];
          const prog       = progMap[c.id]?.[e];
          const valor_pago = prog ? Number(prog.valor_pago) : 0;
          const concluida  = prog?.concluida || valor_pago >= orcEtapa;
          return { etapa: e, orcamento: orcEtapa, valor_pago, concluida };
        });
        const comodo_pago = etapas.reduce((s, e) => s + e.valor_pago, 0);
        pav_orcamento += orcEtapas.total;
        pav_pago      += comodo_pago;
        return {
          id: c.id, tipo: c.tipo, nome: c.nome,
          etapa_atual: c.etapa_atual ?? 'massa_parede',
          orcamento_total: orcEtapas.total, valor_pago: comodo_pago, etapas,
        };
      });

      obra_orcamento += pav_orcamento;
      obra_pago      += pav_pago;
      return { id: pav.id, nome: pav.nome, numero: pav.numero, orcamento_total: pav_orcamento, valor_pago: pav_pago, comodos };
    });

  return res.status(200).json({
    data: { id: o.id, nome: o.nome, local: o.local, orcamento_total: obra_orcamento, valor_pago: obra_pago, pavimentos },
  });
}

// ── Progresso (endpoints mantidos para compatibilidade) ───────────────────────

async function getProgressoComodo(_req: VercelRequest, res: VercelResponse, params?: Record<string, string>) {
  const comodoId = params?.comodoId;
  if (!comodoId) return res.status(400).json({ error: 'comodoId obrigatorio' });
  const { data: existing, error: fetchErr } = await supabase.from('etapa_progresso').select('etapa').eq('comodo_id', comodoId);
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  const existingSet = new Set((existing ?? []).map((r: { etapa: string }) => r.etapa));
  const toInsert = ETAPAS.filter(e => !existingSet.has(e)).map(e => ({ comodo_id: comodoId, etapa: e, valor_pago: 0, concluida: false }));
  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from('etapa_progresso').insert(toInsert);
    if (insertErr) return res.status(500).json({ error: insertErr.message });
  }
  const { data, error } = await supabase.from('etapa_progresso').select('*').eq('comodo_id', comodoId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

async function getProgressoComodos(req: VercelRequest, res: VercelResponse) {
  const rawIds = req.query.ids;
  if (!rawIds) return res.status(400).json({ error: 'ids obrigatorio' });
  const ids = (Array.isArray(rawIds) ? rawIds : [rawIds]).flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) return res.status(400).json({ error: 'ids obrigatorio' });
  const { data, error } = await supabase.from('etapa_progresso').select('*').in('comodo_id', ids);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data: data ?? [] });
}

// ── Health ────────────────────────────────────────────────────────────────────

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-financeiro-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',                           handler: listarLancamentos   },
  { method: 'POST', path: '/',                           handler: criarLancamento     },
  { method: 'GET',  path: '/obras',                      handler: listarObras         },
  { method: 'GET',  path: '/obras/:obraId',              handler: getObraDetalhe      },
  { method: 'GET',  path: '/progresso/comodo/:comodoId', handler: getProgressoComodo  },
  { method: 'GET',  path: '/progresso',                  handler: getProgressoComodos },
  { method: 'GET',  path: '/health',                     handler: healthCheck         },
];

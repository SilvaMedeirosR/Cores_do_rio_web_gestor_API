import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';

export type RouteHandler = (req: VercelRequest, res: VercelResponse, params?: Record<string, string>) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

const ETAPAS = ['massa_parede', 'massa_teto', 'lixacao', 'pintura', 'acabamento'] as const;

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

  const payload: Record<string, unknown> = {
    descricao: descricao.trim(),
    valor: Number(valor),
    tipo,
  };
  if (categoria !== undefined && categoria !== null && String(categoria).trim() !== '') payload.categoria = String(categoria).trim();
  if (data) payload.data = String(data);

  const { data: result, error } = await supabase.from('lancamentos').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ message: 'Lancamento financeiro criado com sucesso', data: result });
}

// ── Progresso ─────────────────────────────────────────────────────────────────

async function getProgressoComodo(_req: VercelRequest, res: VercelResponse, params?: Record<string, string>) {
  const comodoId = params?.comodoId;
  if (!comodoId) return res.status(400).json({ error: 'comodoId obrigatorio' });

  const { data: existing, error: fetchErr } = await supabase
    .from('etapa_progresso')
    .select('etapa')
    .eq('comodo_id', comodoId);

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  const existingSet = new Set((existing ?? []).map((r: { etapa: string }) => r.etapa));
  const toInsert = ETAPAS
    .filter(e => !existingSet.has(e))
    .map(e => ({ comodo_id: comodoId, etapa: e, valor_pago: 0, concluida: false }));

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from('etapa_progresso').insert(toInsert);
    if (insertErr) return res.status(500).json({ error: insertErr.message });
  }

  const { data, error } = await supabase
    .from('etapa_progresso')
    .select('*')
    .eq('comodo_id', comodoId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

async function getProgressoComodos(req: VercelRequest, res: VercelResponse) {
  const rawIds = req.query.ids;
  if (!rawIds) return res.status(400).json({ error: 'ids obrigatorio' });

  const ids = (Array.isArray(rawIds) ? rawIds : [rawIds])
    .flatMap(s => s.split(','))
    .map(s => s.trim())
    .filter(Boolean);

  if (ids.length === 0) return res.status(400).json({ error: 'ids obrigatorio' });

  const { data, error } = await supabase
    .from('etapa_progresso')
    .select('*')
    .in('comodo_id', ids);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data: data ?? [] });
}

// ── Health ────────────────────────────────────────────────────────────────────

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-financeiro-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',                           handler: listarLancamentos  },
  { method: 'POST', path: '/',                           handler: criarLancamento    },
  { method: 'GET',  path: '/progresso/comodo/:comodoId', handler: getProgressoComodo },
  { method: 'GET',  path: '/progresso',                  handler: getProgressoComodos },
  { method: 'GET',  path: '/health',                     handler: healthCheck        },
];

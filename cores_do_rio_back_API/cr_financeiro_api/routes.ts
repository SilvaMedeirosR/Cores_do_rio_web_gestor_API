import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

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

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-financeiro-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarLancamentos },
  { method: 'POST', path: '/',       handler: criarLancamento   },
  { method: 'GET',  path: '/health', handler: healthCheck       },
];

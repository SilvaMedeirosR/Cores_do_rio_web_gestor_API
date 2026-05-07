import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

async function listarCompras(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase.from('compras').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

async function criarCompra(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Corpo da requisicao invalido' });
  }

  const { item, quantidade, valor, status } = body as Record<string, unknown>;

  if (!item || typeof item !== 'string' || item.trim() === '') {
    return res.status(400).json({ error: 'Campo "item" e obrigatorio' });
  }
  if (valor === undefined || valor === null || isNaN(Number(valor))) {
    return res.status(400).json({ error: 'Campo "valor" e obrigatorio e deve ser numerico' });
  }

  const payload: Record<string, unknown> = {
    item: item.trim(),
    valor: Number(valor),
    quantidade: quantidade !== undefined ? Math.max(1, parseInt(String(quantidade)) || 1) : 1,
  };
  if (status !== undefined) payload.status = String(status);

  const { data, error } = await supabase.from('compras').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ message: 'Compra criada com sucesso', data });
}

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-compras-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarCompras },
  { method: 'POST', path: '/',       handler: criarCompra   },
  { method: 'GET',  path: '/health', handler: healthCheck   },
];

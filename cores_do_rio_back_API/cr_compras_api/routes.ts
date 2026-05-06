import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

// ============================================================
// Compras - Gerenciamento de pedidos e ordens de compra
// GET  /  -> Lista todas as compras registradas
// POST /  -> Cria uma nova ordem de compra
// ============================================================

async function listarCompras(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase.from('compras').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

async function criarCompra(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Corpo da requisicao e obrigatorio' });
  }
  const { data, error } = await supabase.from('compras').insert(body).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ message: 'Compra criada com sucesso', data });
}

// ============================================================
// Health Check - Monitoramento e disponibilidade da API de Compras
// GET /health -> Retorna o status atual da API
// ============================================================

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-compras-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarCompras },
  { method: 'POST', path: '/',       handler: criarCompra   },
  { method: 'GET',  path: '/health', handler: healthCheck   },
];
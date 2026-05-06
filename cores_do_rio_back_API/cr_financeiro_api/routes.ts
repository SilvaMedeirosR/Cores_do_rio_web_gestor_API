import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

// ============================================================
// Financeiro - Lancamentos e transacoes financeiras
// GET  /  -> Lista todos os lancamentos financeiros
// POST /  -> Cria um novo lancamento financeiro
// ============================================================

async function listarLancamentos(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase.from('lancamentos').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

async function criarLancamento(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Dados financeiros sao obrigatorios' });
  }
  const { data, error } = await supabase.from('lancamentos').insert(body).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ message: 'Lancamento financeiro criado com sucesso', data });
}

// ============================================================
// Health Check - Monitoramento e disponibilidade da API Financeira
// GET /health -> Retorna o status atual da API
// ============================================================

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-financeiro-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarLancamentos },
  { method: 'POST', path: '/',       handler: criarLancamento   },
  { method: 'GET',  path: '/health', handler: healthCheck       },
];
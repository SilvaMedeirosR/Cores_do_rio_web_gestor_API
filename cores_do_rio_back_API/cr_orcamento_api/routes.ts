import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

// ============================================================
// Orcamento - Planejamento e gestao de orcamentos
// GET  /  -> Lista todos os orcamentos cadastrados
// POST /  -> Cria um novo orcamento
// ============================================================

async function listarOrcamentos(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase.from('orcamentos').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

async function criarOrcamento(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Dados do orcamento sao obrigatorios' });
  }
  const { data, error } = await supabase.from('orcamentos').insert(body).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ message: 'Orcamento criado com sucesso', data });
}

// ============================================================
// Health Check - Monitoramento e disponibilidade da API de Orcamento
// GET /health -> Retorna o status atual da API
// ============================================================

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-orcamento-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarOrcamentos },
  { method: 'POST', path: '/',       handler: criarOrcamento   },
  { method: 'GET',  path: '/health', handler: healthCheck      },
];
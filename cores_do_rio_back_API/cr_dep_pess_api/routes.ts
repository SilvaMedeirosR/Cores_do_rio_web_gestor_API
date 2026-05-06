import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

// ============================================================
// Departamento Pessoal - Gestao de funcionarios e registros de DP
// GET  /  -> Lista todos os registros de funcionarios
// POST /  -> Cria um novo registro de funcionario
// ============================================================

async function listarFuncionarios(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase.from('funcionarios').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

async function criarFuncionario(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Dados do funcionario sao obrigatorios' });
  }
  const { data, error } = await supabase.from('funcionarios').insert(body).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ message: 'Registro de DP criado com sucesso', data });
}

// ============================================================
// Health Check - Monitoramento e disponibilidade da API de DP
// GET /health -> Retorna o status atual da API
// ============================================================

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-dep-pess-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarFuncionarios },
  { method: 'POST', path: '/',       handler: criarFuncionario   },
  { method: 'GET',  path: '/health', handler: healthCheck        },
];
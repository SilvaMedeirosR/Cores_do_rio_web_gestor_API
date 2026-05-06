import { VercelRequest, VercelResponse } from '@vercel/node';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => VercelResponse | void;

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

function listarLancamentos(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ data: [] });
}

function criarLancamento(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Dados financeiros sao obrigatorios' });
  }
  return res.status(201).json({
    message: 'Lancamento financeiro criado com sucesso',
    data: { id: Date.now(), ...body }
  });
}

// ============================================================
// Health Check - Monitoramento e disponibilidade da API Financeira
// GET /health -> Retorna o status atual da API
// ============================================================

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    api: 'cr-financeiro-api',
    timestamp: new Date().toISOString()
  });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarLancamentos },
  { method: 'POST', path: '/',       handler: criarLancamento   },
  { method: 'GET',  path: '/health', handler: healthCheck       },
];

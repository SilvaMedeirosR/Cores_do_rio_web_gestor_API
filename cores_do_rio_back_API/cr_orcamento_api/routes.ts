import { VercelRequest, VercelResponse } from '@vercel/node';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => VercelResponse | void;

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

function listarOrcamentos(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ data: [] });
}

function criarOrcamento(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Dados do orcamento sao obrigatorios' });
  }
  return res.status(201).json({
    message: 'Orcamento criado com sucesso',
    data: { id: Date.now(), ...body }
  });
}

// ============================================================
// Health Check - Monitoramento e disponibilidade da API de Orcamento
// GET /health -> Retorna o status atual da API
// ============================================================

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    api: 'cr-orcamento-api',
    timestamp: new Date().toISOString()
  });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarOrcamentos },
  { method: 'POST', path: '/',       handler: criarOrcamento   },
  { method: 'GET',  path: '/health', handler: healthCheck      },
];

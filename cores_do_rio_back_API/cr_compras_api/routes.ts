import { VercelRequest, VercelResponse } from '@vercel/node';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => VercelResponse | void;

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

function listarCompras(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ data: [] });
}

function criarCompra(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Corpo da requisicao e obrigatorio' });
  }
  return res.status(201).json({
    message: 'Compra criada com sucesso',
    data: { id: Date.now(), ...body }
  });
}

// ============================================================
// Health Check - Monitoramento e disponibilidade da API de Compras
// GET /health -> Retorna o status atual da API
// ============================================================

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    api: 'cr-compras-api',
    timestamp: new Date().toISOString()
  });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarCompras },
  { method: 'POST', path: '/',       handler: criarCompra   },
  { method: 'GET',  path: '/health', handler: healthCheck   },
];

import { VercelRequest, VercelResponse } from '@vercel/node';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => VercelResponse | void;

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

function listarFuncionarios(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ data: [] });
}

function criarFuncionario(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Dados do funcionario sao obrigatorios' });
  }
  return res.status(201).json({
    message: 'Registro de DP criado com sucesso',
    data: { id: Date.now(), ...body }
  });
}

// ============================================================
// Health Check - Monitoramento e disponibilidade da API de DP
// GET /health -> Retorna o status atual da API
// ============================================================

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    api: 'cr-dep-pess-api',
    timestamp: new Date().toISOString()
  });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarFuncionarios },
  { method: 'POST', path: '/',       handler: criarFuncionario   },
  { method: 'GET',  path: '/health', handler: healthCheck        },
];

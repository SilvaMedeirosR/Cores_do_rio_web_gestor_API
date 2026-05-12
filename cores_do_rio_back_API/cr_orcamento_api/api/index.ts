import { VercelRequest, VercelResponse } from '@vercel/node';
import { routes } from '../routes';

function matchRoute(routePath: string, reqPath: string): Record<string, string> | null {
  const rp = routePath.split('/');
  const qp = reqPath.split('/');
  if (rp.length !== qp.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < rp.length; i++) {
    if (rp[i].startsWith(':')) {
      params[rp[i].slice(1)] = decodeURIComponent(qp[i]);
    } else if (rp[i] !== qp[i]) {
      return null;
    }
  }
  return params;
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
  .split(',').map(o => o.trim());

function setCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin as string | undefined;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (setCors(req, res)) return;

    const url    = new URL(req.url || '/', 'http://localhost');
    const path   = url.pathname;
    const method = req.method || 'GET';

    for (const route of routes) {
      if (route.method !== method) continue;
      const params = matchRoute(route.path, path);
      if (params !== null) return await route.handler(req, res, params);
    }

    return res.status(404).json({ error: 'Rota nao encontrada' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
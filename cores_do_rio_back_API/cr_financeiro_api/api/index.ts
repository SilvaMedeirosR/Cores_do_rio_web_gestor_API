import { VercelRequest, VercelResponse } from '@vercel/node';
import { routes } from '../routes';

function matchPath(routePath: string, requestPath: string): Record<string, string> | null {
  const rSegs = routePath.split('/');
  const pSegs = requestPath.split('/');
  if (rSegs.length !== pSegs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < rSegs.length; i++) {
    if (rSegs[i].startsWith(':')) {
      params[rSegs[i].slice(1)] = decodeURIComponent(pSegs[i]);
    } else if (rSegs[i] !== pSegs[i]) {
      return null;
    }
  }
  return params;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = new URL(req.url || '/', 'http://localhost');
    const path = url.pathname;
    const method = req.method || 'GET';

    let pathFound = false;
    for (const route of routes) {
      const params = matchPath(route.path, path);
      if (params === null) continue;
      pathFound = true;
      if (route.method !== method) continue;
      return await route.handler(req, res, params);
    }

    if (!pathFound) return res.status(404).json({ error: 'Rota nao encontrada' });
    return res.status(405).json({ error: 'Metodo nao permitido' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

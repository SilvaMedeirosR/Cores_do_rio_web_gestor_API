import { VercelRequest, VercelResponse } from '@vercel/node';
import { routes } from '../routes';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = new URL(req.url || '/', 'http://localhost');
    const path = url.pathname;
    const method = req.method || 'GET';

    const pathRoutes = routes.filter(r => r.path === path);
    if (pathRoutes.length === 0) return res.status(404).json({ error: 'Rota nao encontrada' });

    const route = pathRoutes.find(r => r.method === method);
    if (!route) return res.status(405).json({ error: 'Metodo nao permitido' });

    return await route.handler(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

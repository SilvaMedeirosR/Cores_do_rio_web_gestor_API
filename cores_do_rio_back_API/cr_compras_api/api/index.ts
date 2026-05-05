import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { method, body } = req;

    // Configuração de CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') return res.status(200).end();

    switch (method) {
      case 'GET':
        return res.status(200).json({ data: [] });
      case 'POST':
        if (!body || Object.keys(body).length === 0) {
          return res.status(400).json({ error: 'Corpo da requisição é obrigatório' });
        }
        const novoItem = body;
        return res.status(201).json({
          message: 'Compra criada com sucesso',
          data: { id: Date.now(), ...novoItem }
        });

      default:
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
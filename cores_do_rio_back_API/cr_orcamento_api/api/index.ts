import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (method) {
      case 'GET':
        return res.status(200).json({
          message: 'API de Orçamento - GET',
          data: {
            orcamentos: [
              { id: 1, ano: 2024, valor: 50000000.00, status: 'aprovado' },
              { id: 2, ano: 2025, valor: 55000000.00, status: 'em analise' }
            ]
          }
        });
      
      case 'POST':
        const novoOrcamento = req.body;
        return res.status(201).json({
          message: 'Orçamento criado com sucesso',
          data: { id: Date.now(), ...novoOrcamento }
        });
      
      default:
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
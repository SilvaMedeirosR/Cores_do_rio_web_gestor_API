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
          message: 'API Financeira - GET',
          data: {
            financas: [
              { id: 1, descricao: 'Receita de Impostos', valor: 2500000.00, tipo: 'receita' },
              { id: 2, descricao: 'Despesa com Pessoal', valor: 1800000.00, tipo: 'despesa' }
            ]
          }
        });
      
      case 'POST':
        const novoLancamento = req.body;
        return res.status(201).json({
          message: 'Lançamento financeiro criado com sucesso',
          data: { id: Date.now(), ...novoLancamento }
        });
      
      default:
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
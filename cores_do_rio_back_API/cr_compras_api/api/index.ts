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
          message: 'API de Compras - GET',
          data: {
            compras: [
              { id: 1, item: 'Material Escolar', quantidade: 100, valor: 1500.00 },
              { id: 2, item: 'Equipamentos de Informática', quantidade: 20, valor: 45000.00 }
            ]
          }
        });
      
      case 'POST':
        const novoItem = req.body;
        return res.status(201).json({
          message: 'Compra criada com sucesso',
          data: { id: Date.now(), ...novoItem }
        });
      
      default:
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
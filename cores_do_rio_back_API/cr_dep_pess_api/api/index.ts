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
          message: 'API de Departamento Pessoal - GET',
          data: {
            departamentos: [
              { id: 1, nome: 'Recursos Humanos', responsavel: 'Maria Silva', funcionarios: 15 },
              { id: 2, nome: 'Financeiro', responsavel: 'João Santos', funcionarios: 8 }
            ]
          }
        });
      
      case 'POST':
        const novoDepto = req.body;
        return res.status(201).json({
          message: 'Departamento criado com sucesso',
          data: { id: Date.now(), ...novoDepto }
        });
      
      default:
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

async function listarFuncionarios(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase.from('funcionarios').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

async function criarFuncionario(req: VercelRequest, res: VercelResponse) {
  const { body } = req;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Corpo da requisicao invalido' });
  }

  const { nome, cpf, cargo, salario, data_admissao, status } = body as Record<string, unknown>;

  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    return res.status(400).json({ error: 'Campo "nome" e obrigatorio' });
  }
  if (!cargo || typeof cargo !== 'string' || cargo.trim() === '') {
    return res.status(400).json({ error: 'Campo "cargo" e obrigatorio' });
  }

  const payload: Record<string, unknown> = {
    nome: nome.trim(),
    cargo: cargo.trim(),
  };
  if (cpf !== undefined && cpf !== null && String(cpf).trim() !== '') payload.cpf = String(cpf).trim();
  if (salario !== undefined && salario !== null && !isNaN(Number(salario))) payload.salario = Number(salario);
  if (data_admissao) payload.data_admissao = String(data_admissao);
  if (status !== undefined) payload.status = String(status);

  const { data, error } = await supabase.from('funcionarios').insert(payload).select().single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'CPF ja cadastrado' });
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json({ message: 'Registro de DP criado com sucesso', data });
}

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-dep-pess-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',       handler: listarFuncionarios },
  { method: 'POST', path: '/',       handler: criarFuncionario   },
  { method: 'GET',  path: '/health', handler: healthCheck        },
];

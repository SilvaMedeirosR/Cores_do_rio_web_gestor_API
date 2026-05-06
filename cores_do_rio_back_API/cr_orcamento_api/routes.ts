import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './lib/prisma';

export type RouteHandler = (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

// ---- Orcamentos ----

async function listarOrcamentos(_req: VercelRequest, res: VercelResponse) {
  const data = await prisma.orcamentos.findMany({ orderBy: { created_at: 'desc' } });
  return res.status(200).json({ data });
}

async function criarOrcamento(req: VercelRequest, res: VercelResponse) {
  const { titulo, descricao, valor_total, status, validade } = req.body ?? {};
  if (!titulo || valor_total === undefined) {
    return res.status(400).json({ error: 'titulo e valor_total sao obrigatorios' });
  }
  const data = await prisma.orcamentos.create({
    data: {
      titulo,
      descricao: descricao ?? null,
      valor_total,
      status: status ?? 'rascunho',
      validade: validade ? new Date(validade) : null,
    },
  });
  return res.status(201).json({ message: 'Orcamento criado com sucesso', data });
}

// ---- Obras ----

async function listarObras(_req: VercelRequest, res: VercelResponse) {
  const data = await prisma.obras.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      obra_precos: true,
      pavimentos: {
        orderBy: { numero: 'asc' },
        include: { comodos: { orderBy: { created_at: 'asc' } } },
      },
    },
  });
  return res.status(200).json({ data });
}

async function criarObra(req: VercelRequest, res: VercelResponse) {
  const { nome, local, precos, pavimentos } = req.body ?? {};
  if (!nome || !local) {
    return res.status(400).json({ error: 'nome e local sao obrigatorios' });
  }

  const data = await prisma.$transaction(async (tx) => {
    const obra = await tx.obras.create({ data: { nome, local } });

    if (Array.isArray(precos) && precos.length > 0) {
      await tx.obra_precos.createMany({
        data: precos.map((p: { etapa: string; preco_m2: number }) => ({
          obra_id: obra.id,
          etapa: p.etapa as never,
          preco_m2: p.preco_m2,
        })),
      });
    }

    if (Array.isArray(pavimentos) && pavimentos.length > 0) {
      for (const pav of pavimentos) {
        const pavimento = await tx.pavimentos.create({
          data: { obra_id: obra.id, nome: pav.nome, numero: Number(pav.numero) },
        });
        if (Array.isArray(pav.comodos) && pav.comodos.length > 0) {
          await tx.comodos.createMany({
            data: pav.comodos.map((c: { tipo: string; nome?: string; paredes_m2: number; teto_m2: number }) => ({
              pavimento_id: pavimento.id,
              tipo: c.tipo as never,
              nome: c.nome ?? null,
              paredes_m2: c.paredes_m2,
              teto_m2: c.teto_m2,
            })),
          });
        }
      }
    }

    return tx.obras.findUnique({
      where: { id: obra.id },
      include: {
        obra_precos: true,
        pavimentos: { include: { comodos: true } },
      },
    });
  });

  return res.status(201).json({ message: 'Obra criada com sucesso', data });
}

// ---- Health ----

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-orcamento-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',        handler: listarOrcamentos },
  { method: 'POST', path: '/',        handler: criarOrcamento   },
  { method: 'GET',  path: '/obras',   handler: listarObras      },
  { method: 'POST', path: '/obras',   handler: criarObra        },
  { method: 'GET',  path: '/health',  handler: healthCheck      },
];
import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './lib/prisma';

export type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
  params: Record<string, string>
) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route { method: string; path: string; handler: RouteHandler; }

// ── helpers de calculo ────────────────────────────────────────────────────────

type PrecoMap = Record<string, number>;

function calcComodo(c: {
  parede1_m2: unknown; parede2_m2: unknown; parede3_m2: unknown; parede4_m2: unknown; teto_m2: unknown;
}, precos: PrecoMap) {
  const p1 = Number(c.parede1_m2), p2 = Number(c.parede2_m2);
  const p3 = Number(c.parede3_m2), p4 = Number(c.parede4_m2);
  const totalParedes = p1 + p2 + p3 + p4;
  const teto         = Number(c.teto_m2);
  const totalArea    = totalParedes + teto;

  const orc = {
    massa_parede: totalParedes * (precos.massa_parede ?? 0),
    massa_teto:   teto         * (precos.massa_teto   ?? 0),
    lixacao:      totalArea    * (precos.lixacao       ?? 0),
    pintura:      totalArea    * (precos.pintura       ?? 0),
    acabamento:   totalArea    * (precos.acabamento    ?? 0),
  };
  const total = Object.values(orc).reduce((a, b) => a + b, 0);
  return { ...orc, total, total_paredes: totalParedes };
}

function buildPrecoMap(obra_precos: { etapa: string; preco_m2: unknown }[]): PrecoMap {
  return Object.fromEntries(obra_precos.map(p => [p.etapa, Number(p.preco_m2)]));
}

// ── Orcamentos ────────────────────────────────────────────────────────────────

async function listarOrcamentos(_req: VercelRequest, res: VercelResponse) {
  const data = await prisma.orcamentos.findMany({ orderBy: { created_at: 'desc' } });
  return res.status(200).json({ data });
}

async function criarOrcamento(req: VercelRequest, res: VercelResponse) {
  const { titulo, descricao, valor_total, status, validade } = req.body ?? {};
  if (!titulo || valor_total === undefined)
    return res.status(400).json({ error: 'titulo e valor_total sao obrigatorios' });
  const data = await prisma.orcamentos.create({
    data: { titulo, descricao: descricao ?? null, valor_total, status: status ?? 'rascunho', validade: validade ? new Date(validade) : null },
  });
  return res.status(201).json({ message: 'Orcamento criado com sucesso', data });
}

// ── Obras (lista) ─────────────────────────────────────────────────────────────

async function listarObras(_req: VercelRequest, res: VercelResponse) {
  const obras = await prisma.obras.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      obra_precos: true,
      pavimentos:  { orderBy: { numero: 'asc' }, include: { comodos: true } },
    },
  });

  const data = obras.map(o => {
    const precos = buildPrecoMap(o.obra_precos);
    let obraTotal = 0;
    const pavimentos = o.pavimentos.map(pav => {
      let pavTotal = 0;
      const comodos = pav.comodos.map(c => {
        const orc = calcComodo(c, precos);
        pavTotal += orc.total;
        return { ...c, orcamento: orc };
      });
      obraTotal += pavTotal;
      return { ...pav, comodos, orcamento_total: pavTotal };
    });
    return { ...o, pavimentos, orcamento_total: obraTotal };
  });

  return res.status(200).json({ data });
}

// ── Obras (detalhe) ───────────────────────────────────────────────────────────

async function getObra(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const obra = await prisma.obras.findUnique({
    where: { id: params.id },
    include: {
      obra_precos: true,
      pavimentos:  { orderBy: { numero: 'asc' }, include: { comodos: { orderBy: { created_at: 'asc' } } } },
    },
  });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

  const precos = buildPrecoMap(obra.obra_precos);
  let obraTotal = 0;
  const pavimentos = obra.pavimentos.map(pav => {
    let pavTotal = 0;
    const comodos = pav.comodos.map(c => {
      const orc = calcComodo(c, precos);
      pavTotal += orc.total;
      return { ...c, orcamento: orc };
    });
    obraTotal += pavTotal;
    return { ...pav, comodos, orcamento_total: pavTotal };
  });

  return res.status(200).json({ data: { ...obra, pavimentos, orcamento_total: obraTotal } });
}

// ── Obras (criar) ─────────────────────────────────────────────────────────────

async function criarObra(req: VercelRequest, res: VercelResponse) {
  const { nome, local, precos, pavimentos } = req.body ?? {};
  if (!nome || !local) return res.status(400).json({ error: 'nome e local sao obrigatorios' });

  const data = await prisma.$transaction(async (tx) => {
    const obra = await tx.obras.create({ data: { nome, local } });

    if (Array.isArray(precos) && precos.length > 0) {
      await tx.obra_precos.createMany({
        data: precos.map((p: { etapa: string; preco_m2: number }) => ({
          obra_id: obra.id, etapa: p.etapa as never, preco_m2: p.preco_m2,
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
            data: pav.comodos.map((c: {
              tipo: string; nome?: string;
              parede1_m2: number; parede2_m2: number; parede3_m2: number; parede4_m2: number; teto_m2: number;
            }) => ({
              pavimento_id: pavimento.id, tipo: c.tipo as never,
              nome: c.nome ?? null,
              parede1_m2: c.parede1_m2 ?? 0, parede2_m2: c.parede2_m2 ?? 0,
              parede3_m2: c.parede3_m2 ?? 0, parede4_m2: c.parede4_m2 ?? 0,
              teto_m2: c.teto_m2 ?? 0,
            })),
          });
        }
      }
    }

    return tx.obras.findUnique({
      where: { id: obra.id },
      include: { obra_precos: true, pavimentos: { include: { comodos: true } } },
    });
  });

  return res.status(201).json({ message: 'Obra criada com sucesso', data });
}

// ── Pavimento (detalhe) ───────────────────────────────────────────────────────

async function getPavimento(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const pav = await prisma.pavimentos.findUnique({
    where: { id: params.id },
    include: {
      comodos: { orderBy: { created_at: 'asc' } },
      obras:   { include: { obra_precos: true } },
    },
  });
  if (!pav) return res.status(404).json({ error: 'Pavimento nao encontrado' });

  const precos = buildPrecoMap(pav.obras.obra_precos);
  let pavTotal = 0;
  const comodos = pav.comodos.map(c => {
    const orc = calcComodo(c, precos);
    pavTotal += orc.total;
    return { ...c, orcamento: orc };
  });

  return res.status(200).json({ data: { ...pav, comodos, orcamento_total: pavTotal } });
}

// ── Comodo (detalhe) ──────────────────────────────────────────────────────────

async function getComodo(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const c = await prisma.comodos.findUnique({
    where: { id: params.id },
    include: { pavimentos: { include: { obras: { include: { obra_precos: true } } } } },
  });
  if (!c) return res.status(404).json({ error: 'Comodo nao encontrado' });

  const precos = buildPrecoMap(c.pavimentos.obras.obra_precos);
  const orc = calcComodo(c, precos);

  return res.status(200).json({ data: { ...c, orcamento: orc } });
}

// ── Health ────────────────────────────────────────────────────────────────────

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-orcamento-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',  path: '/',              handler: listarOrcamentos },
  { method: 'POST', path: '/',              handler: criarOrcamento   },
  { method: 'GET',  path: '/obras',         handler: listarObras      },
  { method: 'POST', path: '/obras',         handler: criarObra        },
  { method: 'GET',  path: '/obras/:id',     handler: getObra          },
  { method: 'GET',  path: '/pavimentos/:id',handler: getPavimento     },
  { method: 'GET',  path: '/comodos/:id',   handler: getComodo        },
  { method: 'GET',  path: '/health',        handler: healthCheck      },
];
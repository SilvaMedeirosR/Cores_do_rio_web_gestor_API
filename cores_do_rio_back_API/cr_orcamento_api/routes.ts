import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './lib/prisma';

export type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
  params: Record<string, string>
) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route { method: string; path: string; handler: RouteHandler; }

// ── helpers de cálculo ────────────────────────────────────────────────────────

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

// enriquece pavimento com cômodos avulsos + apartamentos calculados
function enrichPavimento(pav: any, precos: PrecoMap) {
  let pavTotal = 0;

  const comodos = (pav.comodos ?? []).map((c: any) => {
    const orc = calcComodo(c, precos);
    pavTotal += orc.total;
    return { ...c, orcamento: orc };
  });

  const apartamentos = (pav.apartamentos ?? []).map((apt: any) => {
    let aptTotal = 0;
    const aptComodos = (apt.comodos ?? []).map((c: any) => {
      const orc = calcComodo(c, precos);
      aptTotal += orc.total;
      return { ...c, orcamento: orc };
    });
    pavTotal += aptTotal;
    return { ...apt, comodos: aptComodos, orcamento_total: aptTotal };
  });

  return { ...pav, comodos, apartamentos, orcamento_total: pavTotal };
}

const pavimentoInclude = {
  comodos:      { where: { apartamento_id: null }, orderBy: { created_at: 'asc' as const } },
  apartamentos: {
    orderBy: { numero: 'asc' as const },
    include: {
      apartamento_tipos: { select: { id: true, nome: true } },
      comodos: { orderBy: { created_at: 'asc' as const } },
    },
  },
};

// ── Orçamentos ────────────────────────────────────────────────────────────────

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

// ── Empreiteiras ──────────────────────────────────────────────────────────────

async function listarEmpreiteiras(_req: VercelRequest, res: VercelResponse) {
  try {
    const data = await (prisma as any).empreiteiras.findMany({ orderBy: { nome: 'asc' } });
    return res.status(200).json({ data });
  } catch { return res.status(200).json({ data: [] }); }
}

async function criarEmpreiteira(req: VercelRequest, res: VercelResponse) {
  const { nome } = req.body ?? {};
  if (!nome) return res.status(400).json({ error: 'nome e obrigatorio' });
  try {
    const existing = await (prisma as any).empreiteiras.findUnique({ where: { nome: String(nome).trim() } });
    if (existing) return res.status(200).json({ message: 'Empreiteira ja existe', data: existing });
    const data = await (prisma as any).empreiteiras.create({ data: { nome: String(nome).trim() } });
    return res.status(201).json({ message: 'Empreiteira criada com sucesso', data });
  } catch { return res.status(500).json({ error: 'Erro ao criar empreiteira' }); }
}

// ── Obras (lista) ─────────────────────────────────────────────────────────────

async function listarObras(_req: VercelRequest, res: VercelResponse) {
  const obras = await prisma.obras.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      obra_precos: true,
      pavimentos: { orderBy: { numero: 'asc' }, include: pavimentoInclude },
    },
  });

  const data = obras.map(o => {
    const precos = buildPrecoMap(o.obra_precos);
    let obraTotal = 0;
    const pavimentos = o.pavimentos.map(pav => {
      const enriched = enrichPavimento(pav, precos);
      obraTotal += enriched.orcamento_total;
      return enriched;
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
      apartamento_tipos: { orderBy: { nome: 'asc' } },
      pavimentos: { orderBy: { numero: 'asc' }, include: pavimentoInclude },
    },
  });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

  const precos = buildPrecoMap(obra.obra_precos);
  let obraTotal = 0;
  const pavimentos = obra.pavimentos.map(pav => {
    const enriched = enrichPavimento(pav, precos);
    obraTotal += enriched.orcamento_total;
    return enriched;
  });

  return res.status(200).json({ data: { ...obra, pavimentos, orcamento_total: obraTotal } });
}

// ── Obras (criar) ─────────────────────────────────────────────────────────────

async function criarObra(req: VercelRequest, res: VercelResponse) {
  const { nome, local, empreiteira, empreiteira_id, pavimentos, apartamento_tipos } = req.body ?? {};
  if (!nome) return res.status(400).json({ error: 'nome e obrigatorio' });

  const data = await prisma.$transaction(async (tx) => {
    const obra = await tx.obras.create({
      data: {
        nome,
        local: local ?? null,
        empreiteira: empreiteira ?? null,
        empreiteira_id: empreiteira_id ?? null,
      },
    });

    const precos = (req.body ?? {}).precos;
    if (Array.isArray(precos) && precos.length > 0) {
      await tx.obra_precos.createMany({
        data: precos.map((p: { etapa: string; preco_m2: number }) => ({
          obra_id: obra.id, etapa: p.etapa as never, preco_m2: p.preco_m2,
        })),
      });
    }

    const tiposMap: Record<string, string> = {};
    if (Array.isArray(apartamento_tipos) && apartamento_tipos.length > 0) {
      await tx.apartamento_tipos.createMany({
        data: apartamento_tipos.map((nome: string) => ({ obra_id: obra.id, nome: String(nome).trim() })),
      });
      const criados = await tx.apartamento_tipos.findMany({ where: { obra_id: obra.id } });
      criados.forEach(t => { tiposMap[t.nome] = t.id; });
    }

    const mapComodo = (c: any, pavimento_id: string, apartamento_id?: string) => ({
      pavimento_id,
      apartamento_id: apartamento_id ?? null,
      tipo: c.tipo as never,
      nome: c.nome ?? null,
      parede1_m2: c.parede1_m2 ?? 0,
      parede2_m2: c.parede2_m2 ?? 0,
      parede3_m2: c.parede3_m2 ?? 0,
      parede4_m2: c.parede4_m2 ?? 0,
      teto_m2: c.teto_m2 ?? 0,
    });

    if (Array.isArray(pavimentos) && pavimentos.length > 0) {
      for (const pav of pavimentos) {
        const pavimento = await tx.pavimentos.create({
          data: { obra_id: obra.id, nome: pav.nome, numero: Number(pav.numero), tipo: pav.tipo ?? 'pavimento' },
        });

        // apartamentos com seus cômodos
        if (Array.isArray(pav.apartamentos) && pav.apartamentos.length > 0) {
          for (const apt of pav.apartamentos) {
            const tipo_id = apt.tipo_nome ? (tiposMap[apt.tipo_nome] ?? null) : null;
            const apartamento = await tx.apartamentos.create({
              data: {
                pavimento_id: pavimento.id,
                tipo_id,
                nome: apt.nome ?? null,
                numero: apt.numero != null ? Number(apt.numero) : null,
              },
            });
            if (Array.isArray(apt.comodos) && apt.comodos.length > 0) {
              await tx.comodos.createMany({
                data: apt.comodos.map((c: any) => mapComodo(c, pavimento.id, apartamento.id)),
              });
            }
          }
        }

        // cômodos avulsos (sem apartamento)
        if (Array.isArray(pav.comodos) && pav.comodos.length > 0) {
          await tx.comodos.createMany({
            data: pav.comodos.map((c: any) => mapComodo(c, pavimento.id)),
          });
        }
      }
    }

    return tx.obras.findUnique({
      where: { id: obra.id },
      include: { obra_precos: true, apartamento_tipos: true, pavimentos: { include: pavimentoInclude } },
    });
  });

  return res.status(201).json({ message: 'Obra criada com sucesso', data });
}

// ── Obras (editar/excluir) ────────────────────────────────────────────────────

async function atualizarObra(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome, local, empreiteira, precos } = req.body ?? {};
  const obra = await prisma.obras.findUnique({ where: { id: params.id } });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

  await prisma.$transaction(async (tx) => {
    await tx.obras.update({
      where: { id: params.id },
      data: {
        ...(nome && { nome: String(nome) }),
        ...('local'       in (req.body ?? {}) && { local:       local       ? String(local)       : null }),
        ...('empreiteira' in (req.body ?? {}) && { empreiteira: empreiteira ? String(empreiteira) : null }),
      },
    });
    if (Array.isArray(precos)) {
      await tx.obra_precos.deleteMany({ where: { obra_id: params.id } });
      if (precos.length > 0) {
        await tx.obra_precos.createMany({
          data: precos.map((p: { etapa: string; preco_m2: number }) => ({
            obra_id: params.id, etapa: p.etapa as never, preco_m2: p.preco_m2,
          })),
        });
      }
    }
  });

  const data = await prisma.obras.findUnique({
    where: { id: params.id },
    include: { obra_precos: true, apartamento_tipos: true, pavimentos: { orderBy: { numero: 'asc' }, include: pavimentoInclude } },
  });
  return res.status(200).json({ message: 'Obra atualizada com sucesso', data });
}

async function excluirObra(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const obra = await prisma.obras.findUnique({
    where: { id: params.id },
    include: { pavimentos: { include: { comodos: { select: { id: true } } } } },
  });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

  const comodoIds = obra.pavimentos.flatMap(p => p.comodos.map(c => c.id));
  await prisma.$transaction(async (tx) => {
    if (comodoIds.length > 0) {
      await tx.etapa_progresso.deleteMany({ where: { comodo_id: { in: comodoIds } } });
    }
    await tx.obras.delete({ where: { id: params.id } });
  });
  return res.status(200).json({ message: 'Obra excluida com sucesso' });
}

// ── Apartamento Tipos ─────────────────────────────────────────────────────────

async function listarApartamentoTipos(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const data = await prisma.apartamento_tipos.findMany({
    where: { obra_id: params.id },
    orderBy: { nome: 'asc' },
  });
  return res.status(200).json({ data });
}

async function criarApartamentoTipo(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome } = req.body ?? {};
  if (!nome) return res.status(400).json({ error: 'nome e obrigatorio' });
  const obra = await prisma.obras.findUnique({ where: { id: params.id } });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });
  const data = await prisma.apartamento_tipos.create({
    data: { obra_id: params.id, nome: String(nome).trim() },
  });
  return res.status(201).json({ message: 'Tipo criado', data });
}

async function atualizarApartamentoTipo(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome } = req.body ?? {};
  const tipo = await prisma.apartamento_tipos.findUnique({ where: { id: params.id } });
  if (!tipo) return res.status(404).json({ error: 'Tipo nao encontrado' });
  const data = await prisma.apartamento_tipos.update({
    where: { id: params.id },
    data: { ...(nome && { nome: String(nome).trim() }) },
  });
  return res.status(200).json({ data });
}

async function excluirApartamentoTipo(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  await prisma.apartamento_tipos.delete({ where: { id: params.id } });
  return res.status(200).json({ message: 'Tipo excluido' });
}

// ── Apartamentos ──────────────────────────────────────────────────────────────

async function adicionarApartamento(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome, numero, tipo_id } = req.body ?? {};
  const pav = await prisma.pavimentos.findUnique({ where: { id: params.id } });
  if (!pav) return res.status(404).json({ error: 'Pavimento nao encontrado' });
  const data = await prisma.apartamentos.create({
    data: {
      pavimento_id: params.id,
      tipo_id:      tipo_id ?? null,
      nome:         nome    ?? null,
      numero:       numero  != null ? Number(numero) : null,
    },
    include: { apartamento_tipos: { select: { id: true, nome: true } }, comodos: true },
  });
  return res.status(201).json({ message: 'Apartamento adicionado', data });
}

async function getApartamento(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const apt = await prisma.apartamentos.findUnique({
    where: { id: params.id },
    include: {
      apartamento_tipos: true,
      comodos: { orderBy: { created_at: 'asc' } },
      pavimentos: { include: { obras: { include: { obra_precos: true } } } },
    },
  });
  if (!apt) return res.status(404).json({ error: 'Apartamento nao encontrado' });
  const precos = buildPrecoMap(apt.pavimentos.obras.obra_precos);
  let aptTotal = 0;
  const comodos = apt.comodos.map(c => {
    const orc = calcComodo(c, precos);
    aptTotal += orc.total;
    return { ...c, orcamento: orc };
  });
  return res.status(200).json({ data: { ...apt, comodos, orcamento_total: aptTotal } });
}

async function atualizarApartamento(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome, numero, tipo_id } = req.body ?? {};
  const apt = await prisma.apartamentos.findUnique({ where: { id: params.id } });
  if (!apt) return res.status(404).json({ error: 'Apartamento nao encontrado' });
  const data = await prisma.apartamentos.update({
    where: { id: params.id },
    data: {
      ...('nome'    in (req.body ?? {}) && { nome:    nome    ?? null }),
      ...('numero'  in (req.body ?? {}) && { numero:  numero  != null ? Number(numero) : null }),
      ...('tipo_id' in (req.body ?? {}) && { tipo_id: tipo_id ?? null }),
    },
    include: { apartamento_tipos: { select: { id: true, nome: true } }, comodos: true },
  });
  return res.status(200).json({ data });
}

async function excluirApartamento(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const apt = await prisma.apartamentos.findUnique({
    where: { id: params.id },
    include: { comodos: { select: { id: true } } },
  });
  if (!apt) return res.status(404).json({ error: 'Apartamento nao encontrado' });
  const comodoIds = apt.comodos.map(c => c.id);
  await prisma.$transaction(async (tx) => {
    if (comodoIds.length > 0) {
      await tx.etapa_progresso.deleteMany({ where: { comodo_id: { in: comodoIds } } });
    }
    await tx.apartamentos.delete({ where: { id: params.id } });
  });
  return res.status(200).json({ message: 'Apartamento excluido' });
}

// ── Clonar pavimento ──────────────────────────────────────────────────────────

async function clonarPavimento(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { origem_id, manter_medidas } = req.body ?? {};
  if (!origem_id) return res.status(400).json({ error: 'origem_id e obrigatorio' });

  const destino = await prisma.pavimentos.findUnique({ where: { id: params.id } });
  if (!destino) return res.status(404).json({ error: 'Pavimento de destino nao encontrado' });

  const origem = await prisma.pavimentos.findUnique({
    where: { id: String(origem_id) },
    include: {
      comodos:      { where: { apartamento_id: null } },
      apartamentos: { include: { comodos: true } },
    },
  });
  if (!origem) return res.status(404).json({ error: 'Pavimento de origem nao encontrado' });

  await prisma.$transaction(async (tx) => {
    // cômodos avulsos
    for (const c of origem.comodos) {
      await tx.comodos.create({
        data: {
          pavimento_id: params.id, tipo: c.tipo, nome: c.nome ?? null,
          parede1_m2: manter_medidas ? c.parede1_m2 : 0,
          parede2_m2: manter_medidas ? c.parede2_m2 : 0,
          parede3_m2: manter_medidas ? c.parede3_m2 : 0,
          parede4_m2: manter_medidas ? c.parede4_m2 : 0,
          teto_m2:    manter_medidas ? c.teto_m2    : 0,
        },
      });
    }
    // apartamentos
    for (const apt of origem.apartamentos) {
      const novoApt = await tx.apartamentos.create({
        data: {
          pavimento_id: params.id,
          tipo_id:      apt.tipo_id ?? null,
          nome:         apt.nome    ?? null,
          numero:       apt.numero  ?? null,
        },
      });
      for (const c of apt.comodos) {
        await tx.comodos.create({
          data: {
            pavimento_id: params.id, apartamento_id: novoApt.id,
            tipo: c.tipo, nome: c.nome ?? null,
            parede1_m2: manter_medidas ? c.parede1_m2 : 0,
            parede2_m2: manter_medidas ? c.parede2_m2 : 0,
            parede3_m2: manter_medidas ? c.parede3_m2 : 0,
            parede4_m2: manter_medidas ? c.parede4_m2 : 0,
            teto_m2:    manter_medidas ? c.teto_m2    : 0,
          },
        });
      }
    }
  });

  const data = await prisma.pavimentos.findUnique({
    where: { id: params.id },
    include: { ...pavimentoInclude, obras: { include: { obra_precos: true } } },
  });
  return res.status(200).json({ message: 'Estrutura clonada com sucesso', data });
}

// ── Pavimento (detalhe) ───────────────────────────────────────────────────────

async function getPavimento(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const pav = await prisma.pavimentos.findUnique({
    where: { id: params.id },
    include: {
      ...pavimentoInclude,
      obras: {
        include: {
          obra_precos: true,
          apartamento_tipos: { orderBy: { nome: 'asc' } },
          pavimentos: { select: { id: true, nome: true, numero: true }, orderBy: { numero: 'asc' } },
        },
      },
    },
  });
  if (!pav) return res.status(404).json({ error: 'Pavimento nao encontrado' });

  const precos   = buildPrecoMap(pav.obras.obra_precos);
  const enriched = enrichPavimento(pav, precos);
  return res.status(200).json({ data: enriched });
}

// ── Comodo (detalhe) ──────────────────────────────────────────────────────────

async function getComodo(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const c = await prisma.comodos.findUnique({
    where: { id: params.id },
    include: { pavimentos: { include: { obras: { include: { obra_precos: true } } } } },
  });
  if (!c) return res.status(404).json({ error: 'Comodo nao encontrado' });
  const precos = buildPrecoMap(c.pavimentos.obras.obra_precos);
  return res.status(200).json({ data: { ...c, orcamento: calcComodo(c, precos) } });
}

// ── Pavimentos (criar/editar/excluir) ─────────────────────────────────────────

async function adicionarPavimento(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome, numero, tipo, comodos } = req.body ?? {};
  if (!nome || numero === undefined) return res.status(400).json({ error: 'nome e numero sao obrigatorios' });
  const obra = await prisma.obras.findUnique({ where: { id: params.id } });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

  const data = await prisma.$transaction(async (tx) => {
    const pav = await tx.pavimentos.create({
      data: { obra_id: params.id, nome: String(nome), numero: Number(numero), tipo: tipo ?? 'pavimento' },
    });
    if (Array.isArray(comodos) && comodos.length > 0) {
      await tx.comodos.createMany({
        data: comodos.map((c: any) => ({
          pavimento_id: pav.id, tipo: c.tipo as never, nome: c.nome ?? null,
          parede1_m2: c.parede1_m2 ?? 0, parede2_m2: c.parede2_m2 ?? 0,
          parede3_m2: c.parede3_m2 ?? 0, parede4_m2: c.parede4_m2 ?? 0,
          teto_m2: c.teto_m2 ?? 0,
        })),
      });
    }
    return tx.pavimentos.findUnique({ where: { id: pav.id }, include: pavimentoInclude });
  });
  return res.status(201).json({ message: 'Pavimento adicionado', data });
}

async function atualizarPavimento(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome, numero } = req.body ?? {};
  const pav = await prisma.pavimentos.findUnique({ where: { id: params.id } });
  if (!pav) return res.status(404).json({ error: 'Pavimento nao encontrado' });
  const data = await prisma.pavimentos.update({
    where: { id: params.id },
    data: {
      ...(nome && { nome: String(nome) }),
      ...(numero !== undefined && { numero: Number(numero) }),
    },
  });
  return res.status(200).json({ message: 'Pavimento atualizado', data });
}

async function excluirPavimento(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const pav = await prisma.pavimentos.findUnique({
    where: { id: params.id },
    include: { comodos: { select: { id: true } } },
  });
  if (!pav) return res.status(404).json({ error: 'Pavimento nao encontrado' });
  const comodoIds = pav.comodos.map(c => c.id);
  await prisma.$transaction(async (tx) => {
    if (comodoIds.length > 0) {
      await tx.etapa_progresso.deleteMany({ where: { comodo_id: { in: comodoIds } } });
    }
    await tx.pavimentos.delete({ where: { id: params.id } });
  });
  return res.status(200).json({ message: 'Pavimento excluido' });
}

// ── Comodos (criar/editar/excluir) ────────────────────────────────────────────

async function adicionarComodo(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const b = req.body ?? {};
  if (!b.tipo) return res.status(400).json({ error: 'tipo e obrigatorio' });

  const isApartamento = params._entity === 'apartamentos';
  let pavimento_id: string;
  let apartamento_id: string | null = null;

  if (isApartamento) {
    const apt = await prisma.apartamentos.findUnique({ where: { id: params.id } });
    if (!apt) return res.status(404).json({ error: 'Apartamento nao encontrado' });
    pavimento_id   = apt.pavimento_id;
    apartamento_id = apt.id;
  } else {
    const pav = await prisma.pavimentos.findUnique({ where: { id: params.id } });
    if (!pav) return res.status(404).json({ error: 'Pavimento nao encontrado' });
    pavimento_id = pav.id;
  }

  const data = await prisma.comodos.create({
    data: {
      pavimento_id, apartamento_id,
      tipo: b.tipo as never, nome: b.nome ?? null,
      parede1_m2: b.parede1_m2 ?? 0, parede2_m2: b.parede2_m2 ?? 0,
      parede3_m2: b.parede3_m2 ?? 0, parede4_m2: b.parede4_m2 ?? 0,
      teto_m2:    b.teto_m2    ?? 0,
    },
  });
  return res.status(201).json({ message: 'Comodo adicionado', data });
}

async function atualizarComodo(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const b = req.body ?? {};
  const comodo = await prisma.comodos.findUnique({ where: { id: params.id } });
  if (!comodo) return res.status(404).json({ error: 'Comodo nao encontrado' });
  const data = await prisma.comodos.update({
    where: { id: params.id },
    data: {
      ...(b.tipo        && { tipo:        b.tipo as never        }),
      ...('nome' in b   && { nome:        b.nome || null         }),
      ...(b.parede1_m2 !== undefined && { parede1_m2: Number(b.parede1_m2) }),
      ...(b.parede2_m2 !== undefined && { parede2_m2: Number(b.parede2_m2) }),
      ...(b.parede3_m2 !== undefined && { parede3_m2: Number(b.parede3_m2) }),
      ...(b.parede4_m2 !== undefined && { parede4_m2: Number(b.parede4_m2) }),
      ...(b.teto_m2    !== undefined && { teto_m2:    Number(b.teto_m2)    }),
      ...(b.etapa_atual && { etapa_atual: b.etapa_atual as never }),
    },
  });
  return res.status(200).json({ message: 'Comodo atualizado', data });
}

async function excluirComodo(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const comodo = await prisma.comodos.findUnique({ where: { id: params.id } });
  if (!comodo) return res.status(404).json({ error: 'Comodo nao encontrado' });
  await prisma.$transaction(async (tx) => {
    await tx.etapa_progresso.deleteMany({ where: { comodo_id: params.id } });
    await tx.comodos.delete({ where: { id: params.id } });
  });
  return res.status(200).json({ message: 'Comodo excluido' });
}

// ── Health ────────────────────────────────────────────────────────────────────

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-orcamento-api', timestamp: new Date().toISOString() });
}

export const routes: Route[] = [
  { method: 'GET',    path: '/',                                handler: listarOrcamentos         },
  { method: 'POST',   path: '/',                                handler: criarOrcamento           },
  { method: 'GET',    path: '/empreiteiras',                    handler: listarEmpreiteiras       },
  { method: 'POST',   path: '/empreiteiras',                    handler: criarEmpreiteira         },
  { method: 'GET',    path: '/obras',                           handler: listarObras              },
  { method: 'POST',   path: '/obras',                           handler: criarObra                },
  { method: 'GET',    path: '/obras/:id',                       handler: getObra                  },
  { method: 'PUT',    path: '/obras/:id',                       handler: atualizarObra            },
  { method: 'DELETE', path: '/obras/:id',                       handler: excluirObra              },
  { method: 'GET',    path: '/obras/:id/apartamento-tipos',     handler: listarApartamentoTipos   },
  { method: 'POST',   path: '/obras/:id/apartamento-tipos',     handler: criarApartamentoTipo     },
  { method: 'PUT',    path: '/apartamento-tipos/:id',           handler: atualizarApartamentoTipo },
  { method: 'DELETE', path: '/apartamento-tipos/:id',           handler: excluirApartamentoTipo   },
  { method: 'POST',   path: '/obras/:id/pavimentos',            handler: adicionarPavimento       },
  { method: 'GET',    path: '/pavimentos/:id',                  handler: getPavimento             },
  { method: 'PUT',    path: '/pavimentos/:id',                  handler: atualizarPavimento       },
  { method: 'DELETE', path: '/pavimentos/:id',                  handler: excluirPavimento         },
  { method: 'POST',   path: '/pavimentos/:id/clonar',           handler: clonarPavimento          },
  { method: 'POST',   path: '/pavimentos/:id/apartamentos',     handler: adicionarApartamento     },
  { method: 'GET',    path: '/apartamentos/:id',                handler: getApartamento           },
  { method: 'PUT',    path: '/apartamentos/:id',                handler: atualizarApartamento     },
  { method: 'DELETE', path: '/apartamentos/:id',                handler: excluirApartamento       },
  { method: 'POST',   path: '/pavimentos/:id/comodos',          handler: (req, res, p) => adicionarComodo(req, res, { ...p, _entity: 'pavimentos'   }) },
  { method: 'POST',   path: '/apartamentos/:id/comodos',        handler: (req, res, p) => adicionarComodo(req, res, { ...p, _entity: 'apartamentos' }) },
  { method: 'GET',    path: '/comodos/:id',                     handler: getComodo                },
  { method: 'PUT',    path: '/comodos/:id',                     handler: atualizarComodo          },
  { method: 'DELETE', path: '/comodos/:id',                     handler: excluirComodo            },
  { method: 'GET',    path: '/health',                          handler: healthCheck              },
];

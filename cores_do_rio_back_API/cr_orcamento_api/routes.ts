import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './lib/prisma';
import { supabase } from './lib/supabase';
import { enviarEmail } from './lib/skymail';

export type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
  params: Record<string, string>
) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route { method: string; path: string; handler: RouteHandler; }

// ── helpers de cálculo ────────────────────────────────────────────────────────

type PrecoMap = Record<string, number>;

type ParedeItem = { m2: number; cor?: string | null };
type TetoItem   = { m2: number };

function somarParedes(c: { paredes?: unknown; parede1_m2?: unknown; parede2_m2?: unknown; parede3_m2?: unknown; parede4_m2?: unknown }): number {
  const arr = Array.isArray(c.paredes) ? c.paredes as ParedeItem[] : [];
  if (arr.length > 0) return arr.reduce((s, p) => s + Number(p.m2), 0);
  return Number(c.parede1_m2 ?? 0) + Number(c.parede2_m2 ?? 0) + Number(c.parede3_m2 ?? 0) + Number(c.parede4_m2 ?? 0);
}

function somarTetos(c: { tetos?: unknown; teto_m2?: unknown }): number {
  const arr = Array.isArray(c.tetos) ? c.tetos as TetoItem[] : [];
  if (arr.length > 0) return arr.reduce((s, t) => s + Number(t.m2), 0);
  return Number(c.teto_m2 ?? 0);
}

function calcComodo(c: Record<string, unknown>, precos: PrecoMap) {
  const totalParedes = somarParedes(c);
  const teto         = somarTetos(c);
  const totalArea    = totalParedes + teto;
  const orc = {
    massa_parede: totalParedes * (precos.massa_parede ?? 0),
    massa_teto:   teto         * (precos.massa_teto   ?? 0),
    lixacao:      totalArea    * (precos.lixacao       ?? 0),
    pintura:      totalArea    * (precos.pintura       ?? 0),
    acabamento:   totalArea    * (precos.acabamento    ?? 0),
  };
  const total = Object.values(orc).reduce((a, b) => a + b, 0);
  return { ...orc, total, total_paredes: totalParedes, total_tetos: teto };
}

function buildPrecoMap(obra_precos: { etapa: string; preco_m2: unknown }[]): PrecoMap {
  return Object.fromEntries(obra_precos.map(p => [p.etapa, Number(p.preco_m2)]));
}

function buildPrecoTiposMap(precoTipos: { id: string; precos: { etapa: string; preco_m2: unknown }[] }[]): Record<string, PrecoMap> {
  return Object.fromEntries(precoTipos.map(t => [t.id, buildPrecoMap(t.precos)]));
}

// Cascata: tipo do entity sobrescreve apenas as etapas definidas, o resto cai no basePrecos
function resolvePrecos(tipoId: string | null | undefined, precoTiposMap: Record<string, PrecoMap>, basePrecos: PrecoMap): PrecoMap {
  if (tipoId && precoTiposMap[tipoId]) {
    return { ...basePrecos, ...precoTiposMap[tipoId] };
  }
  return basePrecos;
}

// enriquece pavimento com cômodos avulsos + apartamentos calculados
// Cascata de preços: cômodo > apartamento > pavimento > obra (geral)
function enrichPavimento(pav: any, obraPrecos: PrecoMap, precoTiposMap: Record<string, PrecoMap>, tipoNomeMap: Record<string, string>) {
  const pavPrecos = resolvePrecos(pav.preco_tipo_id, precoTiposMap, obraPrecos);
  let pavTotal = 0;

  const comodos = (pav.comodos ?? []).map((c: any) => {
    const efetivos = resolvePrecos(c.preco_tipo_id, precoTiposMap, pavPrecos);
    const orc = calcComodo(c, efetivos);
    pavTotal += orc.total;
    return { ...c, orcamento: orc, preco_tipo_nome: c.preco_tipo_id ? (tipoNomeMap[c.preco_tipo_id] ?? null) : null };
  });

  const apartamentos = (pav.apartamentos ?? []).map((apt: any) => {
    const aptPrecos = resolvePrecos(apt.preco_tipo_id, precoTiposMap, pavPrecos);
    let aptTotal = 0;
    const aptComodos = (apt.comodos ?? []).map((c: any) => {
      const efetivos = resolvePrecos(c.preco_tipo_id, precoTiposMap, aptPrecos);
      const orc = calcComodo(c, efetivos);
      aptTotal += orc.total;
      return { ...c, orcamento: orc, preco_tipo_nome: c.preco_tipo_id ? (tipoNomeMap[c.preco_tipo_id] ?? null) : null };
    });
    pavTotal += aptTotal;
    return {
      ...apt,
      comodos: aptComodos,
      orcamento_total: aptTotal,
      preco_tipo_nome: apt.preco_tipo_id ? (tipoNomeMap[apt.preco_tipo_id] ?? null) : null,
    };
  });

  return { ...pav, comodos, apartamentos, orcamento_total: pavTotal };
}

const precoTiposInclude = { include: { precos: true } } as const;

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

// ── Notificação de Orçamentistas ──────────────────────────────────────────────

function htmlNovaObra(nome: string, local: string | null): string {
  const BASE  = `font-family:-apple-system,sans-serif;background:#f4f4f5;padding:32px 16px;`;
  const CARD  = `background:#fff;border-radius:12px;border:1px solid #e4e4e7;max-width:560px;margin:0 auto;overflow:hidden;`;
  const HEAD  = `background:#18181b;padding:20px 28px;color:#fff;font-size:14px;font-weight:600;`;
  const BODY  = `padding:24px 28px;color:#3f3f46;`;
  const FOOT  = `border-top:1px solid #f4f4f5;padding:16px 28px;font-size:11px;color:#a1a1aa;`;
  const campo = (l: string, v: string) =>
    `<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:.05em">${l}</div><div style="font-size:14px;color:#18181b;margin-top:2px">${v}</div></div>`;
  return `<div style="${BASE}"><div style="${CARD}">
    <div style="${HEAD}"><span style="background:#f97316;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;margin-right:8px;">Cores do Rio</span>Nova Obra em Negociação</div>
    <div style="${BODY}">
      <p style="margin:0 0 20px;font-size:14px;">Uma nova obra entrou em <strong>negociação</strong> e aguarda medição e orçamento de mão de obra.</p>
      ${campo('Obra', nome)}
      ${local ? campo('Local', local) : ''}
      <p style="margin:20px 0 0;font-size:13px;color:#71717a;">Acesse o sistema em <strong>Orçamentos → Obras</strong> para visualizar e iniciar o orçamento.</p>
    </div>
    <div style="${FOOT}">Sistema de Gestão Cores do Rio · mensagem automática</div>
  </div></div>`;
}

async function notificarOrcamentistas(obra: { nome: string; local: string | null }) {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome, sobrenome')
      .eq('funcao', 'orcamentista');

    if (!profiles?.length) return;

    const emails: string[] = [];
    for (const p of profiles) {
      const { data: { user } } = await (supabase.auth.admin as any).getUserById(p.id);
      if (user?.email) emails.push(user.email);
    }

    if (!emails.length) return;

    await Promise.allSettled([
      supabase.from('notificacoes').insert(
        emails.map(email => ({
          destinatario: email,
          titulo: `Nova obra em negociação: ${obra.nome}`,
          corpo: 'A medição e o orçamento de mão de obra devem ser apresentados.',
          tipo: 'obra_negociacao',
        }))
      ),
      enviarEmail({
        to: emails,
        subject: `Nova obra em negociação: ${obra.nome}`,
        html: htmlNovaObra(obra.nome, obra.local),
      }),
    ]);
  } catch { /* falha silenciosa — não bloqueia criação da obra */ }
}

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
  const { nome, cnpj } = req.body ?? {};
  if (!nome) return res.status(400).json({ error: 'nome e obrigatorio' });
  try {
    const existing = await (prisma as any).empreiteiras.findUnique({ where: { nome: String(nome).trim() } });
    if (existing) {
      if (cnpj && !existing.cnpj) {
        const upd = await (prisma as any).empreiteiras.update({ where: { id: existing.id }, data: { cnpj: String(cnpj).trim() } });
        return res.status(200).json({ message: 'Empreiteira ja existe (cnpj atualizado)', data: upd });
      }
      return res.status(200).json({ message: 'Empreiteira ja existe', data: existing });
    }
    const data = await (prisma as any).empreiteiras.create({
      data: { nome: String(nome).trim(), cnpj: cnpj ? String(cnpj).trim() : null },
    });
    return res.status(201).json({ message: 'Empreiteira criada com sucesso', data });
  } catch { return res.status(500).json({ error: 'Erro ao criar empreiteira' }); }
}

// ── Obras (lista) ─────────────────────────────────────────────────────────────

async function listarObras(req: VercelRequest, res: VercelResponse) {
  const url    = new URL(req.url || '/', 'http://localhost');
  const status = url.searchParams.get('status');
  const obras  = await prisma.obras.findMany({
    orderBy: { created_at: 'desc' },
    where: status ? { status } : undefined,
    include: {
      obra_precos: true,
      preco_tipos: { include: { precos: true } },
      empreiteiras: { select: { id: true, nome: true, cnpj: true } },
      pavimentos: { orderBy: { numero: 'asc' }, include: pavimentoInclude },
    },
  });

  const data = obras.map(o => {
    const precos        = buildPrecoMap(o.obra_precos);
    const precoTiposMap = buildPrecoTiposMap(o.preco_tipos as any);
    const tipoNomeMap   = Object.fromEntries((o.preco_tipos as any[]).map((t: any) => [t.id, t.nome]));
    let obraTotal = 0;
    const pavimentos = o.pavimentos.map(pav => {
      const enriched = enrichPavimento(pav, precos, precoTiposMap, tipoNomeMap);
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
      preco_tipos: { include: { precos: true } },
      apartamento_tipos: { orderBy: { nome: 'asc' } },
      pavimentos: { orderBy: { numero: 'asc' }, include: pavimentoInclude },
    },
  });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

  const precos        = buildPrecoMap(obra.obra_precos);
  const precoTiposMap = buildPrecoTiposMap(obra.preco_tipos as any);
  const tipoNomeMap   = Object.fromEntries((obra.preco_tipos as any[]).map((t: any) => [t.id, t.nome]));
  let obraTotal = 0;
  const pavimentos = obra.pavimentos.map(pav => {
    const enriched = enrichPavimento(pav, precos, precoTiposMap, tipoNomeMap);
    obraTotal += enriched.orcamento_total;
    return enriched;
  });

  return res.status(200).json({ data: { ...obra, pavimentos, orcamento_total: obraTotal } });
}

// ── Obras (criar) ─────────────────────────────────────────────────────────────

async function criarObra(req: VercelRequest, res: VercelResponse) {
  const { nome, local, empreiteira, empreiteira_id, pavimentos, apartamento_tipos, preco_tipos, status, data_inicio, previsao_conclusao } = req.body ?? {};
  if (!nome) return res.status(400).json({ error: 'nome e obrigatorio' });

  const obraStatus = status ?? 'ativo';

  const data = await prisma.$transaction(async (tx) => {
    const obra = await tx.obras.create({
      data: {
        nome,
        local:              local              ?? null,
        empreiteira:        empreiteira        ?? null,
        empreiteira_id:     empreiteira_id     ?? null,
        status:             obraStatus,
        data_inicio:        data_inicio        ? new Date(data_inicio)        : null,
        previsao_conclusao: previsao_conclusao ? new Date(previsao_conclusao) : null,
      } as never,
    });

    const precos = (req.body ?? {}).precos;
    if (Array.isArray(precos) && precos.length > 0) {
      await tx.obra_precos.createMany({
        data: precos.map((p: { etapa: string; preco_m2: number }) => ({
          obra_id: obra.id, etapa: p.etapa as never, preco_m2: p.preco_m2,
        })),
      });
    }

    // criar preco_tipos e mapear nome → id
    const tipoPrecoNomeMap: Record<string, string> = {};
    if (Array.isArray(preco_tipos) && preco_tipos.length > 0) {
      for (const pt of preco_tipos) {
        if (!pt.nome?.trim()) continue;
        const tipo = await (tx as any).preco_tipos.create({
          data: { obra_id: obra.id, nome: String(pt.nome).trim() },
        });
        tipoPrecoNomeMap[pt.nome.trim()] = tipo.id;
        const ptPrecos = Array.isArray(pt.precos) ? pt.precos.filter((p: any) => p.preco_m2 != null && p.preco_m2 !== '') : [];
        if (ptPrecos.length > 0) {
          await (tx as any).preco_tipo_precos.createMany({
            data: ptPrecos.map((p: any) => ({
              preco_tipo_id: tipo.id,
              etapa: p.etapa,
              preco_m2: parseFloat(String(p.preco_m2)) || 0,
            })),
          });
        }
      }
    }

    const tiposMap: Record<string, string> = {};
    if (Array.isArray(apartamento_tipos) && apartamento_tipos.length > 0) {
      await tx.apartamento_tipos.createMany({
        data: apartamento_tipos.map((nome: string) => ({ obra_id: obra.id, nome: String(nome).trim() })),
      });
      const criados = await tx.apartamento_tipos.findMany({ where: { obra_id: obra.id } });
      criados.forEach(t => { tiposMap[t.nome] = t.id; });
    }

    const mapComodo = (c: any, pavimento_id: string, apartamento_id?: string) => {
      const paredes: ParedeItem[] = Array.isArray(c.paredes) ? c.paredes : [];
      const tetos:   TetoItem[]   = Array.isArray(c.tetos)   ? c.tetos   : [];
      return {
        pavimento_id,
        apartamento_id: apartamento_id ?? null,
        tipo: c.tipo as never,
        nome: c.nome ?? null,
        preco_tipo_id: c.preco_tipo_nome ? (tipoPrecoNomeMap[c.preco_tipo_nome] ?? null) : null,
        paredes: paredes as never,
        tetos:   tetos   as never,
        parede1_m2: paredes.reduce((s, p) => s + Number(p.m2), 0) || (c.parede1_m2 ?? 0),
        parede2_m2: c.parede2_m2 ?? 0,
        parede3_m2: c.parede3_m2 ?? 0,
        parede4_m2: c.parede4_m2 ?? 0,
        teto_m2: tetos.reduce((s, t) => s + Number(t.m2), 0) || (c.teto_m2 ?? 0),
      };
    };

    if (Array.isArray(pavimentos) && pavimentos.length > 0) {
      for (const pav of pavimentos) {
        const pavimento = await tx.pavimentos.create({
          data: { obra_id: obra.id, nome: pav.nome, numero: Number(pav.numero), tipo: pav.tipo ?? 'pavimento' },
        });

        if (Array.isArray(pav.apartamentos) && pav.apartamentos.length > 0) {
          for (const apt of pav.apartamentos) {
            const tipo_id = apt.tipo_nome ? (tiposMap[apt.tipo_nome] ?? null) : null;
            const apartamento = await tx.apartamentos.create({
              data: {
                pavimento_id: pavimento.id,
                tipo_id,
                preco_tipo_id: apt.preco_tipo_nome ? (tipoPrecoNomeMap[apt.preco_tipo_nome] ?? null) : null,
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

        if (Array.isArray(pav.comodos) && pav.comodos.length > 0) {
          await tx.comodos.createMany({
            data: pav.comodos.map((c: any) => mapComodo(c, pavimento.id)),
          });
        }
      }
    }

    return tx.obras.findUnique({
      where: { id: obra.id },
      include: { obra_precos: true, preco_tipos: { include: { precos: true } }, apartamento_tipos: true, pavimentos: { include: pavimentoInclude } },
    });
  });

  if (obraStatus === 'negociacao' && data) {
    await notificarOrcamentistas({ nome: (data as any).nome, local: (data as any).local });
  }

  return res.status(201).json({ message: 'Obra criada com sucesso', data });
}

// ── Obras (preencher orçamento — titular já criou, orçamentista preenche medições) ──

async function preencherOrcamento(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const obra = await prisma.obras.findUnique({ where: { id: params.id } });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

  const { precos, preco_tipos, pavimentos, apartamento_tipos } = req.body ?? {};

  const data = await prisma.$transaction(async (tx) => {
    // Limpa dados anteriores para garantir idempotência (re-envio substitui)
    await tx.obra_precos.deleteMany({ where: { obra_id: params.id } });
    await tx.pavimentos.deleteMany({ where: { obra_id: params.id } }); // cascata para comodos/apartamentos
    await tx.preco_tipos.deleteMany({ where: { obra_id: params.id } }); // cascata para preco_tipo_precos
    await tx.apartamento_tipos.deleteMany({ where: { obra_id: params.id } });

    if (Array.isArray(precos) && precos.length > 0) {
      await tx.obra_precos.createMany({
        data: precos.map((p: { etapa: string; preco_m2: number }) => ({
          obra_id: params.id, etapa: p.etapa as never, preco_m2: p.preco_m2,
        })),
      });
    }

    const tipoPrecoNomeMap: Record<string, string> = {};
    if (Array.isArray(preco_tipos) && preco_tipos.length > 0) {
      for (const pt of preco_tipos) {
        if (!pt.nome?.trim()) continue;
        const tipo = await (tx as any).preco_tipos.create({
          data: { obra_id: params.id, nome: String(pt.nome).trim() },
        });
        tipoPrecoNomeMap[pt.nome.trim()] = tipo.id;
        const ptPrecos = Array.isArray(pt.precos) ? pt.precos.filter((p: any) => p.preco_m2 != null && p.preco_m2 !== '') : [];
        if (ptPrecos.length > 0) {
          await (tx as any).preco_tipo_precos.createMany({
            data: ptPrecos.map((p: any) => ({
              preco_tipo_id: tipo.id, etapa: p.etapa,
              preco_m2: parseFloat(String(p.preco_m2)) || 0,
            })),
          });
        }
      }
    }

    const tiposMap: Record<string, string> = {};
    if (Array.isArray(apartamento_tipos) && apartamento_tipos.length > 0) {
      await tx.apartamento_tipos.createMany({
        data: apartamento_tipos.map((nome: string) => ({ obra_id: params.id, nome: String(nome).trim() })),
      });
      const criados = await tx.apartamento_tipos.findMany({ where: { obra_id: params.id } });
      criados.forEach(t => { tiposMap[t.nome] = t.id; });
    }

    const mapComodo = (c: any, pavimento_id: string, apartamento_id?: string) => {
      const paredes: ParedeItem[] = Array.isArray(c.paredes) ? c.paredes : [];
      const tetos:   TetoItem[]   = Array.isArray(c.tetos)   ? c.tetos   : [];
      return {
        pavimento_id, apartamento_id: apartamento_id ?? null,
        tipo: c.tipo as never, nome: c.nome ?? null,
        preco_tipo_id: c.preco_tipo_nome ? (tipoPrecoNomeMap[c.preco_tipo_nome] ?? null) : null,
        paredes: paredes as never,
        tetos:   tetos   as never,
        parede1_m2: paredes.reduce((s, p) => s + Number(p.m2), 0) || (c.parede1_m2 ?? 0),
        parede2_m2: c.parede2_m2 ?? 0,
        parede3_m2: c.parede3_m2 ?? 0,
        parede4_m2: c.parede4_m2 ?? 0,
        teto_m2: tetos.reduce((s, t) => s + Number(t.m2), 0) || (c.teto_m2 ?? 0),
      };
    };

    if (Array.isArray(pavimentos) && pavimentos.length > 0) {
      for (const pav of pavimentos) {
        const pavimento = await tx.pavimentos.create({
          data: { obra_id: params.id, nome: pav.nome, numero: Number(pav.numero), tipo: pav.tipo ?? 'pavimento' },
        });
        if (Array.isArray(pav.apartamentos) && pav.apartamentos.length > 0) {
          for (const apt of pav.apartamentos) {
            const tipo_id = apt.tipo_nome ? (tiposMap[apt.tipo_nome] ?? null) : null;
            const apartamento = await tx.apartamentos.create({
              data: {
                pavimento_id: pavimento.id, tipo_id,
                preco_tipo_id: apt.preco_tipo_nome ? (tipoPrecoNomeMap[apt.preco_tipo_nome] ?? null) : null,
                nome: apt.nome ?? null, numero: apt.numero != null ? Number(apt.numero) : null,
              },
            });
            if (Array.isArray(apt.comodos) && apt.comodos.length > 0) {
              await tx.comodos.createMany({ data: apt.comodos.map((c: any) => mapComodo(c, pavimento.id, apartamento.id)) });
            }
          }
        }
        if (Array.isArray(pav.comodos) && pav.comodos.length > 0) {
          await tx.comodos.createMany({ data: pav.comodos.map((c: any) => mapComodo(c, pavimento.id)) });
        }
      }
    }

    return tx.obras.findUnique({
      where: { id: params.id },
      include: { obra_precos: true, preco_tipos: { include: { precos: true } }, apartamento_tipos: true, pavimentos: { include: pavimentoInclude } },
    });
  });

  return res.status(200).json({ message: 'Orçamento preenchido com sucesso', data });
}

// ── Obras (editar/excluir) ────────────────────────────────────────────────────

async function atualizarObra(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome, local, empreiteira, precos, status, data_inicio, previsao_conclusao } = req.body ?? {};
  const obra = await prisma.obras.findUnique({ where: { id: params.id } });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

  await prisma.$transaction(async (tx) => {
    await tx.obras.update({
      where: { id: params.id },
      data: {
        ...(nome && { nome: String(nome) }),
        ...('local'               in (req.body ?? {}) && { local:               local               ? String(local)       : null }),
        ...('empreiteira'         in (req.body ?? {}) && { empreiteira:         empreiteira         ? String(empreiteira) : null }),
        ...('status'              in (req.body ?? {}) && { status:              status              ? String(status)      : 'ativo' }),
        ...('data_inicio'         in (req.body ?? {}) && { data_inicio:         data_inicio         ? new Date(data_inicio)         : null }),
        ...('previsao_conclusao'  in (req.body ?? {}) && { previsao_conclusao:  previsao_conclusao  ? new Date(previsao_conclusao)  : null }),
      } as never,
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
    include: { obra_precos: true, preco_tipos: { include: { precos: true } }, apartamento_tipos: true, pavimentos: { orderBy: { numero: 'asc' }, include: pavimentoInclude } },
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

// ── Preco Tipos ───────────────────────────────────────────────────────────────

async function listarPrecoTipos(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const data = await (prisma as any).preco_tipos.findMany({
    where: { obra_id: params.id },
    include: { precos: true },
    orderBy: { nome: 'asc' },
  });
  return res.status(200).json({ data });
}

async function criarPrecoTipo(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome, precos } = req.body ?? {};
  if (!nome) return res.status(400).json({ error: 'nome e obrigatorio' });
  const obra = await prisma.obras.findUnique({ where: { id: params.id } });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

  const data = await prisma.$transaction(async (tx) => {
    const tipo = await (tx as any).preco_tipos.create({
      data: { obra_id: params.id, nome: String(nome).trim() },
    });
    if (Array.isArray(precos) && precos.length > 0) {
      const validos = precos.filter((p: any) => p.preco_m2 !== '' && p.preco_m2 != null);
      if (validos.length > 0) {
        await (tx as any).preco_tipo_precos.createMany({
          data: validos.map((p: any) => ({
            preco_tipo_id: tipo.id,
            etapa: p.etapa,
            preco_m2: parseFloat(String(p.preco_m2)) || 0,
          })),
        });
      }
    }
    return (tx as any).preco_tipos.findUnique({ where: { id: tipo.id }, include: { precos: true } });
  });

  return res.status(201).json({ message: 'Tipo de preco criado', data });
}

async function atualizarPrecoTipo(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome, precos } = req.body ?? {};
  const tipo = await (prisma as any).preco_tipos.findUnique({ where: { id: params.id } });
  if (!tipo) return res.status(404).json({ error: 'Tipo nao encontrado' });

  await prisma.$transaction(async (tx) => {
    if (nome) await (tx as any).preco_tipos.update({ where: { id: params.id }, data: { nome: String(nome).trim() } });
    if (Array.isArray(precos)) {
      await (tx as any).preco_tipo_precos.deleteMany({ where: { preco_tipo_id: params.id } });
      const validos = precos.filter((p: any) => p.preco_m2 !== '' && p.preco_m2 != null);
      if (validos.length > 0) {
        await (tx as any).preco_tipo_precos.createMany({
          data: validos.map((p: any) => ({
            preco_tipo_id: params.id,
            etapa: p.etapa,
            preco_m2: parseFloat(String(p.preco_m2)) || 0,
          })),
        });
      }
    }
  });

  const data = await (prisma as any).preco_tipos.findUnique({ where: { id: params.id }, include: { precos: true } });
  return res.status(200).json({ data });
}

async function excluirPrecoTipo(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  await (prisma as any).preco_tipos.delete({ where: { id: params.id } });
  return res.status(200).json({ message: 'Tipo excluido' });
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
  const { nome, numero, tipo_id, preco_tipo_id } = req.body ?? {};
  const pav = await prisma.pavimentos.findUnique({ where: { id: params.id } });
  if (!pav) return res.status(404).json({ error: 'Pavimento nao encontrado' });
  const data = await prisma.apartamentos.create({
    data: {
      pavimento_id:  params.id,
      tipo_id:       tipo_id       ?? null,
      preco_tipo_id: preco_tipo_id ?? null,
      nome:          nome          ?? null,
      numero:        numero        != null ? Number(numero) : null,
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
      pavimentos: {
        include: {
          obras: {
            include: {
              obra_precos: true,
              preco_tipos: { include: { precos: true } },
            },
          },
        },
      },
    },
  });
  if (!apt) return res.status(404).json({ error: 'Apartamento nao encontrado' });

  const obraPrecos    = buildPrecoMap(apt.pavimentos.obras.obra_precos);
  const precoTiposMap = buildPrecoTiposMap(apt.pavimentos.obras.preco_tipos as any);
  const pavPrecos     = resolvePrecos((apt.pavimentos as any).preco_tipo_id, precoTiposMap, obraPrecos);
  const aptPrecos     = resolvePrecos((apt as any).preco_tipo_id, precoTiposMap, pavPrecos);

  let aptTotal = 0;
  const comodos = apt.comodos.map(c => {
    const efetivos = resolvePrecos((c as any).preco_tipo_id, precoTiposMap, aptPrecos);
    const orc = calcComodo(c, efetivos);
    aptTotal += orc.total;
    return { ...c, orcamento: orc };
  });
  return res.status(200).json({ data: { ...apt, comodos, orcamento_total: aptTotal } });
}

async function atualizarApartamento(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome, numero, tipo_id, preco_tipo_id } = req.body ?? {};
  const apt = await prisma.apartamentos.findUnique({ where: { id: params.id } });
  if (!apt) return res.status(404).json({ error: 'Apartamento nao encontrado' });
  const data = await prisma.apartamentos.update({
    where: { id: params.id },
    data: {
      ...('nome'          in (req.body ?? {}) && { nome:          nome          ?? null }),
      ...('numero'        in (req.body ?? {}) && { numero:        numero        != null ? Number(numero) : null }),
      ...('tipo_id'       in (req.body ?? {}) && { tipo_id:       tipo_id       ?? null }),
      ...('preco_tipo_id' in (req.body ?? {}) && { preco_tipo_id: preco_tipo_id ?? null }),
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
    const zerarMedidas = { paredes: [] as never, tetos: [] as never, parede1_m2: 0, parede2_m2: 0, parede3_m2: 0, parede4_m2: 0, teto_m2: 0 };
    for (const c of origem.comodos) {
      await tx.comodos.create({
        data: {
          pavimento_id: params.id, tipo: c.tipo, nome: c.nome ?? null,
          preco_tipo_id: (c as any).preco_tipo_id ?? null,
          ...(manter_medidas
            ? { paredes: c.paredes as never, tetos: c.tetos as never, parede1_m2: c.parede1_m2, parede2_m2: c.parede2_m2, parede3_m2: c.parede3_m2, parede4_m2: c.parede4_m2, teto_m2: c.teto_m2 }
            : zerarMedidas),
        },
      });
    }
    for (const apt of origem.apartamentos) {
      const novoApt = await tx.apartamentos.create({
        data: {
          pavimento_id:  params.id,
          tipo_id:       apt.tipo_id       ?? null,
          preco_tipo_id: (apt as any).preco_tipo_id ?? null,
          nome:          apt.nome          ?? null,
          numero:        apt.numero        ?? null,
        },
      });
      for (const c of apt.comodos) {
        await tx.comodos.create({
          data: {
            pavimento_id: params.id, apartamento_id: novoApt.id,
            tipo: c.tipo, nome: c.nome ?? null,
            preco_tipo_id: (c as any).preco_tipo_id ?? null,
            ...(manter_medidas
              ? { paredes: c.paredes as never, tetos: c.tetos as never, parede1_m2: c.parede1_m2, parede2_m2: c.parede2_m2, parede3_m2: c.parede3_m2, parede4_m2: c.parede4_m2, teto_m2: c.teto_m2 }
              : zerarMedidas),
          },
        });
      }
    }
  });

  const data = await prisma.pavimentos.findUnique({
    where: { id: params.id },
    include: { ...pavimentoInclude, obras: { include: { obra_precos: true, preco_tipos: { include: { precos: true } } } } },
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
          preco_tipos: { include: { precos: true } },
          apartamento_tipos: { orderBy: { nome: 'asc' } },
          pavimentos: { select: { id: true, nome: true, numero: true }, orderBy: { numero: 'asc' } },
        },
      },
    },
  });
  if (!pav) return res.status(404).json({ error: 'Pavimento nao encontrado' });

  const obraPrecos    = buildPrecoMap(pav.obras.obra_precos);
  const precoTiposMap = buildPrecoTiposMap(pav.obras.preco_tipos as any);
  const tipoNomeMap   = Object.fromEntries((pav.obras.preco_tipos as any[]).map((t: any) => [t.id, t.nome]));
  const enriched      = enrichPavimento(pav, obraPrecos, precoTiposMap, tipoNomeMap);
  return res.status(200).json({ data: enriched });
}

// ── Comodo (detalhe) ──────────────────────────────────────────────────────────

async function getComodo(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const c = await prisma.comodos.findUnique({
    where: { id: params.id },
    include: {
      pavimentos: {
        include: {
          obras: {
            include: {
              obra_precos: true,
              preco_tipos: { include: { precos: true } },
            },
          },
        },
      },
      apartamentos: { select: { preco_tipo_id: true } },
    },
  });
  if (!c) return res.status(404).json({ error: 'Comodo nao encontrado' });

  const obraPrecos    = buildPrecoMap(c.pavimentos.obras.obra_precos);
  const precoTiposMap = buildPrecoTiposMap(c.pavimentos.obras.preco_tipos as any);
  const pavPrecos     = resolvePrecos((c.pavimentos as any).preco_tipo_id, precoTiposMap, obraPrecos);
  const aptPrecos     = resolvePrecos((c.apartamentos as any)?.preco_tipo_id, precoTiposMap, pavPrecos);
  const efetivos      = resolvePrecos((c as any).preco_tipo_id, precoTiposMap, aptPrecos);

  return res.status(200).json({
    data: {
      ...c,
      orcamento: calcComodo(c, efetivos),
      precos_efetivos: efetivos,
      preco_tipos_obra: c.pavimentos.obras.preco_tipos,
    },
  });
}

// ── Pavimentos (criar/editar/excluir) ─────────────────────────────────────────

async function adicionarPavimento(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { nome, numero, tipo, comodos, preco_tipo_id } = req.body ?? {};
  if (!nome || numero === undefined) return res.status(400).json({ error: 'nome e numero sao obrigatorios' });
  const obra = await prisma.obras.findUnique({ where: { id: params.id } });
  if (!obra) return res.status(404).json({ error: 'Obra nao encontrada' });

  const data = await prisma.$transaction(async (tx) => {
    const pav = await tx.pavimentos.create({
      data: {
        obra_id: params.id,
        nome:    String(nome),
        numero:  Number(numero),
        tipo:    tipo ?? 'pavimento',
        preco_tipo_id: preco_tipo_id ?? null,
      },
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
  const { nome, numero, preco_tipo_id } = req.body ?? {};
  const pav = await prisma.pavimentos.findUnique({ where: { id: params.id } });
  if (!pav) return res.status(404).json({ error: 'Pavimento nao encontrado' });
  const data = await prisma.pavimentos.update({
    where: { id: params.id },
    data: {
      ...(nome && { nome: String(nome) }),
      ...(numero !== undefined && { numero: Number(numero) }),
      ...('preco_tipo_id' in (req.body ?? {}) && { preco_tipo_id: preco_tipo_id ?? null }),
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

  const paredes: ParedeItem[] = Array.isArray(b.paredes) ? b.paredes : [];
  const tetos:   TetoItem[]   = Array.isArray(b.tetos)   ? b.tetos   : [];
  const totalPar = paredes.reduce((s, p) => s + Number(p.m2), 0);

  const data = await prisma.comodos.create({
    data: {
      pavimento_id, apartamento_id,
      tipo:          b.tipo as never,
      nome:          b.nome ?? null,
      preco_tipo_id: b.preco_tipo_id ?? null,
      paredes:       paredes as never,
      tetos:         tetos   as never,
      parede1_m2:    totalPar, parede2_m2: 0, parede3_m2: 0, parede4_m2: 0,
      teto_m2:       tetos.reduce((s, t) => s + Number(t.m2), 0),
    },
  });
  return res.status(201).json({ message: 'Comodo adicionado', data });
}

async function atualizarComodo(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const b = req.body ?? {};
  const comodo = await prisma.comodos.findUnique({ where: { id: params.id } });
  if (!comodo) return res.status(404).json({ error: 'Comodo nao encontrado' });
  const updateData: Record<string, unknown> = {};
  if (b.tipo)        updateData.tipo        = b.tipo;
  if ('nome' in b)   updateData.nome        = b.nome || null;
  if (b.etapa_atual) updateData.etapa_atual = b.etapa_atual;
  if ('preco_tipo_id' in b) updateData.preco_tipo_id = b.preco_tipo_id ?? null;

  if (Array.isArray(b.paredes)) {
    const paredes = b.paredes as ParedeItem[];
    const tetos   = Array.isArray(b.tetos) ? b.tetos as TetoItem[] : undefined;
    updateData.paredes    = paredes;
    updateData.parede1_m2 = paredes.reduce((s, p) => s + Number(p.m2), 0);
    updateData.parede2_m2 = 0; updateData.parede3_m2 = 0; updateData.parede4_m2 = 0;
    if (tetos !== undefined) {
      updateData.tetos   = tetos;
      updateData.teto_m2 = tetos.reduce((s, t) => s + Number(t.m2), 0);
    }
  } else {
    if (b.parede1_m2 !== undefined) updateData.parede1_m2 = Number(b.parede1_m2);
    if (b.parede2_m2 !== undefined) updateData.parede2_m2 = Number(b.parede2_m2);
    if (b.parede3_m2 !== undefined) updateData.parede3_m2 = Number(b.parede3_m2);
    if (b.parede4_m2 !== undefined) updateData.parede4_m2 = Number(b.parede4_m2);
    if (b.teto_m2    !== undefined) updateData.teto_m2    = Number(b.teto_m2);
  }

  const data = await prisma.comodos.update({
    where: { id: params.id },
    data: updateData as never,
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
  { method: 'POST',   path: '/obras/:id/orcamento',             handler: preencherOrcamento       },
  { method: 'GET',    path: '/obras/:id/apartamento-tipos',     handler: listarApartamentoTipos   },
  { method: 'POST',   path: '/obras/:id/apartamento-tipos',     handler: criarApartamentoTipo     },
  { method: 'PUT',    path: '/apartamento-tipos/:id',           handler: atualizarApartamentoTipo },
  { method: 'DELETE', path: '/apartamento-tipos/:id',           handler: excluirApartamentoTipo   },
  { method: 'GET',    path: '/obras/:id/preco-tipos',           handler: listarPrecoTipos         },
  { method: 'POST',   path: '/obras/:id/preco-tipos',           handler: criarPrecoTipo           },
  { method: 'PUT',    path: '/preco-tipos/:id',                 handler: atualizarPrecoTipo       },
  { method: 'DELETE', path: '/preco-tipos/:id',                 handler: excluirPrecoTipo         },
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

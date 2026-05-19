import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';
import {
  listarFuncionariosDominio,
  getFuncionarioDominio,
  enviarS2206,
  consultarStatusEvento,
  validarWebhookDominio,
} from './dominio/client';
import { dominioToFuncionario, alteracaoToDominioS2206 } from './dominio/mapper';
import type { DominioWebhookPayload } from './dominio/types';
import { listarFuncionarios as pontotelListar } from './pontotel/client';
import { MOCK_RELATORIO_CICLOS } from './pontotel/mock_relatorio';
import { verificarWebhook, receberWebhook } from './whatsapp/webhook';

export type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
  params: Record<string, string>
) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route { method: string; path: string; handler: RouteHandler; }

// ── Listar ────────────────────────────────────────────────────────────────────

async function listarFuncionarios(req: VercelRequest, res: VercelResponse) {
  const url    = new URL(req.url || '/', 'http://localhost');
  const search = url.searchParams.get('search');

  let query = supabase.from('funcionarios').select('*').order('created_at', { ascending: false });

  if (search) {
    query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%,matricula.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

// ── Criar ─────────────────────────────────────────────────────────────────────

async function criarFuncionario(req: VercelRequest, res: VercelResponse) {
  const b = (req.body ?? {}) as Record<string, unknown>;

  if (!b.nome || typeof b.nome !== 'string' || !b.nome.trim()) {
    return res.status(400).json({ error: 'Campo "nome" e obrigatorio' });
  }

  const s  = (k: string) => (b[k] ? String(b[k]).trim() || null : null);
  const dt = (k: string) => (b[k] ? String(b[k]) : null);

  const payload: Record<string, unknown> = {
    nome:   String(b.nome).trim(),
    status: b.status ? String(b.status) : 'ativo',
    // Cadastral
    cpf:             s('cpf'),
    nis:             s('nis'),
    data_nascimento: dt('data_nascimento'),
    cep:             s('cep'),
    logradouro:      s('logradouro'),
    numero_end:      s('numero_end'),
    complemento:     s('complemento'),
    bairro:          s('bairro'),
    municipio:       s('municipio'),
    uf:              s('uf'),
    email:           s('email'),
    telefone:        s('telefone'),
    escolaridade:    s('escolaridade'),
    // Contratual
    cargo:             s('cargo'),
    matricula:         s('matricula'),
    cbo:               s('cbo'),
    cbo_descricao:     s('cbo_descricao'),
    tipo_contrato:     s('tipo_contrato') ?? 'indeterminado',
    data_admissao:     dt('data_admissao'),
    data_fim_contrato: dt('data_fim_contrato'),
    horario_entrada:   s('horario_entrada'),
    horario_saida:     s('horario_saida'),
    dias_trabalho:     s('dias_trabalho'),
    // Remuneratório
    salario:                  b.salario !== undefined && b.salario !== null && b.salario !== '' && !isNaN(Number(b.salario)) ? Number(b.salario) : null,
    unidade_pagamento:        s('unidade_pagamento') ?? 'mes',
    adicional_periculosidade: b.adicional_periculosidade === true || b.adicional_periculosidade === 'true',
    adicional_insalubridade:  s('adicional_insalubridade'),
  };

  // Remove null keys para evitar sobrescrever defaults do banco
  Object.keys(payload).forEach(k => { if (payload[k] === null) delete payload[k]; });

  const { data, error } = await supabase.from('funcionarios').insert(payload).select().single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'CPF ou matricula ja cadastrado' });
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json({ message: 'Funcionario cadastrado com sucesso', data });
}

// ── Detalhe ───────────────────────────────────────────────────────────────────

async function getFuncionario(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { data, error } = await supabase.from('funcionarios').select('*').eq('id', params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Funcionario nao encontrado' });
  return res.status(200).json({ data });
}

// ── Atualizar ─────────────────────────────────────────────────────────────────

async function atualizarFuncionario(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { data: exists } = await supabase.from('funcionarios').select('id').eq('id', params.id).single();
  if (!exists) return res.status(404).json({ error: 'Funcionario nao encontrado' });

  const b     = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  const str = (k: string) => { if (k in b) patch[k] = b[k] ? String(b[k]).trim() || null : null; };
  const dt  = (k: string) => { if (k in b) patch[k] = b[k] ? String(b[k]) : null; };

  if ('nome' in b && b.nome) patch.nome = String(b.nome).trim();
  if ('status' in b)         patch.status = String(b.status);

  // Cadastral
  str('cpf'); str('nis'); dt('data_nascimento');
  str('cep'); str('logradouro'); str('numero_end'); str('complemento');
  str('bairro'); str('municipio'); str('uf');
  str('email'); str('telefone'); str('escolaridade');

  // Contratual
  str('cargo'); str('matricula'); str('cbo'); str('cbo_descricao');
  str('tipo_contrato'); dt('data_admissao'); dt('data_fim_contrato');
  str('horario_entrada'); str('horario_saida'); str('dias_trabalho');

  // Remuneratório
  if ('salario' in b) {
    patch.salario = b.salario !== null && b.salario !== '' && !isNaN(Number(b.salario))
      ? Number(b.salario) : null;
  }
  str('unidade_pagamento');
  if ('adicional_periculosidade' in b) {
    patch.adicional_periculosidade = b.adicional_periculosidade === true || b.adicional_periculosidade === 'true';
  }
  str('adicional_insalubridade');

  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

  const { data, error } = await supabase.from('funcionarios').update(patch).eq('id', params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ message: 'Funcionario atualizado com sucesso', data });
}

// ── Desativar ─────────────────────────────────────────────────────────────────

async function desativarFuncionario(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { data: exists } = await supabase.from('funcionarios').select('id').eq('id', params.id).single();
  if (!exists) return res.status(404).json({ error: 'Funcionario nao encontrado' });

  const { error } = await supabase.from('funcionarios').update({ status: 'inativo' }).eq('id', params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ message: 'Funcionario desativado com sucesso' });
}

// ── Histórico de Alterações Contratuais (S-2206) ──────────────────────────────

async function listarAlteracoes(_req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { data: exists } = await supabase.from('funcionarios').select('id').eq('id', params.id).single();
  if (!exists) return res.status(404).json({ error: 'Funcionario nao encontrado' });

  const { data, error } = await supabase
    .from('historico_contratos')
    .select('*')
    .eq('funcionario_id', params.id)
    .order('data_alteracao', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data: data ?? [] });
}

async function criarAlteracao(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { data: func } = await supabase.from('funcionarios').select('*').eq('id', params.id).single();
  if (!func) return res.status(404).json({ error: 'Funcionario nao encontrado' });

  const b = (req.body ?? {}) as Record<string, unknown>;
  const { tipo_evento, motivo, data_alteracao, competencia, observacoes, novos_dados } = b;

  if (!tipo_evento || !data_alteracao || !competencia || !novos_dados || typeof novos_dados !== 'object') {
    return res.status(400).json({ error: 'Campos obrigatorios: tipo_evento, data_alteracao, competencia, novos_dados' });
  }

  // Snapshot antes/depois
  const novos = novos_dados as Record<string, unknown>;
  const de: Record<string, unknown>   = {};
  const para: Record<string, unknown> = {};
  for (const key of Object.keys(novos)) {
    de[key]   = (func as Record<string, unknown>)[key] ?? null;
    para[key] = novos[key];
  }

  // Prazo eSocial: 15º dia do mês subsequente à competência
  const [year, month] = String(competencia).split('-').map(Number);
  const nm = month === 12 ? 1 : month + 1;
  const ny = month === 12 ? year + 1 : year;
  const prazo = `${ny}-${String(nm).padStart(2, '0')}-15`;

  const { data: hist, error: histErr } = await supabase
    .from('historico_contratos')
    .insert({
      funcionario_id:   params.id,
      tipo_evento:      String(tipo_evento),
      motivo:           motivo ? String(motivo) : null,
      data_alteracao:   String(data_alteracao),
      competencia:      String(competencia),
      prazo_esocial:    prazo,
      campos_alterados: { de, para },
      status_esocial:   'pendente',
      observacoes:      observacoes ? String(observacoes) : null,
    })
    .select()
    .single();

  if (histErr) return res.status(500).json({ error: histErr.message });

  // Atualiza estado atual do funcionário
  const { error: updateErr } = await supabase
    .from('funcionarios')
    .update(para)
    .eq('id', params.id);

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  return res.status(201).json({ message: 'Alteracao contratual registrada com sucesso', data: hist });
}

// ── Integração Domínio — listagem e detalhe (mock / real) ─────────────────────

async function dominioListarFuncionarios(req: VercelRequest, res: VercelResponse) {
  const url      = new URL(req.url || '/', 'http://localhost');
  const pagina   = parseInt(url.searchParams.get('pagina')   || '1',  10);
  const porPagina = parseInt(url.searchParams.get('porPagina') || '20', 10);
  try {
    const data = await listarFuncionariosDominio(pagina, porPagina);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

async function dominioGetFuncionario(
  _req: VercelRequest, res: VercelResponse, params: Record<string, string>,
) {
  try {
    const data = await getFuncionarioDominio(params.matricula);
    if (!data.sucesso) return res.status(404).json({ error: 'Matrícula não encontrada no Domínio' });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

// ── Integração Domínio — sincronização para o banco ───────────────────────────

async function dominioSincronizarFuncionario(
  _req: VercelRequest, res: VercelResponse, params: Record<string, string>,
) {
  try {
    const dominioResp = await getFuncionarioDominio(params.matricula);
    if (!dominioResp.sucesso || !dominioResp.dados) {
      return res.status(404).json({ error: 'Matrícula não encontrada no Domínio' });
    }
    const payload = dominioToFuncionario(dominioResp.dados);

    // Verifica se já existe pelo CPF
    const cpfLimpo = payload.cpf;
    const { data: existente } = cpfLimpo
      ? await supabase.from('funcionarios').select('id').eq('cpf', cpfLimpo).maybeSingle()
      : { data: null };

    if (existente) {
      const { data: updated, error } = await supabase
        .from('funcionarios')
        .update(payload)
        .eq('id', existente.id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ acao: 'atualizado', data: updated });
    }

    const { data: criado, error } = await supabase
      .from('funcionarios')
      .insert(payload)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ acao: 'criado', data: criado });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

async function dominioSincronizarTodos(
  _req: VercelRequest, res: VercelResponse,
) {
  try {
    const listResp = await listarFuncionariosDominio(1, 100);
    const resultados: { matricula: string; acao: string; erro?: string }[] = [];

    for (const df of listResp.dados) {
      try {
        const payload   = dominioToFuncionario(df);
        const cpfLimpo  = payload.cpf;
        const { data: existente } = cpfLimpo
          ? await supabase.from('funcionarios').select('id').eq('cpf', cpfLimpo).maybeSingle()
          : { data: null };

        if (existente) {
          await supabase.from('funcionarios').update(payload).eq('id', existente.id);
          resultados.push({ matricula: df.matricula, acao: 'atualizado' });
        } else {
          await supabase.from('funcionarios').insert(payload);
          resultados.push({ matricula: df.matricula, acao: 'criado' });
        }
      } catch (e) {
        resultados.push({ matricula: df.matricula, acao: 'erro', erro: String(e) });
      }
    }

    return res.status(200).json({ resultados, total: resultados.length });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

// ── Integração Domínio — envio de eventos S-2206 ──────────────────────────────

async function dominioEnviarS2206(
  req: VercelRequest, res: VercelResponse, params: Record<string, string>,
) {
  // Busca a alteração no nosso banco
  const { data: alt, error: altErr } = await supabase
    .from('historico_contratos')
    .select('*, funcionarios(cpf, matricula)')
    .eq('id', params.alteracaoId)
    .single();

  if (altErr || !alt) return res.status(404).json({ error: 'Alteração não encontrada' });
  if (alt.status_esocial !== 'pendente') {
    return res.status(409).json({ error: `Alteração já está com status "${alt.status_esocial}"` });
  }

  const func = alt.funcionarios as { cpf: string; matricula: string } | null;
  if (!func?.cpf || !func?.matricula) {
    return res.status(422).json({ error: 'Funcionário sem CPF ou matrícula — necessários para o S-2206' });
  }

  const s2206Payload = alteracaoToDominioS2206({
    matricula:      func.matricula,
    cpf:            func.cpf,
    tipo_evento:    alt.tipo_evento,
    motivo:         alt.motivo,
    data_alteracao: alt.data_alteracao,
    competencia:    alt.competencia,
    observacoes:    alt.observacoes,
    novos:          (alt.campos_alterados as { para: Record<string, unknown> }).para,
  });

  try {
    const resp = await enviarS2206(s2206Payload);

    // Atualiza o status e salva o protocolo retornado pelo Domínio
    await supabase
      .from('historico_contratos')
      .update({ status_esocial: 'enviado', protocolo_dominio: resp.protocolo })
      .eq('id', params.alteracaoId);

    return res.status(200).json({ protocolo: resp.protocolo, status: resp.status, mensagem: resp.mensagem });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

async function dominioStatusEvento(
  req: VercelRequest, res: VercelResponse, params: Record<string, string>,
) {
  try {
    const status = await consultarStatusEvento(params.protocolo);

    // Se aprovado, atualiza o nosso banco também
    if (status.status === 'aprovado' || status.status === 'rejeitado') {
      await supabase
        .from('historico_contratos')
        .update({ status_esocial: status.status })
        .eq('protocolo_dominio', params.protocolo);
    }

    return res.status(200).json(status);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

// ── Integração Domínio — webhook (retorno assíncrono do eSocial) ──────────────

async function dominioWebhook(req: VercelRequest, res: VercelResponse) {
  const rawBody = JSON.stringify(req.body);
  const sig     = req.headers['x-dominio-signature'] as string | undefined;

  if (!validarWebhookDominio(rawBody, sig)) {
    return res.status(401).json({ error: 'Assinatura inválida' });
  }

  const payload = req.body as DominioWebhookPayload;
  if (!payload?.protocolo || !payload?.status) {
    return res.status(400).json({ error: 'Payload inválido' });
  }

  const novoStatus = payload.status === 'aprovado' ? 'aprovado' : 'rejeitado';

  const { error } = await supabase
    .from('historico_contratos')
    .update({ status_esocial: novoStatus })
    .eq('protocolo_dominio', payload.protocolo);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ recebido: true });
}

// ── Health ────────────────────────────────────────────────────────────────────

function healthCheck(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-dep-pess-api', timestamp: new Date().toISOString() });
}

// ── PontoTel ──────────────────────────────────────────────────────────────────

async function pontotelRelatorioObras(req: VercelRequest, res: VercelResponse) {
  const USE_MOCK = process.env.PONTOTEL_MOCK !== 'false';
  const fonte = USE_MOCK ? MOCK_RELATORIO_CICLOS : [];

  /**
   * INFRA-FUTURA: quando PONTOTEL_MOCK=false, buscar registros de ponto do PontoTel
   * agrupados por período quinzenal (1-15 e 16-fim de mês) e cruzar com:
   *   - pedidos_material: SELECT periodo_inicio, SUM(excedente_valor)
   *     FROM pedidos_material WHERE obra_id = ? GROUP BY periodo_inicio
   *   - funcionarios: salário/h para calcular custo_perdido_pessoal em tempo real
   */

  // Filtro por número de meses — ?meses=N (default 24, max 36)
  const url   = new URL(req.url || '/', 'http://localhost');
  const meses = Math.min(Math.max(parseInt(url.searchParams.get('meses') ?? '24'), 1), 36);

  // Determina quais mes_ano entram no corte
  const todosMeses = [...new Set(
    fonte.flatMap(o => o.ciclos.map(c => c.mes_ano))
  )].sort();
  const mesesFiltrados = new Set(todosMeses.slice(-meses));

  // Monta lista de ciclos disponíveis (eixo X unificado para os gráficos)
  const todosLabels = [...new Set(
    fonte.flatMap(o => o.ciclos
      .filter(c => mesesFiltrados.has(c.mes_ano))
      .map(c => JSON.stringify({ periodo: c.periodo, label: c.label }))
    )
  )].map(s => JSON.parse(s) as { periodo: string; label: string })
    .sort((a, b) => a.periodo.localeCompare(b.periodo));

  const obras = fonte.map(obra => ({
    obra_id:        obra.obra_id,
    obra_nome:      obra.obra_nome,
    encarregado:    obra.encarregado,
    n_funcionarios: obra.n_funcionarios,
    horas_mensais:  obra.horas_mensais,
    ciclos: obra.ciclos
      .filter(c => mesesFiltrados.has(c.mes_ano))
      .sort((a, b) => a.periodo.localeCompare(b.periodo))
      .map(c => ({
        ...c,
        prejuizo_total: parseFloat((c.custo_perdido_pessoal + c.material_excedente_valor).toFixed(2)),
      })),
  }));

  return res.status(200).json({ data: { obras, ciclos_labels: todosLabels, meses_filtrados: meses } });
}

async function pontotelFuncionarios(_req: VercelRequest, res: VercelResponse) {
  try {
    const funcionarios = await pontotelListar();
    return res.status(200).json({ data: funcionarios, total: funcionarios.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao consultar PontoTel';
    return res.status(502).json({ error: msg });
  }
}

export const routes: Route[] = [
  // Funcionários — CRUD interno
  { method: 'GET',    path: '/funcionarios',                                 handler: listarFuncionarios          },
  { method: 'POST',   path: '/funcionarios',                                 handler: criarFuncionario            },
  { method: 'GET',    path: '/funcionarios/:id',                             handler: getFuncionario              },
  { method: 'PUT',    path: '/funcionarios/:id',                             handler: atualizarFuncionario        },
  { method: 'DELETE', path: '/funcionarios/:id',                             handler: desativarFuncionario        },
  // Alterações contratuais (S-2206) — banco interno
  { method: 'GET',    path: '/funcionarios/:id/alteracoes',                  handler: listarAlteracoes            },
  { method: 'POST',   path: '/funcionarios/:id/alteracoes',                  handler: criarAlteracao              },
  // Domínio — espelho da API externa (mock ativo)
  { method: 'GET',    path: '/dominio/funcionarios',                         handler: dominioListarFuncionarios   },
  { method: 'GET',    path: '/dominio/funcionarios/:matricula',              handler: dominioGetFuncionario       },
  { method: 'POST',   path: '/dominio/sync/:matricula',                      handler: dominioSincronizarFuncionario },
  { method: 'POST',   path: '/dominio/sync',                                 handler: dominioSincronizarTodos     },
  // Domínio — envio de eventos ao eSocial
  { method: 'POST',   path: '/dominio/eventos/s2206/:alteracaoId',           handler: dominioEnviarS2206          },
  { method: 'GET',    path: '/dominio/eventos/status/:protocolo',            handler: dominioStatusEvento         },
  // Domínio — webhook de retorno assíncrono
  { method: 'POST',   path: '/dominio/webhook',                              handler: dominioWebhook              },
  // PontoTel — integração com sistema de ponto externo
  { method: 'GET',    path: '/pontotel/relatorios/obras',                    handler: pontotelRelatorioObras      },
  { method: 'GET',    path: '/pontotel/funcionarios',                        handler: pontotelFuncionarios        },
  // WhatsApp — INFRA-FUTURA: webhook de justificativa de material excedente
  { method: 'GET',    path: '/whatsapp/webhook',                             handler: verificarWebhook            },
  { method: 'POST',   path: '/whatsapp/webhook',                             handler: receberWebhook              },
  { method: 'GET',    path: '/health',                                       handler: healthCheck                 },
];

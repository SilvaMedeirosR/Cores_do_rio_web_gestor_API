import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './lib/supabase';
import {
  gerarEtapasMensais, gerarEtapasPassagens,
  hoje, addDias, DEPT_EMAIL,
} from './lib/ciclos';
import {
  enviarEmail,
  htmlLembrete, htmlConfirmacao, htmlAtraso, htmlJustificativa,
} from './lib/skymail';

export type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
  params: Record<string, string>,
) => Promise<VercelResponse | void> | VercelResponse | void;

export interface Route { method: string; path: string; handler: RouteHandler; }

const JUNIOR_EMAIL = process.env.JUNIOR_EMAIL ?? 'juniorsoares@coresdorio.net.br';
const CRON_SECRET  = process.env.CRON_SECRET  ?? '';

// ── Helpers ───────────────────────────────────────────────────────────────────

function verifyCron(req: VercelRequest, res: VercelResponse): boolean {
  // Vercel Cron adds this header automatically; also accept CRON_SECRET for manual calls
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const secret = (req.headers['x-cron-secret'] as string | undefined) ?? (req.body as Record<string, unknown>)?.secret;
  if (isVercelCron) return true;
  if (CRON_SECRET && secret === CRON_SECRET) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

async function criarNotificacao(
  destinatario: string, titulo: string, corpo: string, tipo: string, etapa_id?: string
) {
  await supabase.from('notificacoes').insert({
    destinatario, titulo, corpo, tipo, etapa_id: etapa_id ?? null,
  });
}

type EtapaRow = {
  id: string; tipo_workflow: string; ciclo_ref: string;
  etapa_nome: string; etapa_label: string; dept_responsavel: string;
  data_prevista: string; status: string; created_at: string;
};

// ── Listar etapas ─────────────────────────────────────────────────────────────

async function listarEtapas(req: VercelRequest, res: VercelResponse) {
  const url   = new URL(req.url || '/', 'http://localhost');
  const dept  = url.searchParams.get('dept');
  const ref   = url.searchParams.get('ref');
  const wf    = url.searchParams.get('workflow');
  const ano   = url.searchParams.get('ano');
  const mes   = url.searchParams.get('mes');

  let q = supabase
    .from('folha_etapas_ciclo')
    .select(`*, folha_confirmacoes(*), folha_justificativas(*)`)
    .order('data_prevista', { ascending: true });

  if (dept)    q = q.eq('dept_responsavel', dept);
  if (ref)     q = q.eq('ciclo_ref', ref);
  if (wf)      q = q.eq('tipo_workflow', wf);
  if (ano && mes) q = q.eq('ciclo_ref', `${ano}-${mes.padStart(2, '0')}`);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data: data ?? [] });
}

// ── Confirmar etapa ───────────────────────────────────────────────────────────

async function confirmarEtapa(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { id } = params;
  const body   = (req.body ?? {}) as Record<string, unknown>;

  const confirmado_por = String(body.confirmado_por ?? '').trim();
  if (!confirmado_por) return res.status(400).json({ error: 'confirmado_por obrigatorio' });

  const arquivo_nome = body.arquivo_nome ? String(body.arquivo_nome) : null;
  const arquivo_url  = body.arquivo_url  ? String(body.arquivo_url)  : null;

  const { data: etapa, error: eErr } = await supabase
    .from('folha_etapas_ciclo').select('*').eq('id', id).single();
  if (eErr || !etapa) return res.status(404).json({ error: 'Etapa não encontrada' });

  const e = etapa as EtapaRow;
  if (e.status === 'concluido') return res.status(409).json({ error: 'Etapa já confirmada' });

  const emailEsperado = DEPT_EMAIL[e.dept_responsavel as keyof typeof DEPT_EMAIL];
  if (emailEsperado && confirmado_por !== emailEsperado) {
    return res.status(403).json({ error: `Apenas ${emailEsperado} pode confirmar esta etapa.` });
  }

  const { error: updErr } = await supabase
    .from('folha_etapas_ciclo').update({ status: 'concluido' }).eq('id', id);
  if (updErr) return res.status(500).json({ error: updErr.message });

  await supabase.from('folha_confirmacoes').insert({
    etapa_id: id, confirmado_por, arquivo_nome, arquivo_url,
  });

  // Notifica Junior
  const html = htmlConfirmacao(e, confirmado_por, arquivo_nome, arquivo_url);
  const nr   = await enviarEmail({
    to: JUNIOR_EMAIL,
    subject: `[CR] Confirmado: ${e.etapa_label} — ${e.ciclo_ref}`,
    html,
  });

  await supabase.from('folha_notificacoes_log').upsert({
    etapa_id: id, tipo: 'confirmacao', destinatario: JUNIOR_EMAIL,
    sucesso: nr.ok, erro: nr.erro ?? null,
  }, { onConflict: 'etapa_id,tipo,destinatario', ignoreDuplicates: false });

  // Notificação in-app para Junior
  await criarNotificacao(
    JUNIOR_EMAIL,
    `✓ ${e.etapa_label} — ${e.ciclo_ref}`,
    `Confirmado por ${confirmado_por}${arquivo_nome ? ` · ${arquivo_nome}` : ''}`,
    'confirmacao', id
  );

  return res.status(200).json({ ok: true });
}

// ── Justificar atraso ─────────────────────────────────────────────────────────

async function justificarEtapa(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
  const { id } = params;
  const body   = (req.body ?? {}) as Record<string, unknown>;

  const justificativa   = String(body.justificativa   ?? '').trim();
  const justificado_por = String(body.justificado_por ?? '').trim();
  if (!justificativa)   return res.status(400).json({ error: 'justificativa obrigatoria' });
  if (!justificado_por) return res.status(400).json({ error: 'justificado_por obrigatorio' });

  const { data: etapa, error: eErr } = await supabase
    .from('folha_etapas_ciclo').select('*').eq('id', id).single();
  if (eErr || !etapa) return res.status(404).json({ error: 'Etapa não encontrada' });

  const e = etapa as EtapaRow;

  await supabase.from('folha_justificativas').insert({ etapa_id: id, justificativa, justificado_por });

  // Notifica Junior
  const html = htmlJustificativa(e, justificado_por, justificativa);
  const nr   = await enviarEmail({
    to: JUNIOR_EMAIL,
    subject: `[CR] Justificativa: ${e.etapa_label} — ${e.ciclo_ref}`,
    html,
  });

  await supabase.from('folha_notificacoes_log').upsert({
    etapa_id: id, tipo: 'justificativa', destinatario: JUNIOR_EMAIL,
    sucesso: nr.ok, erro: nr.erro ?? null,
  }, { onConflict: 'etapa_id,tipo,destinatario', ignoreDuplicates: false });

  // Notificação in-app para Junior
  await criarNotificacao(
    JUNIOR_EMAIL,
    `Justificativa: ${e.etapa_label} — ${e.ciclo_ref}`,
    justificativa,
    'justificativa', id
  );

  return res.status(200).json({ ok: true });
}

// ── Cron: gerar ciclos ────────────────────────────────────────────────────────

async function cronGerar(req: VercelRequest, res: VercelResponse) {
  if (!verifyCron(req, res)) return;

  const agora = new Date();
  const ano   = agora.getUTCFullYear();
  const mes   = agora.getUTCMonth() + 1;

  // Gera mês atual e próximo mês para pagamentos
  const etapas = [
    ...gerarEtapasMensais(ano, mes),
    ...gerarEtapasMensais(mes === 12 ? ano + 1 : ano, mes === 12 ? 1 : mes + 1),
  ];

  // Gera passagens para semana atual e próxima
  const hoje  = new Date(Date.UTC(ano, agora.getUTCMonth(), agora.getUTCDate()));
  const prox  = new Date(hoje); prox.setUTCDate(prox.getUTCDate() + 7);
  etapas.push(...gerarEtapasPassagens(hoje), ...gerarEtapasPassagens(prox));

  if (etapas.length > 0) {
    const { error } = await supabase
      .from('folha_etapas_ciclo')
      .upsert(etapas, { onConflict: 'tipo_workflow,ciclo_ref,etapa_nome,dept_responsavel', ignoreDuplicates: true });
    if (error) return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, geradas: etapas.length });
}

// ── Cron: verificar e enviar notificações ─────────────────────────────────────

async function cronNotificar(req: VercelRequest, res: VercelResponse) {
  if (!verifyCron(req, res)) return;

  const hojeStr = hoje();

  // Busca todas as etapas pendentes/atrasadas com datas relevantes (até 3 dias a frente ou já passadas)
  const d3Ahead = addDias(hojeStr, 3);
  const { data: etapas, error } = await supabase
    .from('folha_etapas_ciclo')
    .select('*')
    .in('status', ['pendente', 'atrasado'])
    .lte('data_prevista', d3Ahead);

  if (error) return res.status(500).json({ error: error.message });

  let enviadas = 0;

  for (const row of (etapas ?? []) as EtapaRow[]) {
    const diffDias = Math.floor(
      (new Date(row.data_prevista + 'T12:00:00Z').getTime() - new Date(hojeStr + 'T12:00:00Z').getTime())
      / 86400000
    );

    const deptEmail   = DEPT_EMAIL[row.dept_responsavel as keyof typeof DEPT_EMAIL];
    const destinatarios = [deptEmail, JUNIOR_EMAIL].filter(Boolean);

    // ── Lembretes antecipados ─────────────────────────────────────────────────
    if (diffDias === 3 || diffDias === 2 || diffDias === 1) {
      const tipo = `lembrete_${diffDias}d` as string;
      for (const dest of destinatarios) {
        const { data: jaEnviou } = await supabase
          .from('folha_notificacoes_log')
          .select('id').eq('etapa_id', row.id).eq('tipo', tipo).eq('destinatario', dest).maybeSingle();
        if (jaEnviou) continue;

        const html = htmlLembrete(diffDias, row);
        const nr   = await enviarEmail({
          to: dest,
          subject: `[CR] Lembrete (${diffDias}d): ${row.etapa_label} — ${row.ciclo_ref}`,
          html,
        });

        await supabase.from('folha_notificacoes_log').insert({
          etapa_id: row.id, tipo, destinatario: dest,
          sucesso: nr.ok, erro: nr.erro ?? null,
        });
        await criarNotificacao(dest, `Lembrete ${diffDias}d: ${row.etapa_label}`, `${row.etapa_label} — ${row.ciclo_ref} · previsto ${row.data_prevista}`, tipo, row.id);
        enviadas++;
      }
    }

    // ── Atraso: passou do prazo e ainda pendente ──────────────────────────────
    if (diffDias < 0 && row.status === 'pendente') {
      await supabase.from('folha_etapas_ciclo').update({ status: 'atrasado' }).eq('id', row.id);

      const tipo = 'atraso';
      for (const dest of destinatarios) {
        const { data: jaEnviou } = await supabase
          .from('folha_notificacoes_log')
          .select('id').eq('etapa_id', row.id).eq('tipo', tipo).eq('destinatario', dest).maybeSingle();
        if (jaEnviou) continue;

        const html = htmlAtraso(row);
        const nr   = await enviarEmail({
          to: dest,
          subject: `[CR] ATRASO: ${row.etapa_label} — ${row.ciclo_ref}`,
          html,
        });

        await supabase.from('folha_notificacoes_log').insert({
          etapa_id: row.id, tipo, destinatario: dest,
          sucesso: nr.ok, erro: nr.erro ?? null,
        });
        await criarNotificacao(dest, `Atrasado: ${row.etapa_label}`, `${row.etapa_label} — ${row.ciclo_ref}`, 'atraso', row.id);
        enviadas++;
      }
    }
  }

  return res.status(200).json({ ok: true, enviadas });
}

// ── Listar notificações ───────────────────────────────────────────────────────

async function listarNotificacoes(req: VercelRequest, res: VercelResponse) {
  const url  = new URL(req.url || '/', 'http://localhost');
  const dest = url.searchParams.get('destinatario');
  if (!dest) return res.status(400).json({ error: 'destinatario required' });
  const { data, error } = await supabase
    .from('notificacoes').select('*').eq('destinatario', dest)
    .order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data: data ?? [] });
}

// ── Marcar lida ───────────────────────────────────────────────────────────────

async function marcarLida(req: VercelRequest, res: VercelResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const ids  = body.ids as string[] | undefined;
  const dest = body.destinatario as string | undefined;
  let q = supabase.from('notificacoes').update({ lida: true });
  if (ids?.length)  q = q.in('id', ids);
  else if (dest)    q = q.eq('destinatario', dest).eq('lida', false);
  else return res.status(400).json({ error: 'ids or destinatario required' });
  const { error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}

// ── Listar arquivos ───────────────────────────────────────────────────────────

async function listarArquivos(req: VercelRequest, res: VercelResponse) {
  const url  = new URL(req.url || '/', 'http://localhost');
  const wf   = url.searchParams.get('workflow');
  const dept = url.searchParams.get('dept');
  const { data, error } = await supabase
    .from('folha_confirmacoes')
    .select('*, folha_etapas_ciclo!inner(tipo_workflow, ciclo_ref, etapa_label, dept_responsavel, data_prevista)')
    .not('arquivo_url', 'is', null)
    .order('confirmado_em', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  type Arq = Record<string, unknown>;
  let results = (data ?? []) as Arq[];
  if (wf)   results = results.filter(r => (r.folha_etapas_ciclo as Arq)?.tipo_workflow === wf);
  if (dept) results = results.filter(r => (r.folha_etapas_ciclo as Arq)?.dept_responsavel === dept);
  return res.status(200).json({ data: results });
}

// ── Health ────────────────────────────────────────────────────────────────────

function health(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ status: 'ok', api: 'cr-folha-api', ts: new Date().toISOString() });
}

// ── Route table ───────────────────────────────────────────────────────────────

export const routes: Route[] = [
  { method: 'GET',  path: '/etapas',                   handler: listarEtapas    },
  { method: 'POST', path: '/etapas/:id/confirmar',      handler: confirmarEtapa  },
  { method: 'POST', path: '/etapas/:id/justificar',     handler: justificarEtapa },
  { method: 'POST', path: '/cron/gerar',                handler: cronGerar       },
  { method: 'GET',  path: '/cron/gerar',                handler: cronGerar       },
  { method: 'POST', path: '/cron/notificar',            handler: cronNotificar   },
  { method: 'GET',  path: '/cron/notificar',            handler: cronNotificar   },
  { method: 'GET',  path: '/notificacoes',               handler: listarNotificacoes },
  { method: 'POST', path: '/notificacoes/ler',           handler: marcarLida        },
  { method: 'GET',  path: '/arquivos',                   handler: listarArquivos    },
  { method: 'GET',  path: '/health',                     handler: health          },
];

// Skymail transactional email API
// Docs: https://ajuda.skymail.com.br/tutoriais/localizar-interface-api/
// Auth: Bearer token (API key from painel.skymail.net.br > Configurações > Interface API)

const SKYMAIL_API_URL  = process.env.SKYMAIL_API_URL  ?? 'https://api.skymail.net.br/v1';
const SKYMAIL_API_KEY  = process.env.SKYMAIL_API_KEY  ?? '';
const SKYMAIL_FROM     = process.env.SKYMAIL_FROM_EMAIL ?? 'sistema@coresdorio.net.br';
const SKYMAIL_FROM_NAME = process.env.SKYMAIL_FROM_NAME ?? 'Sistema Cores do Rio';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

export async function enviarEmail(payload: EmailPayload): Promise<{ ok: boolean; erro?: string }> {
  const destinatarios = Array.isArray(payload.to) ? payload.to : [payload.to];

  try {
    const res = await fetch(`${SKYMAIL_API_URL}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SKYMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from:    { email: SKYMAIL_FROM, name: SKYMAIL_FROM_NAME },
        to:      destinatarios.map(e => ({ email: e })),
        subject: payload.subject,
        html:    payload.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, erro: `HTTP ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f4f4f5; padding: 32px 16px;
`;
const CARD_STYLE = `
  background: #fff; border-radius: 12px; border: 1px solid #e4e4e7;
  max-width: 560px; margin: 0 auto; overflow: hidden;
`;
const HEADER_STYLE = `
  background: #18181b; padding: 20px 28px;
  color: #fff; font-size: 14px; font-weight: 600;
`;
const BODY_STYLE = `padding: 24px 28px; color: #3f3f46;`;
const LABEL_STYLE = `font-size: 11px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em;`;
const VALUE_STYLE = `font-size: 14px; color: #18181b; margin-top: 2px;`;
const ROW_STYLE   = `margin-bottom: 14px;`;
const FOOTER_STYLE = `border-top: 1px solid #f4f4f5; padding: 16px 28px; font-size: 11px; color: #a1a1aa;`;

function base(titulo: string, corBadge: string, conteudo: string): string {
  return `
    <div style="${BASE_STYLE}">
      <div style="${CARD_STYLE}">
        <div style="${HEADER_STYLE}">
          <span style="background:${corBadge};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;margin-right:8px;">Cores do Rio</span>
          ${titulo}
        </div>
        <div style="${BODY_STYLE}">${conteudo}</div>
        <div style="${FOOTER_STYLE}">Sistema de Gestão Cores do Rio · mensagem automática</div>
      </div>
    </div>
  `;
}

function campo(label: string, valor: string): string {
  return `<div style="${ROW_STYLE}"><div style="${LABEL_STYLE}">${label}</div><div style="${VALUE_STYLE}">${valor}</div></div>`;
}

function workflowLabel(w: string): string {
  if (w === 'pagamento_1') return 'Pagamento 1 (dia 08)';
  if (w === 'pagamento_2') return 'Pagamento 2 (dia 25)';
  return 'Passagens';
}

function deptLabel(d: string): string {
  if (d === 'dp')         return 'Departamento Pessoal';
  if (d === 'financeiro') return 'Financeiro';
  return 'Benefícios';
}

export function htmlLembrete(dias: number, etapa: {
  etapa_label: string; tipo_workflow: string; dept_responsavel: string; data_prevista: string; ciclo_ref: string;
}): string {
  const prazo = dias === 1 ? 'amanhã' : `em ${dias} dias`;
  return base(
    `Lembrete: ${etapa.etapa_label} ${prazo}`,
    dias === 1 ? '#ef4444' : '#f97316',
    `
      <p style="margin:0 0 20px;font-size:14px;">
        A etapa <strong>${etapa.etapa_label}</strong> deve ser concluída <strong>${prazo}</strong>.
      </p>
      ${campo('Workflow', workflowLabel(etapa.tipo_workflow))}
      ${campo('Departamento Responsável', deptLabel(etapa.dept_responsavel))}
      ${campo('Data Prevista', new Date(etapa.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR'))}
      ${campo('Referência', etapa.ciclo_ref)}
      <p style="margin:20px 0 0;font-size:13px;color:#71717a;">
        Ao concluir, acesse o sistema e marque a etapa como OK com o comprovante em PDF ou Excel.
      </p>
    `
  );
}

export function htmlConfirmacao(etapa: {
  etapa_label: string; tipo_workflow: string; dept_responsavel: string; ciclo_ref: string;
}, confirmado_por: string, arquivo_nome: string | null, arquivo_url: string | null): string {
  const arquivo = arquivo_url
    ? `<a href="${arquivo_url}" style="color:#f97316;">${arquivo_nome ?? 'Ver arquivo'}</a>`
    : 'Nenhum arquivo anexado';
  return base(
    `Confirmado: ${etapa.etapa_label}`,
    '#22c55e',
    `
      <p style="margin:0 0 20px;font-size:14px;">
        A etapa <strong>${etapa.etapa_label}</strong> foi marcada como concluída.
      </p>
      ${campo('Workflow', workflowLabel(etapa.tipo_workflow))}
      ${campo('Departamento', deptLabel(etapa.dept_responsavel))}
      ${campo('Confirmado por', confirmado_por)}
      ${campo('Referência', etapa.ciclo_ref)}
      ${campo('Comprovante', arquivo)}
    `
  );
}

export function htmlAtraso(etapa: {
  etapa_label: string; tipo_workflow: string; dept_responsavel: string; data_prevista: string; ciclo_ref: string;
}): string {
  return base(
    `ATRASO: ${etapa.etapa_label} não concluída`,
    '#ef4444',
    `
      <p style="margin:0 0 20px;font-size:14px;">
        A etapa <strong>${etapa.etapa_label}</strong> não foi concluída no prazo previsto.
      </p>
      ${campo('Workflow', workflowLabel(etapa.tipo_workflow))}
      ${campo('Departamento', deptLabel(etapa.dept_responsavel))}
      ${campo('Prazo era', new Date(etapa.data_prevista + 'T12:00:00').toLocaleDateString('pt-BR'))}
      ${campo('Referência', etapa.ciclo_ref)}
      <p style="margin:20px 0 0;font-size:13px;color:#ef4444;font-weight:500;">
        Acesse o sistema para registrar a justificativa do atraso.
      </p>
    `
  );
}

export function htmlJustificativa(etapa: {
  etapa_label: string; tipo_workflow: string; dept_responsavel: string; ciclo_ref: string;
}, justificado_por: string, justificativa: string): string {
  return base(
    `Justificativa de Atraso: ${etapa.etapa_label}`,
    '#8b5cf6',
    `
      <p style="margin:0 0 20px;font-size:14px;">
        Uma justificativa foi enviada para o atraso da etapa <strong>${etapa.etapa_label}</strong>.
      </p>
      ${campo('Workflow', workflowLabel(etapa.tipo_workflow))}
      ${campo('Departamento', deptLabel(etapa.dept_responsavel))}
      ${campo('Justificado por', justificado_por)}
      ${campo('Referência', etapa.ciclo_ref)}
      <div style="${ROW_STYLE}">
        <div style="${LABEL_STYLE}">Justificativa</div>
        <div style="margin-top:6px;padding:12px;background:#f4f4f5;border-radius:8px;font-size:13px;color:#3f3f46;">
          ${justificativa}
        </div>
      </div>
    `
  );
}

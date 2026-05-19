import { VercelRequest, VercelResponse } from '@vercel/node';
import type { WhatsAppWebhookPayload } from './types';

/**
 * INFRA-FUTURA: Handler do webhook de entrada da Cloud API do WhatsApp (Meta).
 *
 * Para ativar esta integração:
 *   1. Criar app no Meta for Developers com produto "WhatsApp".
 *   2. Configurar o Webhook URL em: Vercel prod URL + /whatsapp/webhook
 *   3. Adicionar env vars:
 *        WHATSAPP_VERIFY_TOKEN  — token de verificação definido no painel Meta
 *        WHATSAPP_ACCESS_TOKEN  — token permanente da Cloud API
 *        WHATSAPP_PHONE_ID      — ID do número de telefone do negócio
 *   4. Ao receber uma mensagem de justificativa:
 *        a. Identificar o pedido pelo whatsapp_thread_id ou número do encarregado.
 *        b. Atualizar pedidos_material SET justificativa = ?, status = 'excedente_aprovado'.
 *        c. Notificar gestor (e-mail ou outra mensagem WA).
 */

/** GET — verificação de webhook exigida pelo Meta na configuração inicial */
export function verificarWebhook(req: VercelRequest, res: VercelResponse) {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Forbidden' });
}

/** POST — recebe eventos de mensagens e status da Cloud API */
export async function receberWebhook(req: VercelRequest, res: VercelResponse) {
  // Meta exige resposta 200 imediata; processamento deve ser async/background
  res.status(200).send('EVENT_RECEIVED');

  const payload = req.body as WhatsAppWebhookPayload;
  if (payload.object !== 'whatsapp_business_account') return;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      for (const msg of change.value.messages ?? []) {
        if (msg.type !== 'text' || !msg.text) continue;

        const justificativa = msg.text.body.trim();
        const telefone      = msg.from;

        /**
         * INFRA-FUTURA: implementar a lógica abaixo quando a tabela
         * pedidos_material existir no Supabase.
         *
         * const { data: pedido } = await supabase
         *   .from('pedidos_material')
         *   .select('id')
         *   .eq('status', 'excedente_pendente')
         *   .eq('encarregado_telefone', telefone)
         *   .order('created_at', { ascending: false })
         *   .limit(1)
         *   .single();
         *
         * if (pedido) {
         *   await supabase
         *     .from('pedidos_material')
         *     .update({ justificativa, status: 'excedente_aprovado', updated_at: new Date() })
         *     .eq('id', pedido.id);
         * }
         */
        console.log(`[WhatsApp] Justificativa de ${telefone}: "${justificativa}"`);
      }
    }
  }
}

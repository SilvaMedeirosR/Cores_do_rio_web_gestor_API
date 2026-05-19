/**
 * INFRA-FUTURA: Tipos para o sistema de pedidos de material com integração WhatsApp.
 *
 * Fluxo planejado:
 *   1. Mestre de obra abre o app e solicita material para uma etapa/cômodo.
 *   2. Backend calcula o teto: item.rendimento_m2 × obra.m2_total_etapa.
 *      → Se dentro do teto: pedido aprovado automaticamente, baixa no estoque virtual.
 *      → Se excede o teto: fluxo de justificativa é disparado (ver abaixo).
 *   3. Quando excede:
 *      a. Sistema envia mensagem WhatsApp ao encarregado da obra via Cloud API.
 *      b. Encarregado responde com texto justificando o excedente.
 *      c. Webhook de entrada (POST /whatsapp/webhook) recebe a resposta.
 *      d. Backend grava justificativa em pedidos_material.justificativa e muda status.
 *      e. Notificação é enviada ao gestor para aprovação final (opcional).
 *   4. Todos os excedentes aprovados alimentam o gráfico de desperdício por encarregado.
 *
 * Tabelas Supabase a criar quando este módulo for ativado:
 *   - pedidos_material (ver PedidoMaterial abaixo)
 *   - itens_material: id, nome, unidade, rendimento_m2, custo_unitario, created_at
 *   - obra_etapa_m2: obra_id, etapa_id, comodo_id, m2_calculado (vem do orçamento)
 */

export type StatusPedido =
  | 'aprovado'            // dentro do teto — aprovação automática
  | 'excedente_pendente'  // ultrapassou teto, aguardando justificativa do encarregado
  | 'excedente_aprovado'  // encarregado justificou, gestor aprovou
  | 'excedente_negado';   // gestor negou o excedente

export interface PedidoMaterial {
  id:                    string;
  obra_id:               string;
  etapa_id:              string | null; // vinculado à etapa do orçamento
  comodo_id:             string | null;
  item_id:               string;
  quantidade_solicitada: number;
  quantidade_limite:     number;    // rendimento_m2 × m2_etapa no momento do pedido
  excedente:             number;    // max(0, solicitada - limite)
  excedente_valor:       number;    // excedente × custo_unitario do item
  status:                StatusPedido;
  justificativa:         string | null;
  solicitado_por:        string;    // funcionario_id do mestre de obra
  encarregado_id:        string;    // quem recebe a notificação WhatsApp
  /**
   * INFRA-FUTURA: ID da thread na Cloud API do WhatsApp.
   * Quando o webhook de resposta chegar, usa whatsapp_thread_id para correlacionar
   * a mensagem de resposta ao pedido correto sem depender do número de telefone.
   */
  whatsapp_thread_id:    string | null;
  created_at:            string;
  updated_at:            string;
}

/** Payload recebido no POST /whatsapp/webhook pela Cloud API do Meta */
export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messages?: Array<{
          id:        string;
          from:      string; // número do encarregado
          timestamp: string;
          type:      'text' | 'interactive' | 'button';
          text?:     { body: string };
        }>;
        statuses?: Array<{ id: string; status: 'sent' | 'delivered' | 'read' | 'failed' }>;
      };
      field: 'messages';
    }>;
  }>;
}

/** Mensagem enviada proativamente ao encarregado quando há excedente pendente */
export interface WhatsAppOutboundMessage {
  messaging_product: 'whatsapp';
  to:                string; // telefone do encarregado
  type:              'text';
  text: {
    body: string; // template: "Obra X — item Y ultrapassou o teto em Z un. Justifique:"
  };
}

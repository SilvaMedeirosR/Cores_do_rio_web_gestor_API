// Cliente de integração com a API do Domínio (Thomson Reuters).
//
// MODO MOCK ATIVO — todas as chamadas reais estão comentadas.
// Para ativar a integração real:
//   1. Defina as variáveis de ambiente no Vercel/local (ver abaixo)
//   2. Descomente os blocos "// [REAL]" e comente os blocos "// [MOCK]"
//   3. Remova a flag USE_MOCK ou ajuste para `false`
//
// Variáveis de ambiente necessárias (quando real):
//   DOMINIO_BASE_URL       ex: https://api.dominioatendimento.com.br/v1
//   DOMINIO_CLIENT_ID      fornecido pela Thomson Reuters
//   DOMINIO_CLIENT_SECRET  fornecido pela Thomson Reuters
//   DOMINIO_CNPJ           CNPJ da empresa sem formatação
//   DOMINIO_WEBHOOK_SECRET chave para validar o HMAC dos webhooks recebidos

import type {
  DominioListaFuncionariosResponse,
  DominioFuncionarioResponse,
  DominioS2206Payload,
  DominioS2206EnvioResponse,
  DominioEventoStatusResponse,
  DominioTokenResponse,
} from './types';

import {
  mockListaFuncionarios,
  mockGetFuncionario,
  mockEnviarS2206,
  mockStatusEvento,
  MOCK_CNPJ,
} from './mock';

// ── Configuração ───────────────────────────────────────────────────────────────

const USE_MOCK = true; // mude para `false` quando a integração real for liberada

// [REAL] const BASE_URL = process.env.DOMINIO_BASE_URL!;
// [REAL] const CNPJ     = process.env.DOMINIO_CNPJ!;

// ── Token (OAuth2 client_credentials) ─────────────────────────────────────────

// [REAL] let cachedToken: string | null = null;
// [REAL] let tokenExpiry  = 0;

// [REAL] async function getAccessToken(): Promise<string> {
// [REAL]   if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
// [REAL]
// [REAL]   const creds = Buffer.from(
// [REAL]     `${process.env.DOMINIO_CLIENT_ID}:${process.env.DOMINIO_CLIENT_SECRET}`
// [REAL]   ).toString('base64');
// [REAL]
// [REAL]   const r = await fetch(`${BASE_URL}/oauth/token`, {
// [REAL]     method: 'POST',
// [REAL]     headers: {
// [REAL]       Authorization: `Basic ${creds}`,
// [REAL]       'Content-Type': 'application/x-www-form-urlencoded',
// [REAL]     },
// [REAL]     body: 'grant_type=client_credentials&scope=folha',
// [REAL]   });
// [REAL]
// [REAL]   if (!r.ok) throw new Error(`Domínio auth error: ${r.status}`);
// [REAL]   const data: DominioTokenResponse = await r.json();
// [REAL]   cachedToken = data.access_token;
// [REAL]   tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
// [REAL]   return cachedToken;
// [REAL] }

// [REAL] async function dominioFetch<T>(
// [REAL]   path: string,
// [REAL]   options?: RequestInit,
// [REAL] ): Promise<T> {
// [REAL]   const token = await getAccessToken();
// [REAL]   const r = await fetch(`${BASE_URL}${path}`, {
// [REAL]     ...options,
// [REAL]     headers: {
// [REAL]       Authorization: `Bearer ${token}`,
// [REAL]       'Content-Type': 'application/json',
// [REAL]       ...(options?.headers ?? {}),
// [REAL]     },
// [REAL]   });
// [REAL]   if (!r.ok) {
// [REAL]     const body = await r.text();
// [REAL]     throw new Error(`Domínio API ${r.status}: ${body}`);
// [REAL]   }
// [REAL]   return r.json() as Promise<T>;
// [REAL] }

// ── Endpoints públicos do client ──────────────────────────────────────────────

/**
 * Lista todos os funcionários ativos da empresa no Domínio.
 *
 * [REAL] GET /v1/empresas/{cnpj}/funcionarios?situacao=A&pagina={pagina}&porPagina={porPagina}
 */
export async function listarFuncionariosDominio(
  pagina = 1,
  porPagina = 20,
): Promise<DominioListaFuncionariosResponse> {
  if (USE_MOCK) {
    // [MOCK] retorno fictício no formato exato do Domínio
    return mockListaFuncionarios(pagina, porPagina);
  }

  // [REAL]
  // return dominioFetch<DominioListaFuncionariosResponse>(
  //   `/empresas/${CNPJ}/funcionarios?situacao=A&pagina=${pagina}&porPagina=${porPagina}`,
  // );
  throw new Error('USE_MOCK=false mas integração real não foi ativada');
}

/**
 * Busca um funcionário específico pelo número de matrícula.
 *
 * [REAL] GET /v1/empresas/{cnpj}/funcionarios/{matricula}
 */
export async function getFuncionarioDominio(
  matricula: string,
): Promise<DominioFuncionarioResponse> {
  if (USE_MOCK) {
    const result = mockGetFuncionario(matricula);
    if (!result.sucesso || !result.dados) {
      return { sucesso: false, dados: null as unknown as DominioFuncionarioResponse['dados'] };
    }
    return { sucesso: true, dados: result.dados };
  }

  // [REAL]
  // return dominioFetch<DominioFuncionarioResponse>(
  //   `/empresas/${CNPJ}/funcionarios/${matricula}`,
  // );
  throw new Error('USE_MOCK=false mas integração real não foi ativada');
}

/**
 * Envia um evento S-2206 (Alteração de Contrato) ao Domínio para transmissão ao eSocial.
 *
 * [REAL] POST /v1/empresas/{cnpj}/eventos/s2206
 *
 * O Domínio valida, assina e transmite o evento ao eSocial.
 * O protocolo retornado deve ser salvo em `historico_contratos.protocolo_dominio`.
 */
export async function enviarS2206(
  payload: DominioS2206Payload,
): Promise<DominioS2206EnvioResponse> {
  if (USE_MOCK) {
    // [MOCK] simula aceite imediato pelo Domínio
    return mockEnviarS2206(payload.matricula);
  }

  // [REAL]
  // return dominioFetch<DominioS2206EnvioResponse>(
  //   `/empresas/${CNPJ}/eventos/s2206`,
  //   { method: 'POST', body: JSON.stringify(payload) },
  // );
  throw new Error('USE_MOCK=false mas integração real não foi ativada');
}

/**
 * Consulta o status de processamento de um evento enviado ao Domínio.
 *
 * [REAL] GET /v1/empresas/{cnpj}/eventos/{protocolo}
 */
export async function consultarStatusEvento(
  protocolo: string,
): Promise<DominioEventoStatusResponse> {
  if (USE_MOCK) {
    return mockStatusEvento(protocolo);
  }

  // [REAL]
  // return dominioFetch<DominioEventoStatusResponse>(
  //   `/empresas/${CNPJ}/eventos/${protocolo}`,
  // );
  throw new Error('USE_MOCK=false mas integração real não foi ativada');
}

/**
 * Valida a assinatura HMAC de um webhook recebido do Domínio.
 * Deve ser chamado antes de processar qualquer payload de webhook.
 *
 * [REAL] Header: X-Dominio-Signature: sha256={hex}
 */
export function validarWebhookDominio(
  rawBody: string,
  signatureHeader: string | undefined,
): boolean {
  if (USE_MOCK) {
    // [MOCK] aceita qualquer payload em modo de desenvolvimento
    return true;
  }

  // [REAL]
  // import { createHmac } from 'crypto';
  // const secret = process.env.DOMINIO_WEBHOOK_SECRET!;
  // const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  // return signatureHeader === expected;
  return false;
}

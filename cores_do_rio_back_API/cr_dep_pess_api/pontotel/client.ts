import { PontotelFuncionario, PontotelListResponse, PontotelLoginResponse } from './types';
import { MOCK_FUNCIONARIOS } from './mock';

const BASE_URL    = 'https://apis.pontotel.com.br/pontotel/api/v4';
const USE_MOCK    = process.env.PONTOTEL_MOCK !== 'false';

async function getToken(): Promise<string> {
  const email = process.env.PONTOTEL_EMAIL ?? '';
  const senha = process.env.PONTOTEL_SENHA ?? '';

  const res = await fetch(`${BASE_URL}/login/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, senha }),
  });

  const json = (await res.json()) as PontotelLoginResponse;

  if (!res.ok || !json.access_token || json.access_token.includes('inválido')) {
    throw new Error(`PontoTel login falhou: ${json.access_token ?? res.status}`);
  }

  return json.access_token;
}

export async function listarFuncionarios(): Promise<PontotelFuncionario[]> {
  if (USE_MOCK) return MOCK_FUNCIONARIOS;

  const token = await getToken();

  // Percorre paginação enquanto houver "next"
  const funcionarios: PontotelFuncionario[] = [];
  let url: string | null = `${BASE_URL}/employees/`;

  while (url) {
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`PontoTel /employees/ retornou ${res.status}`);
    const json = (await res.json()) as PontotelListResponse;
    funcionarios.push(...json.results);
    url = json.next;
  }

  return funcionarios;
}

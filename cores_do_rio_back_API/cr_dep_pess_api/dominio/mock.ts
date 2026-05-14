// Dados fictícios no formato EXATO da API do Domínio (Thomson Reuters).
// Empresa fictícia: Cores do Rio Construções Ltda — CNPJ 12.345.678/0001-99
// CPFs e PIS são inválidos propositalmente (uso de teste).
// Substitua esta importação pelo client real quando a integração for liberada.

import type {
  DominioFuncionario,
  DominioListaFuncionariosResponse,
  DominioS2206EnvioResponse,
  DominioEventoStatusResponse,
} from './types';

export const MOCK_CNPJ = '12.345.678/0001-99';
export const MOCK_CODIGO_EMPRESA = '0001';

// ── Funcionários ───────────────────────────────────────────────────────────────

export const MOCK_FUNCIONARIOS: DominioFuncionario[] = [
  {
    codigoEmpresa:    '0001',
    cnpjEmpresa:      '12.345.678/0001-99',
    matricula:        '000001',
    nomeFuncionario:  'JOSE ANTONIO DA SILVA',
    cpf:              '111.222.333-00',
    pisPasep:         '111.22222.33-0',
    dataNascimento:   '1985-03-15',
    dataAdmissao:     '2020-01-02',
    dataDesligamento: null,
    situacao:         'A',
    codigoCargo:      '001',
    descricaoCargo:   'PEDREIRO',
    codigoCBO:        '711205',
    descricaoCBO:     'Pedreiro',
    remuneracao: {
      salarioBase: 2500.00,
      tipoSalario: 'M',
      competencia: '2026-04',
    },
    jornada: {
      horaEntrada: '07:00',
      horaSaida:   '17:00',
      diasSemana:  [1, 2, 3, 4, 5],
      tipoJornada: '1',
    },
    tipoContrato:        'I',
    dataTerminoContrato: null,
    grauInstrucao:       '05', // fundamental_completo
    adicionais: {
      periculosidade: false,
      insalubridade:  '00',
    },
    endereco: {
      cep:             '20040-020',
      logradouro:      'Rua Primeiro de Março',
      numero:          '25',
      complemento:     'Ap 101',
      bairro:          'Centro',
      municipio:       'Rio de Janeiro',
      codigoMunicipio: '3304557',
      uf:              'RJ',
    },
    contatos: {
      email:    'jose.silva@email.com',
      telefone: '2132221111',
      celular:  '21999998888',
    },
    eSocial: {
      statusS2200: 'aprovado',
      reciboS2200: '1.1.1234567890123456789',
      pendencias:  [],
    },
  },
  {
    codigoEmpresa:    '0001',
    cnpjEmpresa:      '12.345.678/0001-99',
    matricula:        '000002',
    nomeFuncionario:  'MARIA APARECIDA SOUZA',
    cpf:              '222.333.444-00',
    pisPasep:         '222.33333.44-0',
    dataNascimento:   '1990-07-22',
    dataAdmissao:     '2021-03-15',
    dataDesligamento: null,
    situacao:         'A',
    codigoCargo:      '002',
    descricaoCargo:   'SERVENTE DE OBRAS',
    codigoCBO:        '717020',
    descricaoCBO:     'Servente de obras',
    remuneracao: {
      salarioBase: 1802.00,
      tipoSalario: 'M',
      competencia: '2026-04',
    },
    jornada: {
      horaEntrada: '07:00',
      horaSaida:   '16:00',
      diasSemana:  [1, 2, 3, 4, 5, 6],
      tipoJornada: '1',
    },
    tipoContrato:        'I',
    dataTerminoContrato: null,
    grauInstrucao:       '07', // medio_completo
    adicionais: {
      periculosidade: false,
      insalubridade:  '01', // mínimo 10%
    },
    endereco: {
      cep:             '23070-000',
      logradouro:      'Rua das Acácias',
      numero:          '142',
      complemento:     null,
      bairro:          'Campo Grande',
      municipio:       'Rio de Janeiro',
      codigoMunicipio: '3304557',
      uf:              'RJ',
    },
    contatos: {
      email:    null,
      telefone: '2133334444',
      celular:  '21977776666',
    },
    eSocial: {
      statusS2200: 'aprovado',
      reciboS2200: '1.1.9876543210987654321',
      pendencias:  [],
    },
  },
  {
    codigoEmpresa:    '0001',
    cnpjEmpresa:      '12.345.678/0001-99',
    matricula:        '000003',
    nomeFuncionario:  'CARLOS EDUARDO FERREIRA',
    cpf:              '333.444.555-00',
    pisPasep:         '333.44444.55-0',
    dataNascimento:   '1978-11-05',
    dataAdmissao:     '2019-08-01',
    dataDesligamento: null,
    situacao:         'A',
    codigoCargo:      '003',
    descricaoCargo:   'ENCARREGADO DE OBRAS',
    codigoCBO:        '710105',
    descricaoCBO:     'Encarregado geral de obras',
    remuneracao: {
      salarioBase: 4200.00,
      tipoSalario: 'M',
      competencia: '2026-04',
    },
    jornada: {
      horaEntrada: '07:00',
      horaSaida:   '17:00',
      diasSemana:  [1, 2, 3, 4, 5],
      tipoJornada: '1',
    },
    tipoContrato:        'I',
    dataTerminoContrato: null,
    grauInstrucao:       '08', // superior_incompleto
    adicionais: {
      periculosidade: false,
      insalubridade:  '00',
    },
    endereco: {
      cep:             '21360-240',
      logradouro:      'Estrada do Tindiba',
      numero:          '305',
      complemento:     'Casa 2',
      bairro:          'Pechincha',
      municipio:       'Rio de Janeiro',
      codigoMunicipio: '3304557',
      uf:              'RJ',
    },
    contatos: {
      email:    'carlos.ferreira@coresrio.com.br',
      telefone: '2134445555',
      celular:  '21988887777',
    },
    eSocial: {
      statusS2200: 'aprovado',
      reciboS2200: '1.1.1111222233334444555',
      pendencias:  [],
    },
  },
  {
    codigoEmpresa:    '0001',
    cnpjEmpresa:      '12.345.678/0001-99',
    matricula:        '000004',
    nomeFuncionario:  'LUCAS MARQUES OLIVEIRA',
    cpf:              '444.555.666-00',
    pisPasep:         '444.55555.66-0',
    dataNascimento:   '1998-02-14',
    dataAdmissao:     '2026-02-01',
    dataDesligamento: null,
    situacao:         'A',
    codigoCargo:      '004',
    descricaoCargo:   'PINTOR DE OBRAS',
    codigoCBO:        '715515',
    descricaoCBO:     'Pintor de obras',
    remuneracao: {
      salarioBase: 2100.00,
      tipoSalario: 'M',
      competencia: '2026-04',
    },
    jornada: {
      horaEntrada: '08:00',
      horaSaida:   '17:00',
      diasSemana:  [1, 2, 3, 4, 5],
      tipoJornada: '1',
    },
    tipoContrato:        'D', // contrato determinado (experiência)
    dataTerminoContrato: '2026-07-31',
    grauInstrucao:       '07', // medio_completo
    adicionais: {
      periculosidade: false,
      insalubridade:  '02', // médio 20%
    },
    endereco: {
      cep:             '22793-080',
      logradouro:      'Rua Aroazes',
      numero:          '50',
      complemento:     'Bloco B, Ap 201',
      bairro:          'Jacarepaguá',
      municipio:       'Rio de Janeiro',
      codigoMunicipio: '3304557',
      uf:              'RJ',
    },
    contatos: {
      email:    'lucas.oliveira@email.com',
      telefone: null,
      celular:  '21966665555',
    },
    eSocial: {
      statusS2200: 'aprovado',
      reciboS2200: '1.1.5555666677778888999',
      pendencias:  [],
    },
  },
  {
    codigoEmpresa:    '0001',
    cnpjEmpresa:      '12.345.678/0001-99',
    matricula:        '000005',
    nomeFuncionario:  'ANDERSON RODRIGUES LIMA',
    cpf:              '555.666.777-00',
    pisPasep:         '555.66666.77-0',
    dataNascimento:   '1982-09-30',
    dataAdmissao:     '2022-06-13',
    dataDesligamento: null,
    situacao:         'A',
    codigoCargo:      '005',
    descricaoCargo:   'ELETRICISTA DE OBRAS',
    codigoCBO:        '715110',
    descricaoCBO:     'Eletricista de obras',
    remuneracao: {
      salarioBase: 3100.00,
      tipoSalario: 'M',
      competencia: '2026-04',
    },
    jornada: {
      horaEntrada: '07:00',
      horaSaida:   '16:00',
      diasSemana:  [1, 2, 3, 4, 5],
      tipoJornada: '1',
    },
    tipoContrato:        'I',
    dataTerminoContrato: null,
    grauInstrucao:       '08', // superior_incompleto
    adicionais: {
      periculosidade: true,  // adicional de periculosidade
      insalubridade:  '00',
    },
    endereco: {
      cep:             '21530-010',
      logradouro:      'Rua Professor Gabizo',
      numero:          '78',
      complemento:     null,
      bairro:          'Méier',
      municipio:       'Rio de Janeiro',
      codigoMunicipio: '3304557',
      uf:              'RJ',
    },
    contatos: {
      email:    'anderson.lima@email.com',
      telefone: '2135556666',
      celular:  '21955554444',
    },
    eSocial: {
      statusS2200: 'aprovado',
      reciboS2200: '1.1.9999888877776666555',
      pendencias:  [],
    },
  },
];

// ── Helpers para montar respostas no formato do Domínio ───────────────────────

export function mockListaFuncionarios(
  pagina = 1,
  porPagina = 20,
): DominioListaFuncionariosResponse {
  const inicio = (pagina - 1) * porPagina;
  const dados  = MOCK_FUNCIONARIOS.slice(inicio, inicio + porPagina);
  return {
    sucesso:      true,
    dados,
    total:        MOCK_FUNCIONARIOS.length,
    pagina,
    totalPaginas: Math.ceil(MOCK_FUNCIONARIOS.length / porPagina),
  };
}

export function mockGetFuncionario(
  matricula: string,
): { sucesso: boolean; dados?: DominioFuncionario; mensagem?: string } {
  const func = MOCK_FUNCIONARIOS.find(f => f.matricula === matricula);
  if (!func) return { sucesso: false, mensagem: `Matrícula ${matricula} não encontrada` };
  return { sucesso: true, dados: func };
}

// Simula o envio de um evento S-2206 ao Domínio
export function mockEnviarS2206(
  matricula: string,
): DominioS2206EnvioResponse {
  const protocolo = `S2206-${new Date().toISOString().slice(0, 7)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return {
    sucesso:         true,
    protocolo,
    status:          'recebido',
    mensagem:        `Evento S-2206 para matrícula ${matricula} recebido e em processamento`,
    previsaoRetorno: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  };
}

// Simula consulta de status de um evento já enviado
export function mockStatusEvento(protocolo: string): DominioEventoStatusResponse {
  // Em produção: GET /v1/empresas/{cnpj}/eventos/{protocolo}
  return {
    protocolo,
    tipoEvento:        'S-2206',
    status:            'aprovado',
    recibo:            `1.2.${Date.now()}`,
    dataProcessamento: new Date().toISOString(),
    ocorrencias:       [],
  };
}

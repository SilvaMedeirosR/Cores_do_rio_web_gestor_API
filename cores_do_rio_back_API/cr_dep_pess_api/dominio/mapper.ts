// Converte o formato da API do Domínio para o schema do nosso banco (Supabase).
// Centralizar aqui garante que qualquer ajuste de campo não se propague pelas rotas.

import type { DominioFuncionario, DominioS2206Payload } from './types';

// ── Tabelas de conversão ───────────────────────────────────────────────────────

const GRAU_INSTRUCAO: Record<string, string> = {
  '01': 'fundamental_incompleto', // analfabeto / até 5ª incompleto
  '02': 'fundamental_incompleto',
  '03': 'fundamental_incompleto',
  '04': 'fundamental_incompleto',
  '05': 'fundamental_completo',
  '06': 'medio_incompleto',
  '07': 'medio_completo',
  '08': 'superior_incompleto',
  '09': 'superior_completo',
  '10': 'pos_graduacao',
  '11': 'mestrado',
  '12': 'doutorado',
};

const TIPO_SALARIO: Record<string, string> = {
  M: 'mes',
  H: 'hora',
  D: 'dia',
};

const INSALUBRIDADE: Record<string, string> = {
  '00': '',
  '01': 'minimo',
  '02': 'medio',
  '03': 'maximo',
};

// [1,2,3,4,5] → "segunda,terca,quarta,quinta,sexta"
const DIA_NUM_TO_SLUG: Record<number, string> = {
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado',
  7: 'domingo',
};

// ── Funcionário: Domínio → banco ──────────────────────────────────────────────

export interface FuncionarioPayload {
  nome:                     string;
  cpf:                      string | null;
  nis:                      string | null;
  data_nascimento:          string | null;
  cep:                      string | null;
  logradouro:               string | null;
  numero_end:               string | null;
  complemento:              string | null;
  bairro:                   string | null;
  municipio:                string | null;
  uf:                       string | null;
  email:                    string | null;
  telefone:                 string | null;
  escolaridade:             string | null;
  cargo:                    string | null;
  matricula:                string | null;
  cbo:                      string | null;
  cbo_descricao:            string | null;
  tipo_contrato:            string;
  data_admissao:            string | null;
  data_fim_contrato:        string | null;
  horario_entrada:          string | null;
  horario_saida:            string | null;
  dias_trabalho:            string | null;
  salario:                  number | null;
  unidade_pagamento:        string;
  adicional_periculosidade: boolean;
  adicional_insalubridade:  string | null;
  status:                   string;
}

export function dominioToFuncionario(d: DominioFuncionario): FuncionarioPayload {
  const cpfLimpo = d.cpf.replace(/\D/g, '');
  const pisLimpo = d.pisPasep ? d.pisPasep.replace(/\D/g, '') : null;
  const telPrincipal = d.contatos.celular
    ? d.contatos.celular.replace(/\D/g, '')
    : d.contatos.telefone
    ? d.contatos.telefone.replace(/\D/g, '')
    : null;

  const diasSemana = d.jornada.diasSemana
    .map(n => DIA_NUM_TO_SLUG[n])
    .filter(Boolean)
    .join(',') || null;

  return {
    nome:                     d.nomeFuncionario,
    cpf:                      cpfLimpo || null,
    nis:                      pisLimpo,
    data_nascimento:          d.dataNascimento || null,
    cep:                      d.endereco.cep.replace(/\D/g, '') || null,
    logradouro:               d.endereco.logradouro || null,
    numero_end:               d.endereco.numero || null,
    complemento:              d.endereco.complemento || null,
    bairro:                   d.endereco.bairro || null,
    municipio:                d.endereco.municipio || null,
    uf:                       d.endereco.uf || null,
    email:                    d.contatos.email || null,
    telefone:                 telPrincipal,
    escolaridade:             GRAU_INSTRUCAO[d.grauInstrucao] ?? null,
    cargo:                    d.descricaoCargo || null,
    matricula:                d.matricula,
    cbo:                      d.codigoCBO || null,
    cbo_descricao:            d.descricaoCBO || null,
    tipo_contrato:            d.tipoContrato === 'D' ? 'determinado' : 'indeterminado',
    data_admissao:            d.dataAdmissao || null,
    data_fim_contrato:        d.dataTerminoContrato || null,
    horario_entrada:          d.jornada.horaEntrada || null,
    horario_saida:            d.jornada.horaSaida || null,
    dias_trabalho:            diasSemana,
    salario:                  d.remuneracao.salarioBase ?? null,
    unidade_pagamento:        TIPO_SALARIO[d.remuneracao.tipoSalario] ?? 'mes',
    adicional_periculosidade: d.adicionais.periculosidade,
    adicional_insalubridade:  INSALUBRIDADE[d.adicionais.insalubridade] ?? null,
    status:                   d.situacao === 'A' ? 'ativo' : 'inativo',
  };
}

// ── S-2206: nosso banco → payload do Domínio ──────────────────────────────────

const MOTIVO_TO_DOMINIO: Record<string, '01' | '02' | '03' | '04'> = {
  reajuste:      '01',
  dissidio:      '02',
  promocao:      '03',
  enquadramento: '04',
};

const UNID_TO_DOMINIO: Record<string, 'M' | 'H' | 'D'> = {
  mes:  'M',
  hora: 'H',
  dia:  'D',
};

const SLUG_TO_DIA_NUM: Record<string, number> = {
  segunda: 1, terca: 2, quarta: 3, quinta: 4,
  sexta: 5, sabado: 6, domingo: 7,
};

export interface AlteracaoParams {
  matricula:      string;
  cpf:            string;
  tipo_evento:    string;
  motivo:         string | null;
  data_alteracao: string;
  competencia:    string;
  observacoes:    string | null;
  novos:          Record<string, unknown>;
}

export function alteracaoToDominioS2206(p: AlteracaoParams): DominioS2206Payload {
  const base: DominioS2206Payload = {
    matricula:   p.matricula,
    cpf:         p.cpf,
    dtAlteracao: p.data_alteracao,
    competencia: p.competencia,
    observacoes: p.observacoes ?? undefined,
  };

  if (p.tipo_evento === 'alteracao_salario') {
    base.novaRemuneracao = {
      vrSalFx:    Number(p.novos.salario),
      undSalFixo: UNID_TO_DOMINIO[String(p.novos.unidade_pagamento ?? 'mes')] ?? 'M',
      dscSalVar:  MOTIVO_TO_DOMINIO[p.motivo ?? ''] ?? '01',
    };
  }

  if (p.tipo_evento === 'mudanca_cargo') {
    base.novoCargo = {
      codigoCargo:    String(p.novos.cargo ?? ''),
      descricaoCargo: String(p.novos.cargo ?? ''),
      codigoCBO:      String(p.novos.cbo ?? ''),
      descricaoCBO:   String(p.novos.cbo_descricao ?? ''),
    };
  }

  if (p.tipo_evento === 'alteracao_jornada') {
    const diasStr = String(p.novos.dias_trabalho ?? '');
    base.novaJornada = {
      horaEntrada: String(p.novos.horario_entrada ?? ''),
      horaSaida:   String(p.novos.horario_saida ?? ''),
      diasSemana:  diasStr.split(',').map(s => SLUG_TO_DIA_NUM[s.trim()]).filter(Boolean),
    };
  }

  if (p.tipo_evento === 'alteracao_tipo_contrato') {
    base.novoContrato = {
      tipoContrato:        p.novos.tipo_contrato === 'determinado' ? 'D' : 'I',
      dataTerminoContrato: (p.novos.data_fim_contrato as string | null) ?? null,
    };
  }

  return base;
}

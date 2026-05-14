// Tipos que espelham exatamente o contrato da API REST do Domínio (Thomson Reuters)
// Referência: Domínio Folha de Pagamento — API eSocial v3.x
// Quando a integração real for ativada, estes tipos garantem que o mapper não quebre.

// ── Autenticação ───────────────────────────────────────────────────────────────

export interface DominioTokenResponse {
  access_token: string;
  token_type:   'Bearer';
  expires_in:   number;   // segundos
}

// ── Listagem / detalhe de funcionário ─────────────────────────────────────────

export interface DominioJornada {
  horaEntrada: string;         // "07:00"
  horaSaida:   string;         // "17:00"
  diasSemana:  number[];       // [1,2,3,4,5] — 1=seg … 7=dom
  tipoJornada: string;         // "1"=normal "2"=parcial "3"=livre
}

export interface DominioEndereco {
  cep:             string;     // "20040-020"
  logradouro:      string;
  numero:          string;
  complemento:     string | null;
  bairro:          string;
  municipio:       string;
  codigoMunicipio: string;     // código IBGE do município
  uf:              string;     // "RJ"
}

export interface DominioRemuneracao {
  salarioBase: number;
  tipoSalario: 'M' | 'H' | 'D'; // M=mensalista H=horista D=diarista
  competencia: string;           // "YYYY-MM"
}

export interface DominioAdicionais {
  periculosidade: boolean;
  insalubridade:  '00' | '01' | '02' | '03'; // 00=nenhum 01=mín 02=méd 03=máx
}

export interface DominioEsocialStatus {
  statusS2200: 'pendente' | 'enviado' | 'processando' | 'aprovado' | 'rejeitado';
  reciboS2200: string | null;
  pendencias:  string[];
}

export interface DominioFuncionario {
  codigoEmpresa:       string;
  cnpjEmpresa:         string;
  matricula:           string;        // "000001"
  nomeFuncionario:     string;
  cpf:                 string;        // "123.456.789-01"
  pisPasep:            string | null; // "123.45678.90-1"
  dataNascimento:      string;        // "YYYY-MM-DD"
  dataAdmissao:        string;        // "YYYY-MM-DD"
  dataDesligamento:    string | null;
  situacao:            'A' | 'D' | 'F' | 'L'; // A=ativo D=desligado F=férias L=licença
  codigoCargo:         string;
  descricaoCargo:      string;
  codigoCBO:           string;        // 6 dígitos
  descricaoCBO:        string;
  remuneracao:         DominioRemuneracao;
  jornada:             DominioJornada;
  tipoContrato:        'I' | 'D';    // I=indeterminado D=determinado
  dataTerminoContrato: string | null;
  grauInstrucao:       string;        // "01"–"12" — tabela abaixo
  adicionais:          DominioAdicionais;
  endereco:            DominioEndereco;
  contatos: {
    email:    string | null;
    telefone: string | null; // apenas dígitos
    celular:  string | null;
  };
  eSocial: DominioEsocialStatus;
}

// grauInstrucao: "01"=analfabeto "02"="até 5ª incompleto" "03"="5ª completo"
//   "04"="6ª a 9ª" "05"=fundamental_completo "06"=medio_incompleto
//   "07"=medio_completo "08"=superior_incompleto "09"=superior_completo
//   "10"=pos_graduacao "11"=mestrado "12"=doutorado

export interface DominioListaFuncionariosResponse {
  sucesso:      boolean;
  dados:        DominioFuncionario[];
  total:        number;
  pagina:       number;
  totalPaginas: number;
}

export interface DominioFuncionarioResponse {
  sucesso: boolean;
  dados:   DominioFuncionario;
}

// ── Envio de evento S-2206 ─────────────────────────────────────────────────────

// dscSalVar (motivo da alteração salarial):
//   "01"=reajuste "02"=dissidio "03"=promocao "04"=enquadramento

export interface DominioS2206Payload {
  matricula:     string;
  cpf:           string;
  dtAlteracao:   string;       // "YYYY-MM-DD"
  competencia:   string;       // "YYYY-MM"
  // Pelo menos um dos blocos abaixo deve estar presente
  novaRemuneracao?: {
    vrSalFx:    number;
    undSalFixo: 'M' | 'H' | 'D';
    dscSalVar:  '01' | '02' | '03' | '04';
  };
  novoCargo?: {
    codigoCargo:   string;
    descricaoCargo: string;
    codigoCBO:     string;
    descricaoCBO:  string;
  };
  novaJornada?: {
    horaEntrada: string;
    horaSaida:   string;
    diasSemana:  number[];
  };
  novoContrato?: {
    tipoContrato:        'I' | 'D';
    dataTerminoContrato: string | null;
  };
  observacoes?: string;
}

export interface DominioS2206EnvioResponse {
  sucesso:          boolean;
  protocolo:        string;   // "S2206-2026-05-ABC123"
  status:           'recebido' | 'processando' | 'aprovado' | 'rejeitado';
  mensagem:         string;
  previsaoRetorno:  string;   // ISO 8601
}

// ── Consulta de status de evento ──────────────────────────────────────────────

export interface DominioOcorrencia {
  codigo:    string;
  descricao: string;
  tipo:      'aviso' | 'erro';
}

export interface DominioEventoStatusResponse {
  protocolo:          string;
  tipoEvento:         string;   // "S-2206"
  status:             'recebido' | 'processando' | 'aprovado' | 'rejeitado';
  recibo:             string | null;
  dataProcessamento:  string | null;
  ocorrencias:        DominioOcorrencia[];
}

// ── Webhook recebido do Domínio ────────────────────────────────────────────────

export interface DominioWebhookPayload {
  evento:    string;           // "S-2206"
  protocolo: string;
  status:    'aprovado' | 'rejeitado';
  recibo:    string | null;
  ocorrencias: DominioOcorrencia[];
  timestamp: string;           // ISO 8601
}

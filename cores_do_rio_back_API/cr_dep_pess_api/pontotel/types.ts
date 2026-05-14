export interface PontotelLoginResponse {
  access_token: string;
}

export interface PontotelFuncionario {
  id:           string;
  nome:         string;
  cpf:          string | null;
  matricula:    string | null;
  cargo:        string | null;
  departamento: string | null;
  email:        string | null;
  status:       "ativo" | "inativo" | string;
  data_admissao: string | null;
}

export interface PontotelListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  PontotelFuncionario[];
}

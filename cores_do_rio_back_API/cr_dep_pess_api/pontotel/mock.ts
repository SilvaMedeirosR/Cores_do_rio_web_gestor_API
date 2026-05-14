import { PontotelFuncionario } from './types';

export const MOCK_FUNCIONARIOS: PontotelFuncionario[] = [
  { id: 'pt-001', nome: 'João Carlos Silva',       cpf: '123.456.789-00', matricula: '001', cargo: 'Pintor',                  departamento: 'Obras',       email: 'joao.silva@coresdorio.net.br',       status: 'ativo',   data_admissao: '2022-03-01' },
  { id: 'pt-002', nome: 'Maria Aparecida Santos',  cpf: '234.567.890-11', matricula: '002', cargo: 'Auxiliar Administrativo', departamento: 'Escritório',  email: 'maria.santos@coresdorio.net.br',      status: 'ativo',   data_admissao: '2021-08-15' },
  { id: 'pt-003', nome: 'Pedro Henrique Lima',     cpf: '345.678.901-22', matricula: '003', cargo: 'Pedreiro',               departamento: 'Obras',       email: 'pedro.lima@coresdorio.net.br',        status: 'ativo',   data_admissao: '2023-01-10' },
  { id: 'pt-004', nome: 'Ana Paula Ferreira',      cpf: '456.789.012-33', matricula: '004', cargo: 'Azulejista',             departamento: 'Obras',       email: 'ana.ferreira@coresdorio.net.br',      status: 'ativo',   data_admissao: '2022-11-20' },
  { id: 'pt-005', nome: 'Carlos Eduardo Rocha',    cpf: '567.890.123-44', matricula: '005', cargo: 'Eletricista',            departamento: 'Instalações', email: 'carlos.rocha@coresdorio.net.br',      status: 'ativo',   data_admissao: '2020-05-03' },
  { id: 'pt-006', nome: 'Fernanda Oliveira Costa', cpf: '678.901.234-55', matricula: '006', cargo: 'Gesseiro',               departamento: 'Obras',       email: 'fernanda.costa@coresdorio.net.br',    status: 'inativo', data_admissao: '2021-02-14' },
  { id: 'pt-007', nome: 'Rodrigo Alves Mendes',   cpf: '789.012.345-66', matricula: '007', cargo: 'Encanador',              departamento: 'Instalações', email: 'rodrigo.mendes@coresdorio.net.br',    status: 'ativo',   data_admissao: '2023-06-01' },
  { id: 'pt-008', nome: 'Luciana Brito Teixeira',  cpf: '890.123.456-77', matricula: '008', cargo: 'Almoxarife',             departamento: 'Logística',   email: 'luciana.teixeira@coresdorio.net.br',  status: 'ativo',   data_admissao: '2022-07-18' },
];

-- Migration: Criacao das tabelas do projeto Cores do Rio
-- Executar via: supabase db push

-- Tabela: Compras
CREATE TABLE IF NOT EXISTS compras (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  item        TEXT         NOT NULL,
  quantidade  INTEGER      NOT NULL DEFAULT 1,
  valor       NUMERIC(10,2) NOT NULL,
  status      TEXT         NOT NULL DEFAULT 'pendente',
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Tabela: Funcionarios (Departamento Pessoal)
CREATE TABLE IF NOT EXISTS funcionarios (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  nome          TEXT          NOT NULL,
  cpf           TEXT          UNIQUE,
  cargo         TEXT          NOT NULL,
  salario       NUMERIC(10,2),
  data_admissao DATE,
  status        TEXT          NOT NULL DEFAULT 'ativo',
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- Tabela: Lancamentos Financeiros
CREATE TABLE IF NOT EXISTS lancamentos (
  id         UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao  TEXT          NOT NULL,
  valor      NUMERIC(10,2) NOT NULL,
  tipo       TEXT          NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria  TEXT,
  data       DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ   DEFAULT NOW()
);

-- Tabela: Orcamentos
CREATE TABLE IF NOT EXISTS orcamentos (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo      TEXT          NOT NULL,
  descricao   TEXT,
  valor_total NUMERIC(10,2) NOT NULL,
  status      TEXT          NOT NULL DEFAULT 'rascunho',
  validade    DATE,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);
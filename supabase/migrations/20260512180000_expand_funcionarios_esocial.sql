-- Expand funcionarios table for eSocial compliance (Camadas Cadastral, Contratual, Remuneratória)

-- Camada 1: Dados Cadastrais
ALTER TABLE funcionarios
  ADD COLUMN IF NOT EXISTS nis             TEXT,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS cep             TEXT,
  ADD COLUMN IF NOT EXISTS logradouro      TEXT,
  ADD COLUMN IF NOT EXISTS numero_end      TEXT,
  ADD COLUMN IF NOT EXISTS complemento     TEXT,
  ADD COLUMN IF NOT EXISTS bairro          TEXT,
  ADD COLUMN IF NOT EXISTS municipio       TEXT,
  ADD COLUMN IF NOT EXISTS uf              TEXT,
  ADD COLUMN IF NOT EXISTS email           TEXT,
  ADD COLUMN IF NOT EXISTS telefone        TEXT,
  ADD COLUMN IF NOT EXISTS escolaridade    TEXT;

-- Camada 2: Dados Contratuais
ALTER TABLE funcionarios
  ADD COLUMN IF NOT EXISTS matricula         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS cbo               TEXT,
  ADD COLUMN IF NOT EXISTS cbo_descricao     TEXT,
  ADD COLUMN IF NOT EXISTS tipo_contrato     TEXT DEFAULT 'indeterminado',
  ADD COLUMN IF NOT EXISTS data_fim_contrato DATE,
  ADD COLUMN IF NOT EXISTS horario_entrada   TEXT,
  ADD COLUMN IF NOT EXISTS horario_saida     TEXT,
  ADD COLUMN IF NOT EXISTS dias_trabalho     TEXT;

-- Camada 3: Dados Remuneratórios
ALTER TABLE funcionarios
  ADD COLUMN IF NOT EXISTS unidade_pagamento        TEXT DEFAULT 'mes',
  ADD COLUMN IF NOT EXISTS adicional_periculosidade BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS adicional_insalubridade  TEXT;

-- Torna cargo opcional (CBO assume papel principal de classificação)
ALTER TABLE funcionarios ALTER COLUMN cargo DROP NOT NULL;

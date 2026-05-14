-- Histórico imutável de alterações contratuais (eSocial S-2206)

CREATE TABLE IF NOT EXISTS historico_contratos (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id   UUID         NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,

  -- Metadados do evento S-2206
  tipo_evento      TEXT         NOT NULL,  -- 'alteracao_salario' | 'mudanca_cargo' | 'alteracao_jornada' | 'alteracao_tipo_contrato'
  motivo           TEXT,                   -- 'reajuste' | 'dissidio' | 'promocao' | 'enquadramento' | etc.
  data_alteracao   DATE         NOT NULL,  -- dtAlteracao do S-2206
  competencia      TEXT         NOT NULL,  -- 'YYYY-MM' — mês de referência
  prazo_esocial    DATE         NOT NULL,  -- 15º dia do mês subsequente
  observacoes      TEXT,

  -- Snapshot do antes/depois (alimenta o Domínio para montar o XML do S-2206)
  campos_alterados JSONB        NOT NULL,  -- { "de": {...}, "para": {...} }

  -- Rastreamento do envio ao eSocial via Domínio
  status_esocial   TEXT         NOT NULL DEFAULT 'pendente',  -- 'pendente' | 'enviado' | 'aprovado' | 'rejeitado'
  protocolo_dominio TEXT,                  -- número de protocolo retornado pelo Domínio

  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS historico_contratos_funcionario_idx
  ON historico_contratos(funcionario_id, data_alteracao DESC);

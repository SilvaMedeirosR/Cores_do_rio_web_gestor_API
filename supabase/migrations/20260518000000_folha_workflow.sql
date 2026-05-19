-- Migration: Sistema de Workflow de Folha de Pagamento e Passagens

CREATE TABLE IF NOT EXISTS folha_etapas_ciclo (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_workflow    TEXT        NOT NULL CHECK (tipo_workflow IN ('pagamento_1', 'pagamento_2', 'passagens')),
  ciclo_ref        TEXT        NOT NULL,
  etapa_nome       TEXT        NOT NULL,
  etapa_label      TEXT        NOT NULL,
  dept_responsavel TEXT        NOT NULL CHECK (dept_responsavel IN ('dp', 'financeiro', 'beneficios')),
  data_prevista    DATE        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido', 'atrasado')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tipo_workflow, ciclo_ref, etapa_nome, dept_responsavel)
);

CREATE TABLE IF NOT EXISTS folha_confirmacoes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id        UUID        NOT NULL REFERENCES folha_etapas_ciclo(id) ON DELETE CASCADE,
  confirmado_por  TEXT        NOT NULL,
  arquivo_nome    TEXT,
  arquivo_url     TEXT,
  confirmado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS folha_justificativas (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id         UUID        NOT NULL REFERENCES folha_etapas_ciclo(id) ON DELETE CASCADE,
  justificativa    TEXT        NOT NULL,
  justificado_por  TEXT        NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS folha_notificacoes_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id     UUID        REFERENCES folha_etapas_ciclo(id) ON DELETE SET NULL,
  tipo         TEXT        NOT NULL,
  destinatario TEXT        NOT NULL,
  enviado_em   TIMESTAMPTZ DEFAULT NOW(),
  sucesso      BOOLEAN     DEFAULT TRUE,
  erro         TEXT,
  UNIQUE(etapa_id, tipo, destinatario)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_folha_etapas_ciclo_dept ON folha_etapas_ciclo(dept_responsavel);
CREATE INDEX IF NOT EXISTS idx_folha_etapas_ciclo_status ON folha_etapas_ciclo(status);
CREATE INDEX IF NOT EXISTS idx_folha_etapas_ciclo_data ON folha_etapas_ciclo(data_prevista);
CREATE INDEX IF NOT EXISTS idx_folha_etapas_ciclo_ref ON folha_etapas_ciclo(ciclo_ref);

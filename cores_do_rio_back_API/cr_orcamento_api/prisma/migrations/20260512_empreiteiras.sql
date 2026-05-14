-- Cria tabela de empreiteiras
CREATE TABLE IF NOT EXISTS empreiteiras (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permite obras sem local (dados históricos incompletos)
ALTER TABLE obras ALTER COLUMN local DROP NOT NULL;
ALTER TABLE obras ALTER COLUMN local SET DEFAULT NULL;

-- FK de obras para empreiteiras
ALTER TABLE obras ADD COLUMN IF NOT EXISTS empreiteira_id UUID REFERENCES empreiteiras(id) ON DELETE SET NULL;

-- ── Empreiteiras ──────────────────────────────────────────────────────────────
INSERT INTO empreiteiras (nome) VALUES
  ('ARTHA'),
  ('AVANCO'),
  ('CALPER'),
  ('CTV'),
  ('CYCOHRP'),
  ('CYRELA'),
  ('ELVAS'),
  ('ELVAS/REMA'),
  ('KLACON'),
  ('MODULAR'),
  ('MP'),
  ('MR2'),
  ('PLAYA'),
  ('RIO 8'),
  ('SAFIRA'),
  ('TECCONSTRU'),
  ('TEGRA'),
  ('CAC'),
  ('CBR 002-IRAJA'),
  ('CONCEPT - ADITIVOS'),
  ('CYCORP'),
  ('FMAC'),
  ('INTY'),
  ('KS9 ENGENHARIA KABANA NOGUEIRA'),
  ('MP ENGENHARIA'),
  ('NEXUS MACAE'),
  ('TECONST - ITAIPU'),
  ('VOLENDAM')
ON CONFLICT (nome) DO NOTHING;

-- ── Obras (dados históricos) ──────────────────────────────────────────────────
INSERT INTO obras (nome, empreiteira_id) VALUES
  ('TIJUCA',                           (SELECT id FROM empreiteiras WHERE nome = 'ARTHA')),
  ('SIGNATURE - PEPE PRAYA',           (SELECT id FROM empreiteiras WHERE nome = 'AVANCO')),
  ('SANTA LUCIA',                      (SELECT id FROM empreiteiras WHERE nome = 'AVANCO')),
  ('Riomar',                           (SELECT id FROM empreiteiras WHERE nome = 'AVANCO')),
  ('DUO',                              (SELECT id FROM empreiteiras WHERE nome = 'CALPER')),
  ('MURANO',                           (SELECT id FROM empreiteiras WHERE nome = 'CALPER')),
  ('Etehe',                            (SELECT id FROM empreiteiras WHERE nome = 'CALPER')),
  ('NEXUS HOTEL E RESIDENCIES',        (SELECT id FROM empreiteiras WHERE nome = 'CALPER')),
  ('WIDE RESIDENCES',                  (SELECT id FROM empreiteiras WHERE nome = 'CALPER')),
  ('Duo Design',                       (SELECT id FROM empreiteiras WHERE nome = 'CALPER')),
  ('MOBI RESIDENCIAL',                 (SELECT id FROM empreiteiras WHERE nome = 'CTV')),
  ('ON THE OCEAN',                     (SELECT id FROM empreiteiras WHERE nome = 'CYCOHRP')),
  ('ONLY DELCASTILHO',                 (SELECT id FROM empreiteiras WHERE nome = 'CYRELA')),
  ('LA ISLA - TIJUCA',                 (SELECT id FROM empreiteiras WHERE nome = 'CYRELA')),
  ('ICONIC BY YOO - BOTAFOGO',         (SELECT id FROM empreiteiras WHERE nome = 'CYRELA')),
  ('JOY',                              (SELECT id FROM empreiteiras WHERE nome = 'CYRELA')),
  ('Yconic (LIMPEZA BL2)',             (SELECT id FROM empreiteiras WHERE nome = 'CYRELA')),
  ('Yconic',                           (SELECT id FROM empreiteiras WHERE nome = 'CYRELA')),
  ('Only/ CARAPA',                     (SELECT id FROM empreiteiras WHERE nome = 'CYRELA')),
  ('LA ISLA',                          (SELECT id FROM empreiteiras WHERE nome = 'CYRELA')),
  ('Living Vista Parque (JOY)',         (SELECT id FROM empreiteiras WHERE nome = 'CYRELA')),
  ('ORYGEM ADITIVO',                   (SELECT id FROM empreiteiras WHERE nome = 'CYRELA')),
  ('SPE NEO DESIGN ICARAI LTDA.',      (SELECT id FROM empreiteiras WHERE nome = 'ELVAS')),
  ('ON LIFE',                          (SELECT id FROM empreiteiras WHERE nome = 'ELVAS/REMA')),
  ('BARRA LIFE',                       (SELECT id FROM empreiteiras WHERE nome = 'KLACON')),
  ('SAN BEACH RESIDENCE',              (SELECT id FROM empreiteiras WHERE nome = 'MODULAR')),
  ('Sand Beach Fase 2',                (SELECT id FROM empreiteiras WHERE nome = 'MODULAR')),
  ('EXCLUSIVE NORONHA',                (SELECT id FROM empreiteiras WHERE nome = 'MP')),
  ('LAS VENTANAS',                     (SELECT id FROM empreiteiras WHERE nome = 'MR2')),
  ('SPE AVAL LAFAYETTE',               (SELECT id FROM empreiteiras WHERE nome = 'PLAYA')),
  ('CONDOMINIO CENARIO DOS PASSAROS',  (SELECT id FROM empreiteiras WHERE nome = 'RIO 8')),
  ('LEGACY IPANEMA',                   (SELECT id FROM empreiteiras WHERE nome = 'SAFIRA')),
  ('SAMARINO',                         (SELECT id FROM empreiteiras WHERE nome = 'SAFIRA')),
  ('REDENTOR',                         (SELECT id FROM empreiteiras WHERE nome = 'SAFIRA')),
  ('TROPICO CAMBOINHAS',               (SELECT id FROM empreiteiras WHERE nome = 'TECCONSTRU')),
  ('DA VINCI',                         (SELECT id FROM empreiteiras WHERE nome = 'TECCONSTRU')),
  ('OBRA ITAIPU',                      (SELECT id FROM empreiteiras WHERE nome = 'TECCONSTRU')),
  ('MODELO',                           (SELECT id FROM empreiteiras WHERE nome = 'TEGRA')),
  ('CLARIS',                           (SELECT id FROM empreiteiras WHERE nome = 'TEGRA')),
  ('GAEA',                             (SELECT id FROM empreiteiras WHERE nome = 'TEGRA')),
  ('Duo London',                       (SELECT id FROM empreiteiras WHERE nome = 'CAC')),
  ('VIVAZ ZONA NORTE',                 (SELECT id FROM empreiteiras WHERE nome = 'CBR 002-IRAJA')),
  ('Concept - aditivos',               (SELECT id FROM empreiteiras WHERE nome = 'CONCEPT - ADITIVOS')),
  ('Pontal',                           (SELECT id FROM empreiteiras WHERE nome = 'CYCORP')),
  ('Pontal epoxy',                     (SELECT id FROM empreiteiras WHERE nome = 'CYCORP')),
  ('Relier',                           (SELECT id FROM empreiteiras WHERE nome = 'FMAC')),
  ('Rooca',                            (SELECT id FROM empreiteiras WHERE nome = 'INTY')),
  ('Urbano',                           (SELECT id FROM empreiteiras WHERE nome = 'INTY')),
  ('Dumont',                           (SELECT id FROM empreiteiras WHERE nome = 'INTY')),
  ('Canario dos passaros (teresopolis)',(SELECT id FROM empreiteiras WHERE nome = 'KS9 ENGENHARIA KABANA NOGUEIRA')),
  ('Exclusive Noronha',                (SELECT id FROM empreiteiras WHERE nome = 'MP ENGENHARIA')),
  ('Nexus macae',                      (SELECT id FROM empreiteiras WHERE nome = 'NEXUS MACAE')),
  ('Niteroi - itaipu',                 (SELECT id FROM empreiteiras WHERE nome = 'TECONST - ITAIPU')),
  ('Praia Dos Anjos',                  (SELECT id FROM empreiteiras WHERE nome = 'VOLENDAM'))
ON CONFLICT DO NOTHING;

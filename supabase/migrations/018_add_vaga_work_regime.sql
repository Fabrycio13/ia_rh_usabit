-- Migração 018: Regime de Trabalho em Vagas
-- Adiciona suporte para Full-time, Part-time e Hourly

ALTER TABLE vagas_white_label 
ADD COLUMN IF NOT EXISTS work_regime TEXT;

-- Comentário para documentar as opções esperadas
COMMENT ON COLUMN vagas_white_label.work_regime IS 'Opções: full-time, part-time, hourly';

-- ============================================
-- 026: VINCULAR PIPELINE À VAGA
-- Adiciona pipeline_id em vagas_white_label
-- ============================================

-- 1. Adicionar coluna pipeline_id na tabela vagas_white_label
ALTER TABLE vagas_white_label 
ADD COLUMN IF NOT EXISTS pipeline_id UUID;

-- 2. Adicionar constraint de chave estrangeira (opcional, mas recomendado)
-- Note: pipelines pode não existir ainda em algumas ordens de execução,
-- mas como já temos as migrações anteriores, deve funcionar.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipelines') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_vagas_pipeline') THEN
            ALTER TABLE vagas_white_label 
            ADD CONSTRAINT fk_vagas_pipeline 
            FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 3. Índice para performance
CREATE INDEX IF NOT EXISTS idx_vwl_pipeline_id ON vagas_white_label(pipeline_id);

COMMENT ON COLUMN vagas_white_label.pipeline_id IS 'Pipeline principal associado a esta vaga';

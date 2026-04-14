-- Migração 023: Adicionar vaga_id às tabelas do pipeline
-- Vincula pipelines, colunas e cards às vagas para melhor organização

-- 1. Adicionar vaga_id à tabela pipelines
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pipelines' AND column_name = 'vaga_id'
    ) THEN
        ALTER TABLE pipelines ADD COLUMN vaga_id UUID DEFAULT NULL;
        ALTER TABLE pipelines ADD CONSTRAINT fk_pipelines_vaga 
            FOREIGN KEY (vaga_id) REFERENCES vagas_white_label(id) ON DELETE SET NULL;
        CREATE INDEX idx_pipelines_vaga_id ON pipelines(vaga_id);
        COMMENT ON COLUMN pipelines.vaga_id IS 'Vaga associada a este pipeline (opcional)';
    END IF;
END $$;

-- 2. Adicionar vaga_id à tabela pipeline_columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pipeline_columns' AND column_name = 'vaga_id'
    ) THEN
        ALTER TABLE pipeline_columns ADD COLUMN vaga_id UUID DEFAULT NULL;
        ALTER TABLE pipeline_columns ADD CONSTRAINT fk_pipeline_columns_vaga 
            FOREIGN KEY (vaga_id) REFERENCES vagas_white_label(id) ON DELETE SET NULL;
        CREATE INDEX idx_pipeline_columns_vaga_id ON pipeline_columns(vaga_id);
        COMMENT ON COLUMN pipeline_columns.vaga_id IS 'Vaga associada a esta coluna (opcional)';
    END IF;
END $$;

-- 3. Adicionar vaga_id à tabela pipeline_cards
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pipeline_cards' AND column_name = 'vaga_id'
    ) THEN
        ALTER TABLE pipeline_cards ADD COLUMN vaga_id UUID DEFAULT NULL;
        ALTER TABLE pipeline_cards ADD CONSTRAINT fk_pipeline_cards_vaga 
            FOREIGN KEY (vaga_id) REFERENCES vagas_white_label(id) ON DELETE SET NULL;
        CREATE INDEX idx_pipeline_cards_vaga_id ON pipeline_cards(vaga_id);
        COMMENT ON COLUMN pipeline_cards.vaga_id IS 'Vaga associada a este card (opcional)';
    END IF;
END $$;

-- 4. Adicionar coluna is_active aos pipelines (para controlar quando vaga é pausada)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pipelines' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE pipelines ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        CREATE INDEX idx_pipelines_is_active ON pipelines(is_active);
        COMMENT ON COLUMN pipelines.is_active IS 'Indica se o pipeline está ativo (false quando vaga pausada)';
    END IF;
END $$;

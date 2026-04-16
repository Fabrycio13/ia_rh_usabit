-- Migração 022: Adicionar coluna de acessibilidade PcD em vagas_white_label
-- Permite indicar se a vaga é para pessoas com deficiência

-- 1. Adicionar coluna is_pcd
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vagas_white_label' AND column_name = 'is_pcd'
    ) THEN
        ALTER TABLE vagas_white_label ADD COLUMN is_pcd BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN vagas_white_label.is_pcd IS 'Indica se a vaga é destinada a pessoas com deficiência (PcD)';
    END IF;
END $$;

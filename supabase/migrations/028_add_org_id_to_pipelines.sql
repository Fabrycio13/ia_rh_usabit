-- Migração 028: Adicionar organization_id às tabelas de pipeline
-- Essencial para o isolamento multitenant de pipelines entre empresas

-- 1. Adicionar organization_id à tabela pipelines
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pipelines' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE pipelines ADD COLUMN organization_id UUID DEFAULT NULL;
        CREATE INDEX idx_pipelines_organization_id ON pipelines(organization_id);
    END IF;
END $$;

-- 2. Adicionar organization_id à tabela pipeline_columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pipeline_columns' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE pipeline_columns ADD COLUMN organization_id UUID DEFAULT NULL;
        CREATE INDEX idx_pipeline_columns_organization_id ON pipeline_columns(organization_id);
    END IF;
END $$;

-- 3. Adicionar organization_id à tabela pipeline_cards
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pipeline_cards' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE pipeline_cards ADD COLUMN organization_id UUID DEFAULT NULL;
        CREATE INDEX idx_pipeline_cards_organization_id ON pipeline_cards(organization_id);
    END IF;
END $$;

-- 4. Atualizar os pipelines antigos para herdar o organization_id do usuário criador
UPDATE pipelines p
SET organization_id = pr.organization_id
FROM profiles pr
WHERE p.user_id = pr.id AND p.organization_id IS NULL;

-- 5. Atualizar as colunas antigas para herdar o organization_id
UPDATE pipeline_columns pc
SET organization_id = p.organization_id
FROM pipelines p
WHERE pc.pipeline_id = p.id AND pc.organization_id IS NULL;

-- 6. Atualizar os cards antigos para herdar o organization_id
UPDATE pipeline_cards pca
SET organization_id = p.organization_id
FROM pipelines p
WHERE pca.pipeline_id = p.id AND pca.organization_id IS NULL;

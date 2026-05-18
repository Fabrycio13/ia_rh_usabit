-- Migração 016: Adicionar coluna status em vagas_white_label
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vagas_white_label' AND column_name = 'status'
    ) THEN
        ALTER TABLE vagas_white_label ADD COLUMN status TEXT DEFAULT 'aberta';
    END IF;
END $$;

-- Sincronizar dados existentes baseado na lógica anterior
-- aberta: is_active = true AND is_accepting_applications = true
-- fechada: is_active = true AND is_accepting_applications = false
-- pausada: is_active = false
UPDATE vagas_white_label 
SET status = 
  CASE 
    WHEN is_active = false THEN 'pausada'
    WHEN is_accepting_applications = false THEN 'fechada'
    ELSE 'aberta'
  END;

-- Adicionar constraint de check para garantir valores válidos
ALTER TABLE vagas_white_label DROP CONSTRAINT IF EXISTS check_vaga_status;
ALTER TABLE vagas_white_label ADD CONSTRAINT check_vaga_status 
CHECK (status IN ('aberta', 'fechada', 'pausada', 'cancelada'));

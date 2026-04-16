-- Adicionar configurações avançadas de design para o portal de carreiras
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS font_color TEXT DEFAULT '#0f172a',
ADD COLUMN IF NOT EXISTS logo_scale NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS cover_fit TEXT DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS background_fit TEXT DEFAULT 'cover';

-- Comentários para documentação
COMMENT ON COLUMN organizations.font_color IS 'Cor principal dos textos do portal de carreiras';
COMMENT ON COLUMN organizations.logo_scale IS 'Fator de escala da logomarca (ex: 1.2 = 120%)';
COMMENT ON COLUMN organizations.cover_fit IS 'Modo de preenchimento da imagem de capa (cover ou contain)';
COMMENT ON COLUMN organizations.background_fit IS 'Modo de preenchimento da imagem de fundo (cover ou contain)';

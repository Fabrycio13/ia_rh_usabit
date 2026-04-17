-- ADR-001: Bucket de Storage para Imagens de Fundo de Vagas
-- Decisão: Usar o bucket 'organizations' existente com subpasta por vaga
-- Racional: Evita proliferação de buckets, reutiliza RLS já configurado,
--            o caminho {org_id}/vagas/{vaga_id}/ mantém isolamento por organização.

-- Migração 039: Adicionar campos de design visual por vaga
ALTER TABLE vagas_white_label
ADD COLUMN IF NOT EXISTS vaga_primary_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vaga_gradient_end TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vaga_bg_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vaga_bg_image TEXT DEFAULT NULL;

COMMENT ON COLUMN vagas_white_label.vaga_primary_color IS 'Cor principal dos botões e destaques desta vaga. NULL = usa padrão do sistema.';
COMMENT ON COLUMN vagas_white_label.vaga_gradient_end IS 'Cor secundária do gradiente do header. NULL = usa padrão.';
COMMENT ON COLUMN vagas_white_label.vaga_bg_color IS 'Cor de fundo da página da vaga. NULL = usa padrão escuro (#0B1020).';
COMMENT ON COLUMN vagas_white_label.vaga_bg_image IS 'URL da imagem de fundo da página. Armazenada no bucket organizations/{org_id}/vagas/{vaga_id}/bg.jpg';

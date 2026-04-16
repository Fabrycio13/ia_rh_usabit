-- 031_migrate_active_vagas.sql
-- Garante que todas as vagas existentes que não foram explicitamente excluídas sejam marcadas como ativas.
-- Isso é necessário para que o filtro .eq('is_active', true) não esconda vagas legadas.

UPDATE vagas_white_label 
SET is_active = true 
WHERE is_active IS NULL;

-- Também garante que is_active tenha um valor padrão correto para o futuro (já definido na criação, mas reforçando)
ALTER TABLE vagas_white_label ALTER COLUMN is_active SET DEFAULT true;

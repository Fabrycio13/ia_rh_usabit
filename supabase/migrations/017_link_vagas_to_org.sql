-- Migração 017: Vincular Vagas à Organização
-- Preencher organization_id nas vagas baseado no perfil do criador (user_id)

UPDATE vagas_white_label v
SET organization_id = p.organization_id
FROM profiles p
WHERE v.user_id = p.id
AND v.organization_id IS NULL
AND p.organization_id IS NOT NULL;

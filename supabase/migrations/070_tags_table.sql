-- ============================================
-- 070: TABELA DE TAGS (GLOBAL POR ORGANIZAÇÃO)
-- Permite criar tags independentemente de
-- candidatos, com persistência e RLS
-- ============================================

-- 1. Tabela de tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(name, organization_id)
);

-- 2. RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- 3. Policy: owner pode tudo (sem restrição de org — dono tem acesso global)
CREATE POLICY "tags: owner_all" ON tags FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

-- 4. Policy: administrador, supervisor, rh podem SELECT/INSERT/UPDATE/DELETE na própria org
CREATE POLICY "tags: admin_supervisor_rh_crud" ON tags FOR ALL
    USING (
        get_my_role() IN ('administrador', 'supervisor', 'rh')
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    )
    WITH CHECK (
        get_my_role() IN ('administrador', 'supervisor', 'rh')
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

-- 5. Policy: convidado só SELECT na própria org
CREATE POLICY "tags: convidado_select" ON tags FOR SELECT
    USING (
        get_my_role() = 'convidado'
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

-- 6. Comments
COMMENT ON TABLE tags IS 'Registro global de tags por organização. Tags criadas via filtro ou durante importação persistem aqui.';
COMMENT ON COLUMN tags.name IS 'Nome da tag (normalizado: lowercase + trim).';
COMMENT ON COLUMN tags.organization_id IS 'Organização proprietária (RLS multitenancy).';

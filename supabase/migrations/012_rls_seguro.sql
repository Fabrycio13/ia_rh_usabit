-- ============================================
-- RLS SEGURO v2 — Sem organization_id
-- Usa SECURITY DEFINER para evitar recursão
-- ============================================

-- ─── 1. FUNÇÕES HELPER (SECURITY DEFINER evita loop recursivo) ──────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT user_role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ─── 2. LIMPAR TODAS AS POLÍTICAS EXISTENTES ────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT schemaname, tablename, policyname FROM pg_policies LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ─── 3. HABILITAR RLS ───────────────────────────────────────────────────────
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE vagas_white_label   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vagas_candidaturas  ENABLE ROW LEVEL SECURITY;

-- ─── 4. POLÍTICAS: profiles ─────────────────────────────────────────────────

-- Usuário sempre acessa seu próprio perfil
CREATE POLICY "profiles: own record"
    ON profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Owner e Admin veem e gerenciam TODOS os perfis
CREATE POLICY "profiles: owner_admin full access"
    ON profiles FOR ALL
    USING (get_my_role() IN ('owner', 'admin'))
    WITH CHECK (get_my_role() IN ('owner', 'admin'));

-- ─── 5. POLÍTICAS: jobs ─────────────────────────────────────────────────────

-- Owner e Admin gerenciam todos os jobs
CREATE POLICY "jobs: owner_admin full access"
    ON jobs FOR ALL
    USING (get_my_role() IN ('owner', 'admin'))
    WITH CHECK (get_my_role() IN ('owner', 'admin'));

-- Qualquer usuário autenticado vê/gerencia seus próprios jobs
CREATE POLICY "jobs: own jobs"
    ON jobs FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Vagas ativas públicas (para candidatos não logados)
CREATE POLICY "jobs: public active"
    ON jobs FOR SELECT
    USING (is_active = true);

-- ─── 6. POLÍTICAS: vagas_white_label ────────────────────────────────────────

-- Owner e Admin gerenciam tudo
CREATE POLICY "vagas: owner_admin full access"
    ON vagas_white_label FOR ALL
    USING (get_my_role() IN ('owner', 'admin'))
    WITH CHECK (get_my_role() IN ('owner', 'admin'));

-- Usuário gerencia suas próprias vagas
CREATE POLICY "vagas: own jobs"
    ON vagas_white_label FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Vagas ativas são públicas (candidatos sem login)
CREATE POLICY "vagas: public active"
    ON vagas_white_label FOR SELECT
    USING (is_active = true AND is_accepting_applications = true);

-- ─── 7. POLÍTICAS: vagas_candidaturas ───────────────────────────────────────

-- Qualquer um pode se candidatar
CREATE POLICY "candidaturas: public insert"
    ON vagas_candidaturas FOR INSERT
    WITH CHECK (true);

-- Owner e Admin veem e gerenciam todas as candidaturas
CREATE POLICY "candidaturas: owner_admin full access"
    ON vagas_candidaturas FOR ALL
    USING (get_my_role() IN ('owner', 'admin'))
    WITH CHECK (get_my_role() IN ('owner', 'admin'));

-- Dono da vaga vê e gerencia candidaturas das suas vagas
CREATE POLICY "candidaturas: vaga owner"
    ON vagas_candidaturas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM vagas_white_label v
            WHERE v.id = vagas_candidaturas.vaga_id
              AND v.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vagas_white_label v
            WHERE v.id = vagas_candidaturas.vaga_id
              AND v.user_id = auth.uid()
        )
    );

-- ─── 8. VERIFICAÇÃO FINAL ────────────────────────────────────────────────────
SELECT tablename, COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

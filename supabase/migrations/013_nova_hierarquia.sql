-- ============================================
-- 013: NOVA HIERARQUIA DE ROLES
-- Owner → Gestor → RH → Convidado
-- Elimina o role 'admin'
-- ============================================

-- 1. Migrar admin → gestor
UPDATE profiles 
SET user_role = 'gestor' 
WHERE user_role = 'admin';

-- 2. Garantir que gestor tem organization_id próprio
-- Se um gestor não tem org_id, usa seu próprio id
UPDATE profiles
SET organization_id = id
WHERE user_role = 'gestor' 
  AND organization_id IS NULL;

-- 3. Garantir colunas organization_id nas tabelas de dados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'candidates' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE candidates ADD COLUMN organization_id UUID DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE jobs ADD COLUMN organization_id UUID DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vagas_white_label' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE vagas_white_label ADD COLUMN organization_id UUID DEFAULT NULL;
    END IF;
END $$;

-- 4. Atualizar RLS — limpar tudo
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT schemaname, tablename, policyname FROM pg_policies LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 5. Funções SECURITY DEFINER (sem recursão)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT user_role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 6. Habilitar RLS
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE vagas_white_label   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vagas_candidaturas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates          ENABLE ROW LEVEL SECURITY;

-- ─── PROFILES ───────────────────────────────────────────────────────────────

-- Todo usuário vê/edita o próprio perfil
CREATE POLICY "profiles: own"
    ON profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Owner vê e gerencia TODOS
CREATE POLICY "profiles: owner full"
    ON profiles FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

-- Gestor vê perfis da sua org
CREATE POLICY "profiles: gestor sees org"
    ON profiles FOR SELECT
    USING (
        get_my_role() = 'gestor'
        AND organization_id = get_my_org_id()
    );

-- Gestor gerencia perfis da sua org
CREATE POLICY "profiles: gestor manages org"
    ON profiles FOR ALL
    USING (
        get_my_role() = 'gestor'
        AND organization_id = get_my_org_id()
    )
    WITH CHECK (
        get_my_role() = 'gestor'
        AND organization_id = get_my_org_id()
    );

-- ─── JOBS ────────────────────────────────────────────────────────────────────

-- Owner vê tudo
CREATE POLICY "jobs: owner full" ON jobs FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

-- Gestor/RH veem jobs da sua org ou criados por eles
CREATE POLICY "jobs: org members" ON jobs FOR ALL
    USING (
        get_my_role() IN ('gestor', 'rh')
        AND (
            organization_id = get_my_org_id()
            OR user_id = auth.uid()
        )
    )
    WITH CHECK (
        get_my_role() IN ('gestor', 'rh')
        AND (
            organization_id = get_my_org_id()
            OR user_id = auth.uid()
        )
    );

-- jobs são internos — não há leitura pública direta (candidatos acessam via vagas_white_label)

-- ─── VAGAS_WHITE_LABEL ───────────────────────────────────────────────────────

CREATE POLICY "vagas: owner full" ON vagas_white_label FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

CREATE POLICY "vagas: org members" ON vagas_white_label FOR ALL
    USING (
        get_my_role() IN ('gestor', 'rh')
        AND (organization_id = get_my_org_id() OR user_id = auth.uid())
    )
    WITH CHECK (
        get_my_role() IN ('gestor', 'rh')
        AND (organization_id = get_my_org_id() OR user_id = auth.uid())
    );

CREATE POLICY "vagas: public active" ON vagas_white_label FOR SELECT
    USING (is_active = true AND is_accepting_applications = true);

-- ─── VAGAS_CANDIDATURAS ──────────────────────────────────────────────────────

CREATE POLICY "candidaturas: public insert" ON vagas_candidaturas FOR INSERT
    WITH CHECK (true);

CREATE POLICY "candidaturas: owner full" ON vagas_candidaturas FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

CREATE POLICY "candidaturas: vaga owner" ON vagas_candidaturas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM vagas_white_label v
            WHERE v.id = vagas_candidaturas.vaga_id
              AND (v.user_id = auth.uid() OR v.organization_id = get_my_org_id())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vagas_white_label v
            WHERE v.id = vagas_candidaturas.vaga_id
              AND (v.user_id = auth.uid() OR v.organization_id = get_my_org_id())
        )
    );

-- ─── CANDIDATES ──────────────────────────────────────────────────────────────

CREATE POLICY "candidates: owner full" ON candidates FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

CREATE POLICY "candidates: org members" ON candidates FOR ALL
    USING (
        get_my_role() IN ('gestor', 'rh')
        AND (organization_id = get_my_org_id() OR user_id = auth.uid())
    )
    WITH CHECK (
        get_my_role() IN ('gestor', 'rh')
        AND (organization_id = get_my_org_id() OR user_id = auth.uid())
    );

-- ─── PIPELINES ───────────────────────────────────────────────────────────────

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipelines: owner full" ON pipelines FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

CREATE POLICY "pipelines: own" ON pipelines FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ─── PIPELINE_COLUMNS ────────────────────────────────────────────────────────

ALTER TABLE pipeline_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_columns: owner full" ON pipeline_columns FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

CREATE POLICY "pipeline_columns: own" ON pipeline_columns FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ─── PIPELINE_CARDS ──────────────────────────────────────────────────────────

ALTER TABLE pipeline_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_cards: owner full" ON pipeline_cards FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

CREATE POLICY "pipeline_cards: own" ON pipeline_cards FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ─── JOB_CANDIDATES ──────────────────────────────────────────────────────────

ALTER TABLE job_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_candidates: owner full" ON job_candidates FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

CREATE POLICY "job_candidates: own" ON job_candidates FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ─── CANDIDATE_CONVERSATIONS ──────────────────────────────────────────────────

ALTER TABLE candidate_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations: owner full" ON candidate_conversations FOR ALL
    USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

CREATE POLICY "conversations: own" ON candidate_conversations FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ─── ACTIVITY_LOGS (se existir) ──────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        EXECUTE '
            ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

            CREATE POLICY "logs: owner full" ON activity_logs FOR ALL
                USING (get_my_role() = ''owner'')
                WITH CHECK (get_my_role() = ''owner'');

            CREATE POLICY "logs: own" ON activity_logs FOR ALL
                USING (user_id = auth.uid())
                WITH CHECK (user_id = auth.uid());
        ';
    END IF;
END $$;

-- ─── SCREENING_LOGS (se existir) ─────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screening_logs') THEN
        EXECUTE '
            ALTER TABLE screening_logs ENABLE ROW LEVEL SECURITY;

            CREATE POLICY "screening_logs: owner full" ON screening_logs FOR ALL
                USING (get_my_role() = ''owner'')
                WITH CHECK (get_my_role() = ''owner'');

            CREATE POLICY "screening_logs: own" ON screening_logs FOR ALL
                USING (user_id = auth.uid())
                WITH CHECK (user_id = auth.uid());
        ';
    END IF;
END $$;

-- ─── VERIFICAÇÃO ─────────────────────────────────────────────────────────────
SELECT tablename, COUNT(*) as politicas
FROM pg_policies WHERE schemaname = 'public'
GROUP BY tablename ORDER BY tablename;

-- Checar se migração de roles funcionou:
SELECT user_role, COUNT(*) FROM profiles GROUP BY user_role;


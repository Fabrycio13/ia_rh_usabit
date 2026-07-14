-- ============================================
-- 077: UNIFICAÇÃO POOL + GESTÃO EM vagas_candidaturas
-- Fase 1 do plano de remodelagem do banco de talentos.
--
-- Objetivo:
--   vagas_candidaturas absorve o papel de job_candidates.
--   - vaga_id NULL  → Pool de Talentos (sem vaga)
--   - vaga_id NOT NULL → Gestão de Vagas (vínculo com vaga)
--   - candidate_id FK → candidates (nullable, preenchido ao ir pro Banco)
--
-- NÃO dropa job_candidates nesta migration (compatibilidade com Fase 2).
-- ============================================

-- ─── 1. TORNAR vaga_id NULLABLE ─────────────────────────────────────────────
-- Hoje é NOT NULL (migration 007). Pool precisa de vaga_id NULL.
ALTER TABLE public.vagas_candidaturas ALTER COLUMN vaga_id DROP NOT NULL;

COMMENT ON COLUMN public.vagas_candidaturas.vaga_id IS
  'Vaga vinculada. NULL = Pool de Talentos (sem vaga). NOT NULL = Gestão de Vagas.';

-- CHECK: Pool (vaga_id NULL) DEVE ter organization_id — previne Pool órfão invisível.
-- Edge Functions (submit-candidate, submit-application) DEVEM setar organization_id em inserts de Pool.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'vc_pool_requires_org'
          AND table_name = 'vagas_candidaturas'
    ) THEN
        ALTER TABLE public.vagas_candidaturas
            ADD CONSTRAINT vc_pool_requires_org CHECK (
                vaga_id IS NOT NULL OR organization_id IS NOT NULL
            );
    END IF;
END $$;

-- ─── 2. ADICIONAR candidate_id FK → candidates ──────────────────────────────
-- Permite vincular a candidatura ao perfil master no Banco de Talentos.
-- Nullable: só preenchido quando o candidato vai pro Banco (candidates).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vagas_candidaturas' AND column_name = 'candidate_id'
    ) THEN
        ALTER TABLE public.vagas_candidaturas
            ADD COLUMN candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL;

        CREATE INDEX idx_vagas_candidaturas_candidate_id
            ON public.vagas_candidaturas(candidate_id);
    END IF;
END $$;

COMMENT ON COLUMN public.vagas_candidaturas.candidate_id IS
  'FK para candidates (Banco de Talentos). NULL enquanto não foi pro Banco.';

-- ─── 3. ADICIONAR CAMPOS DE ANÁLISE ──────────────────────────────────────────
-- analysis: extração IA do Pool (skills, formação, mini-bio) — fluxo + Adicionar
-- analysis_vs_vaga: análise comparativa com requisitos da vaga (score, strengths, gaps)
ALTER TABLE public.vagas_candidaturas
    ADD COLUMN IF NOT EXISTS analysis JSONB,
    ADD COLUMN IF NOT EXISTS analysis_vs_vaga JSONB;

COMMENT ON COLUMN public.vagas_candidaturas.analysis IS
  'Extração IA do currículo (Pool): skills, formação, mini-bio. PII interno — nunca expor em erros.';
COMMENT ON COLUMN public.vagas_candidaturas.analysis_vs_vaga IS
  'Análise comparativa vs requisitos da vaga (Gestão): score, strengths, gaps.';

-- ─── 4. MIGRAR VÍNCULO candidate_id DE job_candidates → vagas_candidaturas ───
-- job_candidates tem: candidate_id, vaga_id, score, status, user_id
-- Estratégia: para candidaturas já existentes em vagas_candidaturas (match por
-- email+vaga), copiar o vínculo candidate_id + match_score de job_candidates.
--
-- NOTA: owner confirmou descartar o restante de job_candidates (status, user_id).
-- Migramos APENAS candidate_id + match_score (não status — domínios podem divergir).
-- O vínculo candidate_id é preservado para não perder o link com o Banco de Talentos.
--
-- DISTINCT ON (vc.id) protege contra match ambíguo se candidates tiver emails duplicados.
-- ORDER BY vc2.id, jc.candidate_id: desempate determinístico (candidate_id é UNIQUE com vaga_id).
UPDATE public.vagas_candidaturas vc
SET candidate_id = sub.candidate_id,
    match_score  = COALESCE(vc.match_score, sub.score)
FROM (
    SELECT DISTINCT ON (vc2.id)
           vc2.id AS vc_id,
           jc.candidate_id,
           jc.score
    FROM public.vagas_candidaturas vc2
    JOIN public.job_candidates jc ON jc.vaga_id = vc2.vaga_id
    JOIN public.candidates c ON c.id = jc.candidate_id
    WHERE vc2.candidate_id IS NULL
      AND c.email IS NOT DISTINCT FROM vc2.candidate_email
    ORDER BY vc2.id, jc.candidate_id
) sub
WHERE vc.id = sub.vc_id;

-- ─── 5. ÍNDICES PARA POOL (vaga_id NULL) ─────────────────────────────────────
-- Pool filtra por organization_id + vaga_id IS NULL
CREATE INDEX IF NOT EXISTS idx_vagas_candidaturas_pool
    ON public.vagas_candidaturas(organization_id)
    WHERE vaga_id IS NULL;

-- Gestão filtra por vaga_id
CREATE INDEX IF NOT EXISTS idx_vagas_candidaturas_gestao
    ON public.vagas_candidaturas(vaga_id)
    WHERE vaga_id IS NOT NULL;

-- ─── 6. REESCREVER RLS DE vagas_candidaturas ─────────────────────────────────
-- Cobrir 3 cenários:
--   a) Pool (vaga_id NULL): isolamento por organization_id direta
--   b) Gestão (vaga_id NOT NULL): isolamento por organization_id direta OU via vaga
--   c) Convidado: SELECT apenas em vagas permitidas via convidado_vaga_access
--   d) Insert público: NÃO (Edge Functions tratam inserts públicos)

-- Re-enable RLS (defensivo — idempotente)
ALTER TABLE public.vagas_candidaturas ENABLE ROW LEVEL SECURITY;

-- Dropar todas as policies existentes
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'vagas_candidaturas' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.vagas_candidaturas', pol.policyname);
    END LOOP;
END $$;

-- 6a. Owner: acesso total
CREATE POLICY "vagas_candidaturas: owner full" ON public.vagas_candidaturas
    FOR ALL USING (get_my_role() = 'owner')
    WITH CHECK (get_my_role() = 'owner');

-- 6b. Admin/Supervisor/RH: isolamento por organization_id direta
--     (Pool usa organization_id direta; Gestão também tem organization_id direta desde migration 049)
CREATE POLICY "vagas_candidaturas: org members" ON public.vagas_candidaturas
    FOR ALL
    USING (
        get_my_role() IN ('administrador', 'supervisor', 'rh')
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    )
    WITH CHECK (
        get_my_role() IN ('administrador', 'supervisor', 'rh')
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

-- 6c. Convidado: SELECT apenas em vagas permitidas
--     (vaga_id NOT NULL obrigatório — convidado não vê Pool)
CREATE POLICY "vagas_candidaturas: convidado select" ON public.vagas_candidaturas
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND vaga_id IS NOT NULL
        AND vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
    );

-- ─── 7. AJUSTAR TRIGGER increment_vaga_app_count ─────────────────────────────
-- Trigger original (migration 007) dispara em TODO insert de vagas_candidaturas.
-- Para Pool (vaga_id NULL), o UPDATE afeta 0 rows — no-op desperdiçando execução.
-- Adicionar guard: pular se vaga_id IS NULL.
CREATE OR REPLACE FUNCTION public.increment_vaga_application_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.vaga_id IS NULL THEN
        RETURN NEW;  -- Pool de Talentos: sem vaga para incrementar
    END IF;
    UPDATE public.vagas_white_label
    SET application_count = application_count + 1
    WHERE id = NEW.vaga_id;
    RETURN NEW;
END $$;

-- ─── 8. DROP job_applications (tabela morta — zero refs no código) ──────────
-- Owner confirmou: sem dados a preservar. CASCADE é irreversível mas seguro.
DROP TABLE IF EXISTS public.job_applications CASCADE;

-- ============================================
-- FIM DA FASE 1
-- job_candidates e jobs MANTIDOS por enquanto (compatibilidade Fase 2).
-- Fase 3 fará o drop após refatora do frontend.
--
-- TODO Fase 2: garantir que Edge Functions não retornem `analysis` bruto
-- em error.message/error.details ao cliente (PII). Ver SECURITY_BACKLOG.md.
-- ============================================

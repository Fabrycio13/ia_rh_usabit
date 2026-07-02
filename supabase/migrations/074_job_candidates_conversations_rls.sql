-- ============================================
-- 074: Add org-scoped RLS to job_candidates and candidate_conversations
-- Both tables had only user_id + owner policies (migration 013).
-- Migration 065 updated all core tables but skipped these two.
-- ============================================

-- 1. job_candidates: drop old user-only policy, add org-scoped
DROP POLICY IF EXISTS "job_candidates: own" ON job_candidates;

CREATE POLICY "job_candidates: org members"
ON job_candidates FOR ALL
USING (
    get_my_role() IN ('administrador', 'supervisor', 'rh')
    AND EXISTS (
        SELECT 1 FROM vagas_white_label v
        WHERE v.id = job_candidates.vaga_id
        AND v.organization_id IS NOT DISTINCT FROM get_my_org_id()
    )
)
WITH CHECK (
    get_my_role() IN ('administrador', 'supervisor', 'rh')
    AND EXISTS (
        SELECT 1 FROM vagas_white_label v
        WHERE v.id = job_candidates.vaga_id
        AND v.organization_id IS NOT DISTINCT FROM get_my_org_id()
    )
);

-- Grant convidado limited SELECT on job_candidates (via pipeline)
DROP POLICY IF EXISTS "job_candidates: convidado select" ON job_candidates;
CREATE POLICY "job_candidates: convidado select"
ON job_candidates FOR SELECT
USING (
    get_my_role() = 'convidado'
    AND EXISTS (
        SELECT 1 FROM vagas_white_label v
        WHERE v.id = job_candidates.vaga_id
        AND v.organization_id IS NOT DISTINCT FROM get_my_org_id()
    )
);

-- 2. candidate_conversations: drop old user-only policy, add org-scoped
DROP POLICY IF EXISTS "conversations: own" ON candidate_conversations;

CREATE POLICY "conversations: org members"
ON candidate_conversations FOR ALL
USING (
    get_my_role() IN ('administrador', 'supervisor', 'rh')
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = candidate_conversations.user_id
        AND p.organization_id IS NOT DISTINCT FROM get_my_org_id()
    )
)
WITH CHECK (
    get_my_role() IN ('administrador', 'supervisor', 'rh')
    AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = candidate_conversations.user_id
        AND p.organization_id IS NOT DISTINCT FROM get_my_org_id()
    )
);

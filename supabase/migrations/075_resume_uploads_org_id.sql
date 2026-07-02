-- ============================================
-- 075: Add organization_id to resume_uploads + org-scoped RLS
-- ============================================

-- 1. Add organization_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'resume_uploads' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.resume_uploads ADD COLUMN organization_id UUID;
    END IF;
END $$;

-- 2. Backfill organization_id from profiles via user_id
UPDATE public.resume_uploads ru
SET organization_id = p.organization_id
FROM public.profiles p
WHERE ru.user_id = p.id
  AND ru.organization_id IS NULL;

-- 3. Set NOT NULL (only if no rows remain without org_id)
-- ponytail: if any row has NULL (legacy orphan), keep nullable
-- but all new inserts will get org_id from app code

-- 4. Drop old permissive policies
DROP POLICY IF EXISTS "Recrutadores podem ler seus uploads" ON public.resume_uploads;
DROP POLICY IF EXISTS "Recrutadores podem registrar uploads" ON public.resume_uploads;

-- 5. Org-scoped policies
-- Owner full access
CREATE POLICY "resume_uploads: owner full"
ON public.resume_uploads FOR ALL
USING (public.get_my_role() = 'owner')
WITH CHECK (public.get_my_role() = 'owner');

-- Org members: access uploads from their organization
CREATE POLICY "resume_uploads: org members"
ON public.resume_uploads FOR ALL
USING (
    public.get_my_role() IN ('administrador', 'supervisor', 'rh')
    AND (organization_id IS NOT DISTINCT FROM public.get_my_org_id())
)
WITH CHECK (
    public.get_my_role() IN ('administrador', 'supervisor', 'rh')
    AND (organization_id IS NOT DISTINCT FROM public.get_my_org_id())
);

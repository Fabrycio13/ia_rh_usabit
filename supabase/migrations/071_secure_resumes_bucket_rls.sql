-- ============================================
-- 071: Secure resumes bucket — org-scoped RLS
-- Fix cross-org data leakage (any authenticated
-- user could read/delete any org's resumes)
-- ============================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "storage: recruiters upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "storage: recruiters select resumes" ON storage.objects;
DROP POLICY IF EXISTS "storage: recruiters delete resumes" ON storage.objects;

-- Owner full access
CREATE POLICY "storage: owner resumes"
ON storage.objects FOR ALL
USING (
    bucket_id = 'resumes'
    AND (public.get_my_role() = 'owner')
)
WITH CHECK (
    bucket_id = 'resumes'
    AND (public.get_my_role() = 'owner')
);

-- Org members: access only files they uploaded
-- Path format: {user_id}/... or resumes/{filename}
-- For {user_id}/... paths, verify user belongs to same org
CREATE POLICY "storage: org resumes select"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'resumes'
    AND (
        -- User uploaded their own file
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- Admin/Supervisor/RH: can access files from same org
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id::text = (storage.foldername(name))[1]
            AND p.organization_id = public.get_my_org_id()
            AND public.get_my_role() IN ('administrador', 'supervisor', 'rh')
        )
    )
);

CREATE POLICY "storage: org resumes insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "storage: org resumes delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'resumes'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.get_my_role() = 'owner'
    )
);

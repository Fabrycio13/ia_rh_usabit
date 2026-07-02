-- ============================================
-- 076: Drop remaining public INSERT policies on vagas_candidaturas
-- Edge Functions (submit-application, submit-candidate) handle all inserts now.
-- RLS should NOT allow direct public inserts via anon key.
-- ============================================

-- Drop by name: policies that may have survived migration 073
DROP POLICY IF EXISTS "Candidaturas publicas" ON public.vagas_candidaturas;
DROP POLICY IF EXISTS "candidaturas: public insert" ON public.vagas_candidaturas;

-- Safety net: drop any remaining permissive insert policy on this table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'vagas_candidaturas'
          AND schemaname = 'public'
          AND cmd = 'INSERT'
          AND with_check = 'true'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.vagas_candidaturas', pol.policyname);
        RAISE NOTICE 'Dropped permissive INSERT policy: %', pol.policyname;
    END LOOP;
END $$;

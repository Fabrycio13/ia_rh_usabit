-- ============================================
-- 047: RESUME UPLOADS TABLE
-- Tabela para rastrear uploads de currículos e suas políticas RLS
-- ============================================

CREATE TABLE IF NOT EXISTS public.resume_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID,
    original_filename TEXT,
    file_path TEXT,
    file_size BIGINT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resume_uploads ENABLE ROW LEVEL SECURITY;

-- Permite leitura de uploads pelo dono ou administradores
CREATE POLICY "Recrutadores podem ler seus uploads" 
ON public.resume_uploads FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR public.get_my_role() = 'owner');

-- Permite inserção apenas pelo próprio usuário
CREATE POLICY "Recrutadores podem registrar uploads" 
ON public.resume_uploads FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

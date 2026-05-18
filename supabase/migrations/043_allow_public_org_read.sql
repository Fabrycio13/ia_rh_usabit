-- 🚀 MIGRAÇÃO: LIBERAR LEITURA PÚBLICA DE DADOS BÁSICOS DA ORGANIZAÇÃO
-- Permite que o portal de carreiras carregue o nome, logo e cores sem precisar de login.

CREATE POLICY "organizations: public select" ON organizations FOR SELECT
    USING (true);

-- Nota: Como o RLS está habilitado, sem uma política explícita para anônimos, 
-- o Supabase bloqueia a leitura. Esta política libera apenas o SELECT.

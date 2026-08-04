-- ============================================================
-- 090: Block anon SELECT on sensitive tables
-- Bloqueia vazamento de PII via REST anon (issue #1 do dogfood)
-- Portal público continua funcionando (Edge Functions usam service_role)
-- ============================================================

-- ─── 1. organizations: remover policies USING (true) ───────────
-- Causa raiz: 2 policies "public select" e "public read" deixavam
-- anon ler todas as orgs (incluindo nome, logo, cores, config).
DROP POLICY IF EXISTS "organizations: public select" ON organizations;
DROP POLICY IF EXISTS "orgs: public read" ON organizations;

-- Mantém as legítimas (gestor update/insert own, members see/update own, owner full).
-- Portal público continua funcionando porque Edge Functions usam SERVICE ROLE.

-- ─── 2. candidates: deny-all pra anon (defense-in-depth) ───────
-- RLS já está habilitado (relrowsecurity=true), mas policies existentes
-- têm roles={public}, então tecnicamente aplicam a anon. Adicionando
-- um deny explícito, garantimos que mesmo se as outras policies forem
-- editadas no futuro, anon continua bloqueado.
CREATE POLICY "candidates: anon deny"
ON candidates FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ─── 3. vagas_white_label: deny-all pra anon ──────────────────
-- Mesma lógica: defense-in-depth.
CREATE POLICY "vagas_white_label: anon deny"
ON vagas_white_label FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ─── 4. Verificação pós-apply (rode manualmente no SQL Editor) ──
--
-- SET ROLE anon;
-- SELECT count(*) FROM candidates;          -- esperado: 0
-- SELECT count(*) FROM organizations;       -- esperado: 0
-- SELECT count(*) FROM vagas_white_label;   -- esperado: 0
-- RESET ROLE;
--
-- Se algum count retornar >0, alguma policy USING (true) ainda
-- existe — investigar antes de dar merge.

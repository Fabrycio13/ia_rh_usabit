-- ============================================================
-- 101: Privatizar bucket `resumes` (P0-2 do pentest)
--
-- Problema: bucket `resumes` era public:true — currículos lá
-- ficariam acessíveis publicamente via
--   /storage/v1/object/public/resumes/...
-- sem autenticação (vazamento de PII de candidatos).
--
-- Estado verificado antes do fix (2026-08-05):
--   - bucket vazio (0 objetos) — currículos reais estão em
--     job-applications (privado, 265 objetos)
--   - 0 resume_url em vagas_candidaturas/candidates apontando
--     para o bucket resumes
--   - código (storage.ts parseStorageUrl) trata 'resumes/' como
--     parse de URL, não como escrita; public-contracts.ts valida
--     subpasta 'resumes/' DENTRO de job-applications (não afetado)
--   → tornar privado não quebra nenhum fluxo
-- ============================================================

UPDATE storage.buckets
   SET public = false
 WHERE id = 'resumes';

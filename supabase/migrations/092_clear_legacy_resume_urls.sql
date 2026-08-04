-- ============================================================
-- 092: Clear legacy resume_url pointing to deleted 'resumes' bucket
-- Issue #2 do dogfood 2026-08-04
--
-- O bucket 'resumes' foi deletado, mas os objetos órfãos
-- continuam servindo 200 OK publicamente. Como os currículos
-- são temporários de teste, zerar resume_url é aceitável.
-- O RH pode pedir re-upload se precisar.
--
-- Edge Functions (get-upload-url, submit-application) continuam
-- funcionando — uploads novos vão pro bucket 'job-applications'
-- com signed URL temporária.
-- ============================================================

-- Antes: quantos serão afetados (verificação)
SELECT count(*) AS candidatos_com_url_legada
FROM candidates
WHERE resume_url LIKE '%/storage/v1/object/public/resumes/%'
   OR resume_url LIKE '%resumes/%';

-- Zera resume_url legado
UPDATE candidates
SET resume_url = NULL
WHERE resume_url LIKE '%/storage/v1/object/public/resumes/%'
   OR resume_url LIKE '%resumes/%';

-- Depois: confirmar que zerou (deve retornar 0)
SELECT count(*) AS restantes
FROM candidates
WHERE resume_url LIKE '%/storage/v1/object/public/resumes/%'
   OR resume_url LIKE '%resumes/%';

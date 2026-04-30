-- 050: ADICIONAR CONSTRAINT UNIQUE PARA UPSERT EM JOB_CANDIDATES
-- Isso permite que o comando .upsert({...}, { onConflict: 'candidate_id,vaga_id' }) funcione corretamente

DO $$
BEGIN
    -- 1. Remover duplicatas se existirem (mantendo apenas a mais recente)
    DELETE FROM job_candidates a USING (
      SELECT MIN(ctid) as ctid, candidate_id, vaga_id
      FROM job_candidates 
      GROUP BY candidate_id, vaga_id HAVING COUNT(*) > 1
    ) b
    WHERE a.candidate_id = b.candidate_id 
    AND a.vaga_id = b.vaga_id 
    AND a.ctid <> b.ctid;

    -- 2. Adicionar a constraint UNIQUE
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'job_candidates_candidate_vaga_key'
    ) THEN
        ALTER TABLE job_candidates ADD CONSTRAINT job_candidates_candidate_vaga_key UNIQUE (candidate_id, vaga_id);
    END IF;
END $$;

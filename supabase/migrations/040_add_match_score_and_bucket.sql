-- Adiciona coluna match_score se não existir
ALTER TABLE vagas_candidaturas
ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 0;

-- Criar bucket job-applications se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('job-applications', 'job-applications', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura Pública
CREATE POLICY "Leitura Pública currículos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'job-applications');

-- Upload público (já que não há auth no forms do candidato)
CREATE POLICY "Upload Público de Currículos" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'job-applications'
);

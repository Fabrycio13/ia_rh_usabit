-- ============================================
-- 079: CAMPOS DE ENDEREIMENTO E PERFIL EM vagas_candidaturas
-- Extensão da Fase 2c para o Pool ler de vagas_candidaturas.
--
-- candidates tem: address, portfolio, cep, address_number, complement,
-- skills, experience, education. vagas_candidaturas não tem.
-- ============================================

ALTER TABLE public.vagas_candidaturas
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS portfolio TEXT,
    ADD COLUMN IF NOT EXISTS cep TEXT,
    ADD COLUMN IF NOT EXISTS address_number TEXT,
    ADD COLUMN IF NOT EXISTS complement TEXT,
    ADD COLUMN IF NOT EXISTS skills TEXT,
    ADD COLUMN IF NOT EXISTS experience TEXT,
    ADD COLUMN IF NOT EXISTS education TEXT;

COMMENT ON COLUMN public.vagas_candidaturas.address IS 'Endereço completo do candidato (Pool).';
COMMENT ON COLUMN public.vagas_candidaturas.portfolio IS 'URL do portfólio do candidato (Pool).';
COMMENT ON COLUMN public.vagas_candidaturas.cep IS 'CEP do endereço (Pool).';
COMMENT ON COLUMN public.vagas_candidaturas.address_number IS 'Número do endereço (Pool).';
COMMENT ON COLUMN public.vagas_candidaturas.complement IS 'Complemento do endereço (Pool).';
COMMENT ON COLUMN public.vagas_candidaturas.skills IS 'Habilidades do candidato (texto separado por vírgula).';
COMMENT ON COLUMN public.vagas_candidaturas.experience IS 'Experiência profissional do candidato.';
COMMENT ON COLUMN public.vagas_candidaturas.education IS 'Formação acadêmica do candidato.';

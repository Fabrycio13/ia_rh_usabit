-- ============================================================
-- 097: Fixar search_path das funções públicas (hardening)
--
-- O Security Advisor reportava "Function Search Path Mutable":
-- funções sem SET search_path explícito podem ser vítimas de
-- search_path hijacking (atacante cria objeto malicioso num
-- schema do search_path e a função executa código errado).
--
-- NOTA: usamos SET search_path = public (não '') porque várias
-- funções referenciam tabelas sem qualificar schema (ex:
-- SELECT 1 FROM candidates, DELETE FROM pipeline_cards).
-- search_path vazio quebraria essas funções.
--
-- search_path = public remove pg_temp e schemas de usuário do
-- path, deixando-o explícito e imutável — resolve o aviso sem
-- mudança de comportamento.
-- ============================================================

ALTER FUNCTION public.add_to_talent_pool_if_high_score() SET search_path = public;
ALTER FUNCTION public.calculate_candidate_job_match_score(candidate_skills jsonb, candidate_experience text, job_skills text[], job_seniority text, job_filters jsonb) SET search_path = public;
ALTER FUNCTION public.can_create_role(p_creator_role text, p_target_role text, p_creator_is_owner boolean, p_creator_is_admin boolean, p_creator_is_gestor boolean) SET search_path = public;
ALTER FUNCTION public.can_view_data(p_viewer_org_id uuid, p_viewer_role text, p_data_org_id uuid, p_viewer_id uuid, p_data_owner_id uuid) SET search_path = public;
ALTER FUNCTION public.check_is_admin() SET search_path = public;
ALTER FUNCTION public.decrement_vaga_application_count() SET search_path = public;
ALTER FUNCTION public.extract_seniority_level(job_name text) SET search_path = public;
ALTER FUNCTION public.extract_skills_from_text(input_text text) SET search_path = public;
ALTER FUNCTION public.generate_vaga_job_code() SET search_path = public;
ALTER FUNCTION public.get_convidado_vaga_ids() SET search_path = public;
ALTER FUNCTION public.handle_candidate_blacklist_change() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.increment_vaga_application_count() SET search_path = public;
ALTER FUNCTION public.prevent_blacklisted_pipeline_link() SET search_path = public;
ALTER FUNCTION public.update_talent_pool_updated_at() SET search_path = public;
ALTER FUNCTION public.update_vagas_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_vwl_updated_at_column() SET search_path = public;

-- ============================================================
-- FIM
-- ============================================================

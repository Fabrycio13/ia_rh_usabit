# Histórico de Migrations do Banco de Dados

> **Propósito:** documentar o que cada migration fez, em que ordem, e quais estão aplicadas.
> **Regra:** migrations novas DEVEM ser numeradas sequencialmente (081, 082, ...).
> **NUNCA** editar ou renomear migrations já aplicadas em produção.
> **Última atualização:** 2026-07-14

---

## Status Atual

| Métrica | Valor |
|---------|-------|
| Total de arquivos | 81 |
| Numeração sequencial | 001 a 081 |
| Duplicatas (mesmo número) | 25 (2x), 26 (2x), 27 (2x), 28 (2x) |
| Última migration aplicada | 081_fix_increment_trigger_updates.sql |

> ⚠️ As duplicatas nos números 25, 26, 27, 28 existem porque arquivos foram criados com o mesmo número em momentos diferentes.
> Ambas versões foram aplicadas. Para novas migrations, usar o próximo número disponível (082).

---

## Tabela de Migrations

| # | Arquivo | Linhas | Operações |
|---|---------|-------|-----------|
| 001 | `create_jobs_system` | 180 | CREATE TABLE job_applications; RLS: jobs; RLS: job_applications; POLICY: Usuários veem suas próprias vagas ON jobs; POLICY: Usuários criam vagas ON jobs |
| 007 | `limpar_tabelas_erradas` | 237 | CREATE TABLE vagas_white_label; CREATE TABLE vagas_candidaturas; DROP TABLE vagas_applications; DROP TABLE vagas_white_label; DROP TABLE vagas |
| 008 | `perfis_sistema` | 52 | ADD COLUMN profiles.IF; ADD COLUMN profiles.IF; ADD COLUMN profiles.IF; ADD COLUMN profiles.IF; INDEX: idx_profiles_user_role |
| 009 | `limpar_usuarios_nao_confirmados` | 73 | FUNCTION: deactivate_unconfirmed_users; FUNCTION: cleanup_unconfirmed_users; VIEW: pending_users |
| 010 | `multi_talent` | 133 | ADD COLUMN profiles.IF; ADD COLUMN profiles.IF; ADD COLUMN jobs.IF; ADD COLUMN vagas_candidaturas.IF; RLS: profiles |
| 011 | `permissoes_hierarquicas` | 58 | FUNCTION: can_create_role; FUNCTION: can_view_data |
| 012 | `rls_seguro` | 122 | RLS: profiles; RLS: jobs; RLS: vagas_white_label; RLS: vagas_candidaturas; POLICY: profiles: own record ON profiles |
| 013 | `nova_hierarquia` | 298 | ADD COLUMN candidates.organization_id; ADD COLUMN jobs.organization_id; ADD COLUMN vagas_white_label.organization_id; RLS: profiles; RLS: jobs |
| 014 | `fix_owner_org` | 15 |  |
| 015 | `migrate_company_to_org` | 18 |  |
| 016 | `add_vaga_status` | 28 | ADD COLUMN vagas_white_label.status; LOGIC: -- Migração 016: Adicionar coluna status em vagas_white_label; LOGIC: -- Sincronizar dados existentes baseado na lógica anterior -- aberta: is_active = true AND is_accept |
| 017 | `link_vagas_to_org` | 10 |  |
| 018 | `add_vaga_work_regime` | 9 | ADD COLUMN vagas_white_label.IF |
| 019 | `fix_user_trigger` | 58 | FUNCTION: handle_new_user; TRIGGER: on_auth_user_created; INSERT INTO profiles; INSERT INTO profiles |
| 020 | `fix_multitenancy_isolation` | 58 | POLICY: vagas: org isolation ON vagas_white_label; POLICY: vagas: public candidate access ON vagas_white_label; POLICY: candidates: org isolation ON candidates; POLICY: candidaturas: org isolation ON vagas_candidaturas; DROP POLICY: vagas: public active ON vagas_white_label |
| 021 | `create_organizations_table` | 38 | CREATE TABLE public; RLS: organizations; POLICY: orgs: owner full ON organizations; POLICY: orgs: members see own ON organizations; INSERT INTO organizations |
| 022 | `add_pcd_flag` | 15 | ADD COLUMN vagas_white_label.is_pcd; LOGIC: -- Migração 022: Adicionar coluna de acessibilidade PcD em vagas_white_label |
| 023 | `add_onboarding_status` | 58 | ADD COLUMN profiles.IF; FUNCTION: handle_new_user; INSERT INTO profiles; INSERT INTO profiles |
| 024 | `add_vaga_id_to_pipeline` | 61 | ADD COLUMN pipelines.vaga_id; ADD COLUMN pipeline_columns.vaga_id; ADD COLUMN pipeline_cards.vaga_id; ADD COLUMN pipelines.is_active; INDEX: idx_pipelines_vaga_id |
| 025 | `add_talent_bank_fields` | 24 | ADD COLUMN candidates.IF; ADD COLUMN job_candidates.IF; INDEX: idx_candidates_linkedin |
| 025 | `definitive_profiles_rls` | 88 | RLS: profiles; POLICY: profiles: own ON profiles; POLICY: profiles: owner_full ON profiles; POLICY: profiles: gestor_org ON profiles; POLICY: profiles: gestor_insert ON profiles |
| 026 | `link_pipeline_to_vaga` | 28 | ADD COLUMN vagas_white_label.IF; INDEX: idx_vwl_pipeline_id; LOGIC: -- ============================================ -- 026: VINCULAR PIPELINE À VAGA -- Adiciona pipelin; LOGIC: -- 2. Adicionar constraint de chave estrangeira (opcional, mas recomendado) -- Note: pipelines pode  |
| 026 | `robust_user_trigger` | 70 | FUNCTION: handle_new_user; INSERT INTO profiles; INSERT INTO profiles |
| 027 | `fix_candidates_unique_email` | 30 | LOGIC: -- ============================================ -- 027: GARANTIR UNICIDADE DE EMAIL EM CANDIDATES -- |
| 027 | `profiles_rls_final_fix` | 49 | POLICY: profiles: gestor select ON profiles; POLICY: profiles: gestor insert ON profiles; POLICY: profiles: gestor update ON profiles; POLICY: profiles: gestor delete ON profiles; DROP POLICY: profiles: gestor manages org ON profiles |
| 028 | `add_org_id_to_pipelines` | 57 | ADD COLUMN pipelines.organization_id; ADD COLUMN pipeline_columns.organization_id; ADD COLUMN pipeline_cards.organization_id; INDEX: idx_pipelines_organization_id; INDEX: idx_pipeline_columns_organization_id |
| 028 | `link_job_candidates_to_vaga` | 21 | ADD COLUMN job_candidates.vaga_id; INDEX: idx_job_candidates_vaga_id |
| 029 | `add_career_page_fields` | 37 | ADD COLUMN organizations.IF; POLICY: orgs: members update own ON organizations; POLICY: orgs: public read ON organizations; LOGIC: -- Migração 029: Adicionar campos de personalização da Página de Carreiras na tabela organizations; LOGIC: -- 1. Adicionar colunas de personalização ALTER TABLE public.organizations |
| 030 | `add_job_category` | 49 | ADD COLUMN vagas_white_label.category; VIEW: public_vagas; LOGIC: -- 030_add_job_category.sql; LOGIC: -- Garantir que a view public_vagas seja atualizada corretamente DROP VIEW IF EXISTS public_vagas CA |
| 031 | `migrate_active_vagas` | 11 |  |
| 032 | `design_pro_fields` | 8 | ADD COLUMN organizations.IF |
| 033 | `setup_storage_bucket` | 29 | POLICY: Leitura Pública para Organizations ON storage; POLICY: Membros da Org podem fazer Upload ON storage; POLICY: Membros da Org podem Deletar ON storage; INSERT INTO storage |
| 034 | `add_page_background` | 4 | ADD COLUMN organizations.IF |
| 035 | `portal_design_settings` | 13 | ADD COLUMN organizations.IF |
| 036 | `refine_pcd_options` | 51 | VIEW: public_vagas |
| 037 | `add_custom_questions_to_vagas` | 39 | ADD COLUMN vagas_white_label.IF; VIEW: public_vagas |
| 038 | `add_branding_columns` | 11 | ADD COLUMN vagas_white_label.IF |
| 039 | `add_vaga_design` | 17 | ADD COLUMN vagas_white_label.IF |
| 040 | `add_match_score_and_bucket` | 21 | ADD COLUMN vagas_candidaturas.IF; POLICY: Leitura Pública currículos ON storage; POLICY: Upload Público de Currículos ON storage; INSERT INTO storage |
| 041 | `secure_storage_bucket` | 59 | POLICY: storage: candidates upload ON storage; POLICY: storage: recruiter access ON storage; POLICY: storage: recruiter delete ON storage; DROP POLICY: Leitura Pública currículos ON storage; DROP POLICY: Upload Público de Currículos ON storage |
| 042 | `add_invisivel_status` | 5 |  |
| 043 | `allow_public_org_read` | 9 | POLICY: organizations: public select ON organizations |
| 044 | `add_gender_age_to_applications` | 9 | ADD COLUMN vagas_candidaturas.IF |
| 045 | `add_missing_fields_to_candidates` | 21 | ADD COLUMN candidates.IF |
| 046 | `add_resumes_bucket_policies` | 35 | ADD COLUMN candidates.IF; POLICY: storage: recruiters upload resumes ON storage; POLICY: storage: recruiters select resumes ON storage; POLICY: storage: recruiters delete resumes ON storage; INSERT INTO storage |
| 047 | `create_resume_uploads` | 30 | CREATE TABLE public; RLS: resume_uploads; POLICY: Recrutadores podem ler seus uploads ON resume_uploads; POLICY: Recrutadores podem registrar uploads ON resume_uploads |
| 048 | `fix_pipeline_rls_isolation` | 45 | POLICY: pipelines: org isolation ON pipelines; POLICY: pipeline_columns: org isolation ON pipeline_columns; POLICY: pipeline_cards: org isolation ON pipeline_cards; DROP POLICY: pipelines: own ON pipelines; DROP POLICY: pipelines: owner full ON pipelines |
| 049 | `add_org_id_to_candidaturas` | 41 | ADD COLUMN vagas_candidaturas.organization_id; POLICY: candidaturas: org isolation ON vagas_candidaturas; DROP POLICY: candidaturas: org isolation ON vagas_candidaturas; INDEX: idx_vagas_candidaturas_org_id; LOGIC: -- 🚀 MIGRAÇÃO: VÍNCULO DIRETO DE ORGANIZAÇÃO EM CANDIDATURAS |
| 050 | `fix_job_candidates_unique` | 24 | LOGIC: -- 1. Remover duplicatas se existirem (mantendo apenas a mais recente); LOGIC: -- 2. Adicionar a constraint UNIQUE     IF NOT EXISTS (         SELECT 1 FROM information_schema.tab |
| 051 | `add_job_code_sequencing` | 68 | CREATE TABLE public; ADD COLUMN vagas_white_label.IF; FUNCTION: generate_vaga_job_code_persistent; TRIGGER: trg_generate_vaga_job_code; INSERT INTO job_code_counters |
| 052 | `fix_rls_and_multitenancy` | 139 | ADD COLUMN activity_logs.organization_id; ADD COLUMN candidate_screening_logs.organization_id; ADD COLUMN screening_logs.organization_id; POLICY: vagas: multitenancy_policy ON vagas_white_label; POLICY: candidates: multitenancy_policy ON candidates |
| 053 | `enable_realtime_vagas_candidaturas` | 4 |  |
| 054 | `add_missing_candidates_columns` | 39 | ADD COLUMN candidates.IF; ADD COLUMN candidates.IF; ADD COLUMN candidates.IF; ADD COLUMN candidates.IF; ADD COLUMN candidates.IF |
| 055 | `fix_storage_policy_spontaneous_paths` | 52 | POLICY: storage: recruiter access ON storage; POLICY: storage: recruiter delete ON storage; DROP POLICY: storage: recruiter access ON storage; DROP POLICY: storage: recruiter delete ON storage |
| 056 | `add_viewed_at_to_candidates` | 11 | ADD COLUMN candidates.IF; INDEX: idx_candidates_viewed_at |
| 057 | `blacklist_pipeline_prevention` | 37 | FUNCTION: handle_candidate_blacklist_change; FUNCTION: prevent_blacklisted_pipeline_link; TRIGGER: tr_candidate_blacklist_change; TRIGGER: tr_prevent_blacklisted_pipeline_link |
| 058 | `convidado_vaga_access` | 141 | CREATE TABLE convidado_vaga_access; RLS: convidado_vaga_access; POLICY: cva_gestor_select ON convidado_vaga_access; POLICY: cva_gestor_insert ON convidado_vaga_access; POLICY: cva_gestor_delete ON convidado_vaga_access |
| 059 | `rh_gestor_isolation` | 62 | POLICY: vagas: multitenancy_policy ON vagas_white_label; POLICY: pipelines: org isolation ON pipelines; POLICY: pipeline_columns: org isolation ON pipeline_columns; POLICY: pipeline_cards: org isolation ON pipeline_cards; DROP POLICY: vagas: multitenancy_policy ON vagas_white_label |
| 060 | `add_storage_policy_manual_add` | 63 | POLICY: storage: recruiter access ON storage; POLICY: storage: recruiter delete ON storage; DROP POLICY: storage: recruiter access ON storage; DROP POLICY: storage: recruiter delete ON storage |
| 061 | `rh_view_all_vagas` | 19 | POLICY: vagas: multitenancy_policy ON vagas_white_label; DROP POLICY: vagas: multitenancy_policy ON vagas_white_label |
| 062 | `create_rate_limits` | 47 | CREATE TABLE public; RLS: rate_limits; POLICY: rate_limits: deny all ON rate_limits; DROP POLICY: rate_limits: deny all ON rate_limits; INDEX: idx_rate_limits_lookup |
| 063 | `avatar_storage_policies` | 42 | POLICY: storage: users upload own avatar ON storage; POLICY: storage: users update own avatar ON storage; POLICY: storage: users delete own avatar ON storage; DROP POLICY: storage: users upload own avatar ON storage; DROP POLICY: storage: users update own avatar ON storage |
| 064 | `avatar_storage_policies_v2` | 44 | POLICY: avatars insert ON storage; POLICY: avatars update ON storage; POLICY: avatars delete ON storage; POLICY: avatars select ON storage; DROP POLICY: storage: users upload own avatar ON storage |
| 065 | `nova_hierarquia_supervisor` | 335 | POLICY: profiles: administrador_select ON profiles; POLICY: profiles: administrador_insert ON profiles; POLICY: profiles: administrador_update ON profiles; POLICY: profiles: administrador_delete ON profiles; POLICY: profiles: supervisor_select ON profiles |
| 066 | `add_brand_name` | 4 | ADD COLUMN profiles.IF; ADD COLUMN profiles.IF; ADD COLUMN profiles.IF |
| 067 | `pending_invite_status` | 67 | FUNCTION: handle_new_user; INSERT INTO profiles; INSERT INTO profiles |
| 068 | `fix_storage_spontaneous_path` | 41 | POLICY: storage: recruiter access ON storage; DROP POLICY: storage: recruiter access ON storage |
| 069 | `pool_optimization` | 27 | ADD COLUMN candidates.IF; ADD COLUMN candidates.IF; ADD COLUMN candidates.IF; INDEX: idx_candidates_tags |
| 070 | `tags_table` | 46 | CREATE TABLE tags; RLS: tags; POLICY: tags: owner_all ON tags; POLICY: tags: admin_supervisor_rh_crud ON tags; POLICY: tags: convidado_select ON tags |
| 071 | `secure_resumes_bucket_rls` | 59 | POLICY: storage: owner resumes ON storage; POLICY: storage: org resumes select ON storage; POLICY: storage: org resumes insert ON storage; POLICY: storage: org resumes delete ON storage; DROP POLICY: storage: recruiters upload resumes ON storage |
| 072 | `fix_avatars_bucket_ownership` | 42 | POLICY: avatars insert ON storage; POLICY: avatars update ON storage; POLICY: avatars delete ON storage; DROP POLICY: avatars insert ON storage; DROP POLICY: avatars update ON storage |
| 073 | `harden_rls_gaps` | 23 | POLICY: job_code_counters: service_role_only ON job_code_counters; DROP POLICY: job_code_counters: service_role_only ON job_code_counters; DROP POLICY: candidaturas: public insert ON vagas_candidaturas |
| 074 | `job_candidates_conversations_rls` | 63 | POLICY: job_candidates: org members ON job_candidates; POLICY: job_candidates: convidado select ON job_candidates; POLICY: conversations: org members ON candidate_conversations; DROP POLICY: job_candidates: own ON job_candidates; DROP POLICY: job_candidates: convidado select ON job_candidates |
| 075 | `resume_uploads_org_id` | 49 | ADD COLUMN resume_uploads.organization_id; POLICY: resume_uploads: owner full ON resume_uploads; POLICY: resume_uploads: org members ON resume_uploads; DROP POLICY: Recrutadores podem ler seus uploads ON resume_uploads; DROP POLICY: Recrutadores podem registrar uploads ON resume_uploads |
| 076 | `drop_remaining_public_insert` | 28 | DROP POLICY: Candidaturas publicas ON vagas_candidaturas; DROP POLICY: candidaturas: public insert ON vagas_candidaturas; LOGIC: -- ============================================ -- 076: Drop remaining public INSERT policies on vag |
| 077 | `unify_pool_gestao` | 185 | ADD COLUMN vagas_candidaturas.candidate_id; ADD COLUMN vagas_candidaturas.IF; DROP TABLE job_applications; RLS: vagas_candidaturas; POLICY: vagas_candidaturas: owner full ON vagas_candidaturas |
| 078 | `pool_columns_vagas_candidaturas` | 46 | ADD COLUMN vagas_candidaturas.IF; ADD COLUMN vagas_candidaturas.IF; ADD COLUMN vagas_candidaturas.IF; ADD COLUMN vagas_candidaturas.IF; INDEX: idx_vagas_candidaturas_viewed_at |
| 079 | `pool_profile_columns` | 27 | ADD COLUMN vagas_candidaturas.IF |
| 080 | `drop_legacy_tables` | 109 | DROP TABLE job_candidates; DROP TABLE jobs; INSERT INTO vagas_candidaturas; LOGIC: -- ============================================ -- 080: LIMPEZA FINAL — DROP job_candidates, jobs --; LOGIC: -- candidates com source IN ('spontaneous', 'manual_add') eram do Pool antigo. |
| 081 | `fix_increment_trigger_updates` | 61 | FUNCTION: increment_vaga_application_count; TRIGGER: increment_vaga_app_count |


---

## Regras para Novas Migrations

1. **Numerar sequencialmente** — usar `081_` se 081 já existe, usar `082_`
2. **Sempre usar `DO $$`** para idempotência (não quebrar se re-executar)
3. **Sempre `IF EXISTS` / `IF NOT EXISTS`** em DROP e CREATE
4. **Sempre `IS NOT DISTINCT FROM`** para `org_id` em políticas RLS
5. **Cobrir todos os 5 roles** em novas políticas (`owner`, `administrador`, `supervisor`, `rh`, `convidado`)
6. **Documentar no topo** do arquivo SQL o propósito da migration
7. **Inserir linha nesta tabela** após criar a migration

## Tabelas Ativas do Schema

| Tabela | Finalidade |
|--------|-----------|
| `profiles` | Usuários da plataforma (auth_id, nome, role, org) |
| `organizations` | Empresas clientes |
| `vagas_white_label` | Vagas de emprego (portais públicos) |
| `vagas_candidaturas` | Candidaturas (principal tabela de candidatos) |
| `candidates` | Pool/Banco de Talentos |
| `pipeline_cards` | Cartões do pipeline visual |
| `pipelines` | Pipelines configurados |
| `pipeline_columns` | Colunas do pipeline |
| `activity_logs` | Log de auditoria (imutável) |
| `convidado_vaga_access` | Acesso de convidados a vagas |
| `rate_limits` | Controle de rate limit das Edge Functions |
| `tags` | Tags para candidatos/features |
| `resume_uploads` | Uploads de currículo |
| `job_code_counters` | Sequenciador de códigos de vaga |
| `candidate_conversations` | Conversas do chat com candidato |
| `candidate_screening_logs` | Log de triagem de candidatos |

> **Aplicado por:** auditoria automatizada em 2026-07-14

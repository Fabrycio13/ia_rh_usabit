# Changelog — Usabit people

Mudanças notáveis do projeto, principalmente as motivadas por auditorias de segurança.

## [Unreleased] — 2026-07-29

### Removed

- **`supabase/functions/match-analysis/`** removida (135 linhas).
  - **Motivo**: código morto — nenhuma parte do frontend ou backend invocava esta função (verificado por grep em `src/` e `supabase/`).
  - **Histórico**: criada em `744c146` (julho/2025) como "nova Edge Function match-analysis + prep submit-application", recebeu fix em `c96ce79`, mas nunca foi integrada.
  - **Substituída por**: `src/core/services/jobAnalyzer.ts` + `src/core/services/cvAnalyzer.ts` (funções `analyzeJobApplication*` e `batchMatchToJob`), chamadas via edge function `openai-proxy` com auth JWT, rate-limit 60/60s, fallback OpenAI → DeepSeek, e sanitização de input via `sanitizeAIInput`.
  - **Ganho de segurança**:
    - Remove vetor de ataque (edge function sem auth e sem rate limit ficava deployada e acessível publicamente).
    - Remove uso direto de `OPENAI_API_KEY` server-side (chave só existe no `openai-proxy` agora).
    - Remove dependência `pdf-parse` incompatível com Deno.
    - Alinha com `security audit 2026-07-14` que apontou essa função como dead code.

### Added

- **`src/core/services/safeLogger.ts`** com `sanitizeAuthError()` + `safeAuthError()`.
  - Substitui `console.error` direto de mensagens do Supabase Auth em `src/pages/auth/Login.tsx`.
  - Em DEV loga raw + sanitized; em PROD loga apenas categoria genérica (`Authentication failed` / `Rate limit reached` / `Internal auth error`).
  - Previne vazar mensagens que confirmariam enumeração de usuários (`User already registered`, `Invalid email`, etc.).
  - Aplicado em: `Login.tsx`, `Register.tsx`, `SetPassword.tsx`, `Configuracoes.tsx`.
  - Em Register.tsx e SetPassword.tsx, mensagens user-facing também ficaram genéricas (não vaza "Email already registered" / "Token expirado" pro cliente final).

### Added

- **`supabase/functions/_shared/safe-logger.ts`** com `safeEdgeError()` para Deno.
  - Filtra tokens / api keys / JWTs em respostas de error antes de logar no Supabase Logs Dashboard.
  - Aplicado em **14 Edge Functions** que tinham `console.error` cru: `enrich-candidate`, `get-upload-url`, `public-job-detail`, `public-jobs`, `send-password-reset-email`, `send-invite-email`, `send-application-email`, `send-candidate-congratulations-email`, `send-candidate-thankyou-email`, `send-candidate-vaga-canceled-email`, `send-candidate-vaga-reopened-email`, `send-spontaneous-email`, `submit-application`, `submit-candidate`. (`openai-proxy` já não tinha `console.error`, sem ação necessária.)

### Changed

- **`src/pages/settings/Configuracoes.tsx` linha 470** — `getPublicUrl` substituído por `createSignedUrl(path, 3600)` no bucket `avatars` (que é privado + RLS). Também migra `profile.avatar_url` para armazenar **path** em vez de URL, regenerando signed URL a cada load (mantém URLs migradas pra trás via fallback).

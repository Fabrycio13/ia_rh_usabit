# Auditoria de Segurança — Fluxo de Upload de Currículo (Portal Público)

> **Data:** 2026-07-02
> **Escopo:** Edge Functions + storage + frontend envolvidos na candidatura espontânea
> **Origem:** Revisão disparada após observação no Network tab (token JWT visível em `*.pdf?token=...`)
> **Status:** Pendente — correções previstas para a próxima sprint

---

## Resumo

| Severidade | Quantidade |
|------------|------------|
| 🔴 Alta    | 7          |
| 🟡 Média   | 9          |
| 🟢 Baixa   | 7          |
| ❓ Dúvida  | 4          |

**Violações explícitas da constitution.md:**
- **§I (Segurança de Dados):** 🔴 PII em logs; 🔴 XSS via email; 🟡 XSS em campos não sanitizados
- **§III (TypeScript strict):** 🔴 `body.analysis: Record<string, unknown>` (any implícito); 🟡 falta validação de UUID
- **§IV (SQL/RLS em camadas):** 🔴 RLS do `storage.objects` falha para path spontaneous; 🟡 INSERT policy do storage sem restrição de path

---

## 🔴 CRÍTICOS (corrigir primeiro)

### 1. RLS do `storage.objects` não permite RH ler currículos espontâneos
- **Localização:** `supabase/migrations/041_secure_storage_bucket.sql:33-41`
- **Problema:** A policy de SELECT extrai `vaga_id` via `split_part(name, '/', 2)`. Para candidatura espontânea o path é `resumes/spontaneous/<orgId>/<file>`, então `split_part` retorna a string literal `'spontaneous'` — que **nunca** bate com `vagas_white_label.id`. Resultado: apenas `owner` consegue ler currículos espontâneos. RH/supervisor/administrador ficam sem acesso.
- **Impacto:** Bug funcional (RH não vê currículos) + risco de fix mal-ajustado liberar leitura cross-org.
- **Correção sugerida:** Trocar a policy para comparar `v.organization_id = public.get_my_org_id() AND split_part(name, '/', 3) = v.id::text` para vagas com vaga_id, **e** adicionar cláusula separada para spontaneous: `EXISTS (SELECT 1 FROM vagas_candidaturas c WHERE c.organization_id = public.get_my_org_id() AND c.candidate_email = split_part(name, '/', 4))` ou assinar policy por org via path `/spontaneous/<orgId>/`.

### 2. `submit-candidate` aceita `status` e `analysis` do cliente sem validação
- **Localização:** `supabase/functions/submit-candidate/index.ts:201-223`
- **Problema:** Frontend envia `status: 'pending'` e `analysis: null`, mas o servidor aceita o que o cliente mandar. Candidato pode injetar `status: 'approved'`, `status: 'contratado'`, ou `analysis: { score: 100, approved: true }` no próprio registro.
- **Violação:** Constitution §III + §IV.
- **Correção sugerida:** Forçar `status = 'pending'` server-side. Ignorar `body.analysis` (ou só aceitar de function com service_role e origem confiável).

### 3. `submit-candidate` não valida que `resume_url` aponta para arquivo real
- **Localização:** `supabase/functions/submit-candidate/index.ts:209, 225-229`
- **Problema:** Candidato envia qualquer string em `resume_url` (pode ser `https://atacante.com/payload.exe`, `../../../etc/passwd`). Servidor apenas persiste.
- **Correção sugerida:** Após o `insert`, fazer `supabaseAdmin.storage.from('job-applications').list(folderDoOrg)` ou gerar signed URL temporário e validar que responde 200. Alternativa: assinar o path no Edge Function e devolver token de upload que `submit-candidate` recebe como prova.

### 4. XSS no email — `firstName` raw em HTML
- **Localização:**
  - `supabase/functions/submit-candidate/index.ts:240, 264`
  - `supabase/functions/send-candidate-congratulations-email/index.ts:171`
  - `supabase/functions/send-candidate-thankyou-email/index.ts:173`
  - `supabase/functions/send-candidate-vaga-canceled-email/index.ts:173`
  - `supabase/functions/send-candidate-vaga-reopened-email/index.ts:173`
- **Problema:** `${candidateFirstName}` e `${jobTitle}` interpolados direto em `<h2>Olá, ${firstName}!</h2>`. `stripHtml` remove tags, mas caracteres como `&`, `<`, `>`, `"` ainda quebram markup e podem injetar `<img src=x onerror=...>`.
- **Violação:** Constitution §I (Anti-XSS).
- **Correção sugerida:** Aplicar `escapeHtml()` em todos os interpolados:
  ```ts
  const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  ```

### 5. `get-upload-url` com CORS `*` permite abuso cross-origin
- **Localização:** `supabase/functions/get-upload-url/index.ts:5-8`
- **Problema:** Diferente das outras funções públicas (que usam `ALLOWED_ORIGINS`), esta usa `'Access-Control-Allow-Origin': '*'`. Qualquer site malicioso pode, do navegador da vítima, gerar signed upload URLs e lotar o bucket com phishing/malware/ilegal disfarçado de "currículo válido".
- **Correção sugerida:** Aplicar a mesma `ALLOWED_ORIGINS = ['https://usabit.github.io', 'http://localhost:5173', 'http://localhost:4173']` usada nas outras funções.

### 6. `get-upload-url` aceita qualquer extensão de arquivo
- **Localização:** `supabase/functions/get-upload-url/index.ts:48-53` + `src/pages/vagas/SpontaneousApplication.tsx:482`
- **Problema:** Validação exige apenas `startsWith('resumes/')` e `!includes('..')`. Sem regex para `.pdf` no final, sem UUID check no `orgId` do path. Atacante chama `POST /get-upload-url { path: 'resumes/spontaneous/<orgId>/payload.exe' }`.
- **Correção sugerida:** Validar com regex: `^resumes\/spontaneous\/[0-9a-f-]{36}\/\d+_secure\.pdf$`.

### 7. PII em logs — `submit-candidate` loga `error.details` e `error.hint`
- **Localização:** `supabase/functions/submit-candidate/index.ts:232`
- **Problema:** `console.error('Erro no upsert de candidato:', error.message, error.details, error.hint)` — o Postgres inclui o record inteiro no `error.details` (email, telefone, CEP, endereço, nome — PII completa) e razão do erro no `error.hint`. Logs ficam no painel Supabase, backups e agregadores.
- **Violação:** Constitution §I (Nenhum PII em logs).
- **Correção sugerida:** Logar apenas `error.code` e `error.message` curta (genérica). Capturar PII só em memória para debug efêmero.

---

## 🟡 MÉDIOS (próximas sprints)

### 8. `submit-candidate` não valida `is_accepting_applications` nem `application_deadline`
- **Localização:** `supabase/functions/submit-candidate/index.ts:173-198`
- **Problema:** Verifica `is_active` e `status === 'aberta'`, mas não consulta `is_accepting_applications` (RH usa pra pausar) nem `application_deadline` (data limite).
- **Correção:** `if (!vaga.is_accepting_applications) return 400 'Vaga pausada'` + `if (vaga.application_deadline && new Date(vaga.application_deadline) < new Date()) return 400 'Vaga fora do prazo'`.

### 9. `submit-candidate` não confere `orgId` do path com `body.organization_id`
- **Localização:** `supabase/functions/submit-candidate/index.ts:200-223`
- **Problema:** Frontend gera path `resumes/spontaneous/${orgId}/...` e envia `organization_id: orgId` no body, mas função confia no body. Atacante pode: (1) `get-upload-url` para org X, (2) upload, (3) `submit-candidate` com `organization_id: Y`. Candidatura registrada para Y, arquivo em X. **LGPD grave.**
- **Correção:** Extrair `orgId` do `resume_url` (split por `/`) e comparar com `body.organization_id`. Se diferente, rejeitar 400.

### 10. Rate limit só por IP é bypassável
- **Localização:** `get-upload-url:11-12`, `submit-candidate:37-38`
- **Problema:** 10 req/min por IP é adequado contra automação burra, mas bypass trivial com botnet/Tor. Combinado com `get-upload-url` aceitando qualquer path/extensão, atacante pode encher o bucket com 10×N arquivos por minuto.
- **Correção:** Rate limit por `candidate_email` (submit-candidate: máx 3 candidaturas/email/dia) + exigir CAPTCHA/Turnstile antes de `get-upload-url`.

### 11. `submit-candidate` não valida UUID format de `organization_id`
- **Localização:** `supabase/functions/submit-candidate/index.ts:95-102, 159-163`
- **Problema:** Passa `body.organization_id` direto para `.eq()`. Sem regex UUID, payload com string arbitrária é aceito e dispara query (não-SQLi, mas permite fingerprinting/DoS).
- **Correção:** `if (!UUID_RE.test(body.organization_id)) return 400`.

### 12. Campos `address`, `complement`, `portfolio`, `linkedin` não passam por `stripHtml`/`sanitizeText`
- **Localização:** `supabase/functions/submit-candidate/index.ts:127-132`
- **Problema:** Apenas `name`, `phone`, `location`, `linkedin`, `skills`, `experience` são sanitizados. Demais vão crus pro banco.
- **Violação:** Constitution §I.
- **Correção:** Aplicar `stripHtml` + `sanitizeText` em todos os campos string antes do `insert`.

### 13. Candidate name sem escape HTML nos 4 emails transacionais
- **Localização:** ver #4.
- **Correção:** ver #4 (helper `escapeHtml()`).

### 14. `sendConfirmationEmail` é fire-and-forget sem checar resposta
- **Localização:** `supabase/functions/submit-candidate/index.ts:266-270`
- **Problema:** Function retorna 200 ao candidato sem confirmar que email foi aceito pela Resend. Se recusar, candidato fica sem feedback. `.catch(() => {})` engole erros sem logar.
- **Correção:** Logar `error` no `.catch` (sem PII), ou `await` com `try/catch` + `EdgeRuntime.waitUntil`.

### 15. `public-jobs` e `public-job-detail` não validam formato de `orgId`/`hash`
- **Localização:** `public-jobs/index.ts:23-30`, `public-job-detail/index.ts:23-30`
- **Problema:** `orgId` pode ser qualquer string até 2GB. Atacante consegue fazer fingerprinting/log amplification.
- **Correção:** `orgId` deve ser UUID; `hash` deve ser `[a-z0-9-]{8,64}`.

### 16. Storage INSERT policy não restringe path nem tamanho
- **Localização:** `supabase/migrations/041_secure_storage_bucket.sql:18-20`
- **Problema:** `WITH CHECK (bucket_id = 'job-applications')` permite que qualquer anon insira QUALQUER path. Combinado com #6, atacante pode: (1) sobrescrever arquivos existentes, (2) criar paths com nomes maliciosos, (3) encher bucket até limite.
- **Correção:** `WITH CHECK (bucket_id = 'job-applications' AND name ~ '^resumes/spontaneous/[0-9a-f-]{36}/[0-9]+_secure\.pdf$')`.

---

## 🟢 BAIXOS (documentar/limpar)

### 17. Honeypot não bloqueia o request, só esconde o toast
- **Localização:** `SpontaneousApplication.tsx:503`
- **Problema:** `if (honeypot) { toast.error('...'); return; }` — bot sofisticado ignora toast e continua.
- **Correção:** Enviar request de qualquer forma (com `honeypot` no body) e servidor silenciosamente retorna 200 sem inserir + loga IP pra análise (tarpit).

### 18. `downloadResume` em `storage.ts` é exposto mas bucket é privado
- **Localização:** `src/core/utils/storage.ts:117-138`
- **Análise:** OK funcionalmente, depende do RLS do Storage.
- **Ação:** Verificar se `downloadResume` tem callers — se não, remover.

### 19. Inconsistência CORS entre Edge Functions
- **Localização:** 3 funções usam `ALLOWED_ORIGINS`, `get-upload-url` usa `*`
- **Ação:** ver #5.

### 20. Anon key no header é o padrão correto
- **Localização:** `SpontaneousApplication.tsx:439-441, 535-537` e `storage.ts:90-91`
- **Análise:** É o padrão Supabase para Edge Functions públicas. `VITE_SUPABASE_ANON_KEY` é público por design. **Não há risco aqui** desde que funções validem input, apliquem rate limit e não confiem em JWT anon para ações privilegiadas.
- **Observação:** O `VITE_OPENAI_API_KEY` (SECURITY_BACKLOG §1) é o problema real, separado deste fluxo.

### 21. CSRF não se aplica
- **Análise:** Funções aceitam `Authorization: Bearer <token>` no header. Browsers não enviam headers customizados sem CORS preflight, e funções têm `ALLOWED_ORIGINS` (exceto #5). Sem cookies de sessão Supabase, CSRF clássico não se aplica.

### 22. `stripHtml` + `sanitizeText` já implementados (bom)
- **Localização:** `submit-candidate/index.ts:43-50`
- **Análise:** Garante que nomes com Unicode confuso ou caracteres de controle não passem.

### 23. Storage hardening (bucket privado) já está ok
- **Localização:** `supabase/migrations/041_secure_storage_bucket.sql:7-9`
- **Análise:** Migration cumpre SECURITY_BACKLOG §5. Policy de SELECT precisa de ajuste (#1).

### 24. Frontend loga `errBody` da response de submit-candidate
- **Localização:** `SpontaneousApplication.tsx:544`
- **Problema:** `console.error('submit-candidate error:', res.status, errBody)` — se Edge Function devolver mensagem de validação contendo parte dos dados, browser loga PII.
- **Correção:** Logar apenas `res.status`. Erro já é mostrado via `toast.error()`.

---

## ❓ DÚVIDAS (validar)

### D1. RLS de INSERT em `vagas_candidaturas` permite anon direto via PostgREST?
- Migrations 013, 007, 010, 020, 049, 052, 058, 065, 073, 076, 077 sobrescrevem policies. Como `submit-candidate` usa `service_role` (bypassa RLS), o problema é se a tabela é acessível anonimamente em outros pontos.
- **Ação:** Verificar migration 077 (mais recente) e se há `POLICY ... FOR INSERT TO anon` ainda ativa. Se houver, fechar com migration corretiva.

### D2. Honeypot é o único anti-bot?
- **Localização:** `SpontaneousApplication.tsx`
- **Análise:** Nenhum CAPTCHA/Turnstile. Para LGPD e custo de emails, deveria haver Turnstile ou hCaptcha invisível em `get-upload-url` ou `submit-candidate`.
- **Ação:** Adicionar Cloudflare Turnstile invisível antes de gerar signed URL.

### D3. Validação de MIME real do PDF
- **Localização:** frontend valida `file.type === 'application/pdf'`, mas Edge Function `get-upload-url` não verifica `Content-Type` no PUT nem faz magic-byte check. Atacante pode fazer upload de `.exe` renomeado pra `.pdf`.
- **Ação:** Validar magic bytes `%PDF-` no `submit-candidate` (lendo primeiros bytes do storage) ou forçar `Content-Type` no signed URL.

### D4. `createSignedUploadUrl` sobrescreve arquivos?
- Se sim, atacante pode: (1) esperar alguém se candidatar, (2) capturar `path` via Network tab (visível em `get-upload-url` response), (3) pedir nova signed URL pro mesmo path com `.exe` no lugar de `.pdf` (vide #6), (4) sobrescrever currículo original.
- **Ação:** Confirmar lendo docs do Supabase Storage. Se confirmado, gerar path com UUID v4 único por sessão + invalidar signed URL antiga após uso.

---

## Top 3 ações para a próxima sprint

1. **Arrumar RLS de SELECT do bucket** (#1) — funcional E segurança. Sem isso, RH não vê currículos espontâneos (bug) OU fix mal-ajustado permite leitura cross-org.
2. **Forçar `status = 'pending'` e ignorar `body.analysis` no `submit-candidate`** (#2) — fecha self-approval de candidato.
3. **Aplicar `escapeHtml` em todos os interpolados de email + CORS-ALLOWED_ORIGINS no `get-upload-url`** (#4, #5) — fecha XSS em email e abuso cross-origin do signed upload URL.

---

## Nota arquitetural

A função `get-upload-url` concentra 4 dos 7 issues 🔴. Como ela usa `service_role` para criar signed URL e tem CORS `*`, é o elo mais sensível do fluxo.

**Recomendação:** migrar de signed upload para **upload server-side via Edge Function que faz `storage.upload()` direto** (sem devolver URL ao cliente) — elimina toda a classe de problemas de CORS/extensão/sobrescrita. Alinhado com SECURITY_BACKLOG §5.

---

**Próxima ação:** correções na sprint de 2026-07-03+.

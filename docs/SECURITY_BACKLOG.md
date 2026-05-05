# Backlog de Segurança e Backend

Checklist priorizado para corrigir os principais riscos encontrados no projeto.

## P0 — Urgente

### 1. Remover OpenAI do frontend

**Problema:** a chave `VITE_OPENAI_API_KEY` fica exposta no bundle do navegador porque o frontend usa `dangerouslyAllowBrowser: true`.

**Arquivos afetados hoje:**
- `src/core/services/cvAnalyzer.ts`
- `src/core/services/jobAnalyzer.ts`
- `src/layouts/ChatWidget.tsx`

**Correção desejada:**
- Criar Edge Function para análise de currículo/candidatura.
- Criar Edge Function para chat/assistente interno.
- Usar `OPENAI_API_KEY` como Supabase Secret, sem prefixo `VITE_`.
- Frontend deve chamar `supabase.functions.invoke(...)` em vez de instanciar OpenAI direto.
- Rotacionar a chave OpenAI atual após a migração.

---

### 2. Proteger `send-invite-email`

**Problema:** a Edge Function usa `SUPABASE_SERVICE_ROLE_KEY`, mas não valida se quem chamou tem permissão para convidar usuários.

**Arquivo afetado:**
- `supabase/functions/send-invite-email/index.ts`

**Correção desejada:**
- Ler o JWT do usuário chamador.
- Validar o usuário no Supabase.
- Checar role/permissão antes de gerar convite.
- Impedir criação/convite de roles acima do permitido.
- Manter service role apenas para operações administrativas internas da função.

---

### 3. Proteger `send-application-email` contra abuso/spam

**Problema:** a função aceita `candidateEmail`, `candidateName` e `jobTitle` vindos do client e pode ser usada para envio arbitrário de e-mails.

**Arquivo afetado:**
- `supabase/functions/send-application-email/index.ts`

**Correção desejada:**
- Receber apenas `applicationId` ou outro identificador seguro.
- Buscar candidatura/vaga no banco dentro da Edge Function.
- Enviar e-mail somente se a candidatura existir.
- Adicionar limite contra reenvio abusivo, se possível.

---

## P1 — Alta prioridade

### 4. Tornar candidatura pública mais segura

**Problema:** `vagas_candidaturas` permite insert público amplo com `WITH CHECK (true)` em migrations antigas/finais.

**Arquivos relacionados:**
- `supabase/migrations/013_nova_hierarquia.sql`
- `supabase/migrations/049_add_org_id_to_candidaturas.sql`
- `src/pages/vagas/JobApplication.tsx`

**Correção desejada:**
- Criar uma Edge Function ou RPC segura para submissão de candidatura.
- Validar se a vaga existe, está ativa e aceita candidaturas.
- Garantir que `organization_id` bate com a vaga.
- Evitar confiar apenas no frontend para regras de segurança.

---

### 5. Restringir upload público de currículos

**Problema:** o bucket `job-applications` permite upload público amplo para viabilizar candidatura pública.

**Arquivo relacionado:**
- `supabase/migrations/041_secure_storage_bucket.sql`

**Correção desejada:**
- Mover upload para Edge Function ou signed upload controlado.
- Validar vaga/hash antes do upload.
- Limitar path, tipo de arquivo e tamanho no fluxo servidor.
- Manter bucket privado.

---

### 6. Salvar path do currículo, não `publicUrl`

**Problema:** o código usa `getPublicUrl` mesmo em buckets privados. O correto é salvar o caminho do arquivo e gerar signed URL na hora de visualizar.

**Arquivos afetados:**
- `src/pages/vagas/JobApplication.tsx`
- `src/core/contexts/AnalysisContext.tsx`
- `src/core/utils/storage.ts`

**Correção desejada:**
- Salvar `file_path`/path interno no banco.
- Usar `createSignedUrl` para visualização.
- Manter compatibilidade temporária com registros antigos, se necessário.

---

## P2 — Média prioridade

### 7. Rever Edge Functions públicas que usam service role

**Problema:** `public-jobs` e `public-job-detail` usam `SUPABASE_SERVICE_ROLE_KEY`. Os selects são explícitos, mas qualquer descuido pode vazar dados porque service role ignora RLS.

**Arquivos afetados:**
- `supabase/functions/public-jobs/index.ts`
- `supabase/functions/public-job-detail/index.ts`

**Correção desejada:**
- Validar formato de `orgId` e `hash`.
- Manter DTO/select extremamente restrito.
- Considerar migrar leitura pública para views/RLS com anon key, se fizer sentido.

---

### 8. Remover credenciais hardcoded de scripts

**Problema:** `scripts/audit.cjs` contém Supabase URL e anon key hardcoded.

**Arquivo afetado:**
- `scripts/audit.cjs`

**Correção desejada:**
- Ler variáveis via `.env`/ambiente.
- Remover valores fixos do código.
- Garantir que scripts de auditoria não gravem dados sensíveis por acidente.

---

### 9. Organizar migrations futuras

**Problema:** existem migrations com numeração duplicada e histórico difícil de seguir.

**Ponto de atenção:** não renomear migrations já aplicadas em produção sem planejamento.

**Correção desejada:**
- Não mexer no histórico aplicado sem necessidade.
- Criar migrations novas para correções de estado final.
- Padronizar sequência numérica daqui para frente.
- Evitar migrations que fazem drop amplo de policies fora do escopo.

---

## Ordem sugerida de execução

1. Remover OpenAI do frontend.
2. Proteger `send-invite-email`.
3. Proteger `send-application-email`.
4. Criar fluxo seguro para candidatura pública.
5. Restringir upload público de currículos.
6. Salvar path de currículo e usar signed URLs.
7. Revisar Edge Functions públicas com service role.
8. Limpar scripts com credenciais hardcoded.
9. Padronizar migrations futuras.

# Auditoria de Segurança — Autenticação e Portal Público de Vagas

> **Data:** 2026-07-31
> **Escopo:** login, recuperação de senha, convite/definição de senha, cadastro público, leitura pública de vagas, candidatura, banco de talentos espontâneo, upload de currículo, Edge Functions, Storage e RLS relacionadas
> **Branch/HEAD:** `feat/security-hardening` — `d886aea`
> **Projeto Supabase:** `dfsqdfetzcwvmfphljzs`
> **Modo:** auditoria e probes não destrutivos; nenhuma candidatura, usuário ou arquivo foi criado
> **Status geral:** **REPROVADO para segurança** — há falhas de integridade e upload confirmadas nas Edge Functions implantadas, além de uma possível escalação crítica de privilégio no SQL de `profiles` que precisa de confirmação no banco ao vivo

---

## 1. Resumo executivo

Não foi encontrada evidência de que o portal público permita **ler currículos ou PII de outros candidatos**. O login também não revela diretamente se um e-mail existe, e o cadastro público está desligado.

Entretanto, a superfície pública implantada ainda tem falhas relevantes:

1. A Edge Function de upload em produção aceita um `path` controlado pelo cliente e não valida vaga, organização ou proprietário.
2. As APIs públicas de candidatura implantadas aceitam campos internos como status, score, origem e análise.
3. O upload espontâneo implantado não verifica MIME, magic bytes, tamanho real nem vínculo arquivo–tenant.
4. O rate limiter implantado é concorrente e fail-open.
5. O SQL versionado permite que o usuário atualize qualquer coluna da própria linha em `profiles`, incluindo `user_role`, `status`, `organization_id` e `account_type`. Isso forma uma cadeia potencial de escalação para `owner`.
6. As correções recentes do Git não estão implantadas; ao mesmo tempo, o código local ainda não está pronto para deploy porque o `deno check` falha e algumas brechas permanecem.

### Severidades consolidadas

| Severidade | Quantidade | Observação |
|---|---:|---|
| 🔴 Crítica | 1 | Escalação para `owner` no SQL versionado; estado ao vivo não pôde ser consultado sem Docker/senha do banco |
| 🔴 Alta | 6 | Upload, mass assignment, rate limit remoto, convite cross-tenant, status de contas e rota alternativa de candidatura |
| 🟡 Média | 9 | DTO comercial, consentimento, validações, senha, timing, logs, drift e gates |
| ✅ Controles confirmados | 8 | Signup bloqueado, RLS anon insert, login genérico, CORS, XSS, hash, secrets e build |

### 1.1 Revalidação do que já havia sido implementado

> **Revalidado em:** 2026-07-31, após conferência do usuário. O HEAD continua em `d886aea`. A distinção abaixo evita confundir “feito no Git” com “ativo em produção”.

| Item | Git atual | Produção | Classificação correta |
|---|---|---|---|
| Cadastro público fechado | Rota `/registro` redireciona | `/auth/v1/settings`: `disable_signup=true` | ✅ **Feito e ativo** |
| Insert anônimo direto em candidaturas | RLS versionada | Probe ao vivo bloqueou com `401/42501` | ✅ **Feito e ativo** |
| Login/recuperação com resposta genérica | Implementado | Fluxo implantado não diferencia pelo corpo | ✅ **Feito e ativo** |
| Path de currículo gerado pelo servidor | `get-upload-url` local gera por `jobId`/`orgId` | v12 ainda aceita `path` do cliente | 🟡 **Feito no Git, não implantado** |
| Allowlist e campos internos fixos no banco de talentos | `submit-candidate` ignora `status/source/skills/analysis` e tem idempotência | v30 ainda aceita esses campos | 🟡 **Feito no Git, não implantado** |
| Hierarquia de convites, incluindo owner não criar owner | Frontend e servidor locais bloqueiam | v80 remota mantém exceção que permite owner → owner | 🟡 **Feito no Git, não implantado** |
| Safe logger nas funções auditadas | Presente localmente | versões remotas ainda usam logs brutos em pontos do fluxo | 🟡 **Feito no Git, não implantado** |
| Trigger sem default `owner` | migration `082` usa `pendente` | ledger remoto termina na `067` | 🟡 **Migration criada, não aplicada** |
| Bloqueio de conta inativa em `get_my_role()` | migration `086` criada | não aplicada | 🟡 **Migration criada, não aplicada** |
| Bloqueio de status nas Edge Functions | presente em `openai-proxy`, `enrich-candidate` e fluxo autenticado de upload | funções remotas são anteriores | 🟡 **Parcial no Git, não implantado** |
| Magic bytes e tamanho do currículo | existe em `submit-application` | não existe nas funções remotas; `submit-candidate` local também não chama a validação | 🟡 **Parcial** |
| Rate limit fail-closed | helper local bloqueia se RPC falhar | remoto usa `COUNT + INSERT` e libera em erro; RPC local ainda não serializa concorrência | 🟡 **Parcial** |
| Omitir empresa/salário quando ocultos | não implementado | não implementado | 🔴 **Pendente** |
| Remover mass assignment de `submit-application` | ainda aceita `status`, `match_score`, `source` e `answers` | também vulnerável | 🔴 **Pendente** |
| Proteger colunas privilegiadas de `profiles` | não existe trigger/grant por coluna | estado ao vivo não confirmado | 🔴 **Pendente crítico no Git** |
| Impedir transferência de conta existente entre tenants | fluxo ainda converte `email_exists` em recovery e faz upsert do profile | remoto mantém o mesmo comportamento | 🔴 **Pendente** |
| Validar currículo no banco espontâneo | `submit-candidate` não valida arquivo/path | remoto também não valida | 🔴 **Pendente** |
| Remover `vaga_id` da rota espontânea | ainda aceito | ainda aceito | 🔴 **Pendente** |
| Senha mínima maior que 6 | não implementado | não confirmado no Auth remoto | 🟡 **Pendente** |
| Deno gate | 3 erros em 2 funções | não se aplica às versões antigas implantadas | 🔴 **Pendente antes de deploy** |

**Prova do drift:** os hashes SHA-256 locais e remotos diferem para `get-upload-url`, `submit-application`, `submit-candidate`, `public-jobs`, `public-job-detail` e `send-invite-email`. O inventário remoto continua com deploys de 22-23/07, enquanto os commits de hardening são de 29-30/07. As migrations `068` a `086` permanecem ausentes no banco remoto.

---

## 2. Achados críticos e altos

### AUTH-01 — 🔴 CRÍTICA — usuário pode alterar a própria role no SQL versionado

**Evidências:**

- `supabase/migrations/052_fix_rls_and_multitenancy.sql:133-138` cria `profiles: universal_self_access` como `FOR ALL`.
- A policy só restringe a linha por `auth.uid() = id`; RLS não restringe colunas.
- Não foi encontrada migration posterior com grant por coluna ou trigger imutabilizando `user_role`, `organization_id`, `status` e `account_type`.
- `supabase/migrations/086_get_my_role_status_check.sql:6-14` confia em `profiles.user_role` e mantém fallback para `owner` quando a role é nula.
- `src/pages/auth/SetPassword.tsx:51-56` confirma que UPDATE direto do próprio perfil é parte do fluxo esperado.

**Cenário:** um usuário autenticado como `convidado`, `rh`, `supervisor` ou `administrador` chama diretamente o REST do Supabase e atualiza sua linha para `user_role='owner'`, `status='active'` e `organization_id=NULL`. As policies que confiam em `get_my_role()` passam então a tratá-lo como owner global.

**Estado:** confirmado no SQL atual. A policy real de produção não pôde ser consultada: `supabase db dump --linked` exigiu Docker Desktop, que está desligado. Não foi executado PATCH real com usuário para evitar alteração destrutiva.

**Ação P0:** criar migration superseding que separe UPDATE de campos básicos e impeça usuários comuns de alterar colunas privilegiadas, preferencialmente com trigger `BEFORE UPDATE` + RPC administrativa autorizada. Testar com token real de cada role.

---

### UPLOAD-01 — 🔴 ALTA — produção aceita path de upload controlado pelo cliente

**Evidência implantada:** cópia read-only de `get-upload-url` produção v12, linhas 37-59 e 79-92.

A função aceita `{ bucket, path }`, exige apenas prefixo `resumes/` e ausência de `..`, depois gera uma signed upload URL usando service role. Não valida:

- vaga;
- organização;
- status/aceite da vaga;
- proprietário;
- contexto do candidato.

**Cenário:** qualquer pessoa com a anon key pública pede uma URL para `resumes/<id-de-outro-tenant>/arquivo.pdf`, cria objetos em namespace alheio e consome quota.

**Ação P0:** gerar o path exclusivamente no servidor a partir de `jobId`/`orgId` validado e UUID aleatório; nunca aceitar path completo do cliente.

---

### UPLOAD-02 — 🔴 ALTA — produção não valida conteúdo, tamanho nem vínculo do currículo

**Evidências implantadas:**

- `submit-application` produção v13 grava `resume_url` diretamente em suas linhas 150-168.
- `submit-candidate` produção v30 grava `resume_url` diretamente em suas linhas 173-195.
- `_shared/validation.ts` remoto não contém `validateUploadedFile`.
- O bucket não possui `allowed_mime_types` nem `file_size_limit` nas migrations versionadas.

**Cenário:** atacante obtém signed URL, envia HTML, executável ou arquivo enorme e associa o objeto a uma candidatura. O recrutador pode depois baixar/abrir conteúdo não-PDF.

**Ação P0:** impor limite no bucket, validar MIME + tamanho antes/depois do upload, verificar `%PDF`/magic bytes, excluir objeto inválido e validar vínculo exato entre path, vaga e organização em ambos os endpoints.

---

### APPLICATION-01 — 🔴 ALTA — mass assignment nas candidaturas implantadas

**Evidências implantadas:**

- `submit-application` produção v13 aceita/persiste `status`, `match_score`, `source` e `answers`.
- `submit-candidate` produção v30 aceita/persiste `status`, `source`, `skills`, `experience` e `analysis`.

**Cenário:** cliente envia `status='hired'`, `match_score=100` ou análise falsa. O painel do recrutador pode exibir/ordenar o registro como se esses dados fossem internos ou produzidos por IA.

**Ação P0:** DTO allowlist explícito; ignorar campos desconhecidos; definir server-side `status='pending'`, `match_score=0`, `source` fixo e análise nula. Validar esquema e tamanho de `answers`.

---

### RATE-01 — 🔴 ALTA — rate limiter implantado é não atômico e fail-open

**Evidência implantada:** `_shared/rate-limit.ts:13-22` remoto executa `COUNT` e `INSERT` separados, ignora erros e retorna `true`.

**Cenário:** rajadas concorrentes passam acima do limite; falha de banco faz o limitador liberar chamadas. Isso afeta listagem, detalhes, submissões e upload.

**Ação P0/P1:** RPC realmente serializada (advisory lock, contador por janela com upsert/constraint ou serviço dedicado), fail-closed e testes concorrentes.

---

### AUTH-02 — 🔴 ALTA — contas `inactive`/`pending` não são bloqueadas de forma consistente

**Evidências:**

- `src/App.tsx:57-89` protege rotas apenas pela existência de sessão.
- `src/core/contexts/UserContext.tsx:85-130` carrega `status`, mas não bloqueia nem desloga.
- `supabase/migrations/086_get_my_role_status_check.sql:8-13` bloqueia somente `inactive`; `pending` recebe sua role normal.
- A migration `086` não aparece aplicada no ledger remoto.
- `send-invite-email` local não valida o status do caller.
- `SetPassword.tsx:51-56` tenta reativar o perfil diretamente.

**Risco:** perfil pendente pode usar permissões antes de concluir o convite; inativo com sessão/token pode continuar em rotas/funções que não validam status; a self-policy permite tentativa de auto-reativação.

---

### AUTH-03 — 🔴 ALTA — convite de e-mail existente pode mover conta entre tenants

**Evidência local:** `send-invite-email/index.ts:104-111,131-139,202-215` transforma `email_exists` em recovery e depois faz upsert sobrescrevendo organização e role do perfil existente.

**Cenário:** administrador do tenant A convida o e-mail conhecido de alguém do tenant B; o perfil pode ser reassociado/reclassificado antes do aceite.

**Ação P0:** se e-mail já existe, não alterar profile e não gerar recovery como substituto de convite. Retornar resposta genérica e criar fluxo administrativo explícito de transferência, com autorização de ambos os tenants/owner.

---

### APPLICATION-02 — 🔴 ALTA — `submit-candidate` é rota alternativa para candidatura em vaga

A API pública aceita `vaga_id`, embora seu caller normal seja candidatura espontânea. Ela não valida `is_accepting_applications`, currículo, consentimento, perguntas obrigatórias ou vínculo do arquivo.

**Cenário:** chamada direta cria candidatura mínima numa vaga aberta sem passar por `submit-application`.

**Ação:** remover `vaga_id` do contrato espontâneo ou aplicar exatamente as mesmas regras do endpoint oficial.

---

## 3. Achados médios

### PUBLIC-01 — 🟡 dados comerciais “ocultos” continuam no JSON público

`public-jobs` e `public-job-detail` implantadas retornam sempre `company_name`, `company_logo`, `salary_min` e `salary_max`. O frontend apenas deixa de renderizar quando `show_company_name=false` ou `has_salary_range=false`.

**Risco:** uma vaga confidencial/terceirizada ou salário oculto pode ser descoberto inspecionando a resposta HTTP.

**Correção:** omitir/nullificar esses campos no DTO server-side conforme as flags.

---

### APPLICATION-03 — 🟡 consentimento e validações existem apenas no navegador

Os endpoints não registram/validam server-side:

- aceite, versão e timestamp do consentimento LGPD;
- honeypot;
- currículo obrigatório;
- perguntas obrigatórias e opções válidas;
- limites/estrutura de `answers`;
- idade/gênero permitidos.

Além disso, quando o upload retorna `null`, os formulários ainda tentam criar o registro.

---

### APPLICATION-04 — 🟡 vínculo de path espontâneo com vaga/tenant é inconsistente no código local

`submit-application` local aceita qualquer path começando por `resumes/spontaneous/` para qualquer vaga. `submit-candidate` local não valida arquivo/path.

---

### AUTH-04 — 🟡 recuperação de senha tem possível enumeração por tempo

O corpo é genérico, mas e-mail inexistente termina após o GoTrue; e-mail existente faz consulta e chamada ao Resend. Medições repetidas podem distinguir latências.

**Correção:** equalizar caminho/latência e aplicar limite por IP + hash normalizado do e-mail.

---

### AUTH-05 — 🟡 política de senha da aplicação aceita 6 caracteres

`SetPassword.tsx:32-42` e `Configuracoes.tsx:225-228` aceitam mínimo 6. A configuração remota não expôs `password_min_length` em `/auth/v1/settings`.

**Correção:** mínimo 12, bloquear senhas comuns/comprometidas e manter regra coerente no Auth remoto.

---

### LOG-01 — 🟡 versões implantadas registram detalhes brutos de banco

`submit-application` remoto e `submit-candidate` remoto escrevem `error.details` e `error.hint` nos logs. Não há vazamento desses detalhes na resposta HTTP, mas logs podem conter schema e PII.

---

### DEPLOY-01 — 🟡 drift entre Git e produção

- Cinco funções públicas e helpers implantados diferem do código local.
- Deploys remotos datam de 22/07; hardenings locais relevantes vieram em 29-30/07.
- O frontend local atual envia `{ jobId/orgId }`, mas `get-upload-url` remoto exige `{ path }`; deploy parcial pode quebrar candidatura.

**Regra:** deploy coordenado após correção e Deno gate; comparar hashes remotos depois.

---

### DENO-01 — 🟡 código local não passa `deno check`

Confirmado com `npx -y deno check`:

- `submit-application/index.ts:158` — `corsHeaders` inexistente;
- `submit-application/index.ts:168` — `corsHeaders` inexistente;
- `submit-candidate/index.ts:74` — cast incompatível de `Object.fromEntries`.

Não fazer deploy das funções locais antes de corrigir esses erros.

---

### RATE-02 — 🟡 RPC local chamada “atômica” ainda tem race condition

`083_atomic_rate_limit.sql:25-39` faz `COUNT` seguido de `INSERT` sem lock/constraint serializadora. A função SQL roda em uma transação, mas transações concorrentes ainda podem contar antes de enxergar inserts umas das outras.

---

## 4. Controles verificados e falsos positivos descartados

### ✅ Cadastro público bloqueado

- `src/App.tsx:59` redireciona `/registro` para `/login`.
- `/auth/v1/settings` retornou `disable_signup=true`.
- `Register.tsx` existe, mas está sem rota/caller: código morto e risco de regressão, não brecha ativa.

### ✅ Insert anônimo direto em `vagas_candidaturas` bloqueado em produção

Probe não destrutivo `POST {}` retornou:

```text
HTTP 401
DB_CODE 42501
new row violates row-level security policy
```

Nenhum registro foi criado. Essa evidência ao vivo prevalece sobre a leitura incompleta do ledger de migrations.

### ✅ Login não enumera diretamente usuário

`Login.tsx:20-24` sempre mostra “Email ou senha inválidos”.

### ✅ Recuperação não enumera pelo corpo

A Edge Function retorna `{ success: true }` para e-mail ausente, rate limit e falhas internas. Resta apenas o canal temporal.

### ✅ Sem open redirect encontrado

Convite e recuperação usam `APP_URL` server-side; não aceitam destino do request.

### ✅ Sem XSS confirmado no portal

Descrições são renderizadas como JSX/texto. Balões com HTML usam sanitização via DOMPurify. Não foi encontrado HTML bruto de candidato renderizado sem sanitização no escopo.

### ✅ Hash público não é enumerável de forma prática

`public_hash` é aleatório e o detalhe exige hash exato. IDs públicos não foram tratados como segredo.

### ✅ CORS implantado usa allowlist

Origin não permitida recebe `Access-Control-Allow-Origin: https://rh.usabitspace.com`, portanto o navegador não libera a resposta ao site atacante. CORS não substitui autorização, mas não foi classificado como brecha aqui.

### ✅ Nenhum secret privado encontrado no código/bundle

Varredura redigida:

- candidatos a secret em arquivos rastreados: **0**;
- candidatos a secret privado no bundle: **0**;
- `.env.local`: presente, não rastreado e ignorado;
- `testsprite_tests/tmp/config.json`: presente, não rastreado e ignorado;
- Gitleaks não está instalado, portanto histórico Git não foi varrido com essa ferramenta nesta rodada.

---

## 5. Gates e qualidade da evidência

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit --incremental false` | ✅ 0 erros |
| `npm run build` | ✅ sucesso |
| `npm test -- --run` | ✅ 155/155 |
| `npm run lint` | ❌ 8 erros, 1 warning |
| `npx -y deno check` nas 7 funções do escopo | ❌ 3 erros em 2 funções |
| Varredura redigida de secrets tracked + bundle | ✅ 0 candidatos privados |

### Atenção: testes verdes com warnings/falsos verdes

- Testes de `Vagas` registram `TypeError` nos mocks de `.update().eq()`/`.delete().eq()` e ainda passam.
- Há warnings de `act(...)` em componentes de candidatos.
- Portanto, 155/155 não significa cobertura suficiente dos fluxos de segurança.
- Não existem testes que provem proteção das colunas privilegiadas de `profiles`, status de conta, convite cross-tenant, upload malicioso ou mass assignment.

---

## 6. Ordem segura de correção

### Fase 0 — contenção imediata

1. **Não executar `supabase db push` indiscriminadamente.** As migrations pendentes incluem a `084`, cuja policy de INSERT continua aplicável a `PUBLIC` e pode permitir bypass direto do Storage.
2. Criar migration superseding que proteja colunas privilegiadas de `profiles` e remova fallback inseguro para `owner`.
3. Corrigir DTOs e uploads locais; fazer `deno check` ficar 100% verde.
4. Corrigir `send-invite-email` para não reassociar e-mail existente e validar caller `status='active'`.
5. Fazer deploy coordenado de `get-upload-url`, `submit-application`, `submit-candidate` e `_shared`.
6. Verificar hashes/versões implantadas e executar probes de regressão.

### Fase 1 — proteção do fluxo público

1. Bucket com `file_size_limit` e `allowed_mime_types`.
2. Magic bytes, tamanho e vínculo exato em ambos os submissions.
3. Consentimento LGPD versionado/timestamp server-side.
4. Remover rota alternativa por `submit-candidate(vaga_id)`.
5. Omitir empresa/salário do DTO quando configurados como ocultos.
6. Rate limit serializado e limite secundário por e-mail/contexto.

### Fase 2 — robustez de autenticação

1. Bloqueio uniforme de `pending` e `inactive` no frontend, RLS e todas as EFs internas.
2. Senha mínima de 12 e compromised-password protection.
3. Equalizar tempo de recuperação.
4. Remover `Register.tsx`/teste morto ou adicionar gate que impeça reintrodução da rota.

---

## 7. Veredito direto

- **Há vazamento público confirmado de currículos/PII de candidatos?** Não encontrei evidência no escopo auditado.
- **Login/cadastro estão abertos?** Cadastro público está bloqueado; login usa mensagem genérica.
- **Portal público está seguro contra adulteração?** Não. As APIs implantadas permitem adulterar campos internos e têm upload insuficientemente validado.
- **Existe risco de acesso administrativo indevido?** Sim, crítico no SQL versionado; falta confirmar a policy ao vivo antes de afirmar exploração atual.
- **Pode implantar o código local atual como está?** Não. O Deno gate falha e ainda existem falhas de upload/DTO/policy.

---

## 8. Limitações

- `supabase db dump --linked` falhou porque Docker Desktop está desligado; não foi possível ler `pg_policies` remoto para confirmar ao vivo `profiles: universal_self_access`.
- Nenhum exploit destrutivo foi executado: não alteramos role, não criamos usuário/candidatura e não subimos arquivo malicioso.
- O histórico completo do Git não foi escaneado por Gitleaks porque a ferramenta não está instalada.

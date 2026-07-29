# Revalidação End-to-End e Security Hardening — IA RH

> **Data:** 2026-07-29  
> **Branch auditada:** `usabit-people-v_1.4`  
> **Commit local:** `ebf7c759c174a6a1e19a12748d3baf614fca6921`  
> **Domínio validado:** `https://rh.usabitspace.com`  
> **Projeto Supabase:** `dfsqdfetzcwvmfphljzs`  
> **Lentes:** Clean Engineering + Security Hardening  
> **Status:** **NÃO APROVADO para deploy ou atestado de segurança**

## 1. Veredito executivo

A aplicação compila, o lint passa e os 130 testes terminam verdes. Isso, porém, não representa o estado de segurança do sistema como um todo. A revalidação encontrou controles positivos, mas também três riscos críticos, múltiplos riscos altos e divergência completa entre Edge Functions versionadas e produção.

### Classificação geral

| Dimensão | Veredito |
|---|---|
| Frontend TypeScript | ✅ `npx tsc --noEmit` — exit 0 |
| ESLint | ✅ `npm run lint` — exit 0, sem warning do ESLint |
| Build | ✅ `npm run build` — exit 0 |
| Testes | ⚠️ 130/130 passam, mas há falsos verdes e warnings |
| Cobertura | 🔴 Baixa: 34,95% statements; 25,69% branches |
| Deno / Edge Functions | 🔴 Todas falham no `deno check` do repositório |
| Dependências | 🔴 12 vulnerabilidades: 6 high, 3 moderate, 3 low |
| Secrets | 🔴 Chave Resend completa no HEAD e 49 achados históricos |
| Auth / signup | 🔴 Signup aberto + autoconfirm + default `owner` global |
| RLS | ⚠️ Smoke anônimo básico passou; policies remotas completas não foram extraídas |
| Storage | 🔴 Avatar público; uploads públicos/assinados insuficientemente vinculados |
| Rate limit | 🔴 15/18 EFs; implementação não atômica e fail-open |
| Edge Functions remotas | 🔴 18 ativas; 3 não versionadas; 15 divergentes do Git |
| Auditoria anterior | 🔴 Parcialmente correta, mas não confiável como atestado de produção |

### Achados críticos

1. **Signup público cria super-admin global.** A configuração remota retornou `disable_signup=false` e `mailer_autoconfirm=true`. `Register.tsx` expõe `/#/registro`, e `067_pending_invite_status.sql` cria perfil com `target_role := COALESCE(..., 'owner')`. As policies definem `owner` como super-admin global, sem isolamento por organização.
2. **`manage-users` autoriza service role por metadado editável.** A função ativa em produção usa `user.user_metadata.role === 'admin'` antes de listar/criar/alterar/excluir usuários com `SUPABASE_SERVICE_ROLE_KEY`. `user_metadata` não é fonte confiável de autorização.
3. **Credencial Resend completa está versionada.** Gitleaks encontrou a chave em `supabase/functions/send-invite-email/README.md:10`; ela também permanece no histórico Git.

> [!IMPORTANT]
> Até corrigir os P0, o sistema deve ser tratado como potencialmente acessível cross-tenant por qualquer pessoa capaz de criar conta.

## 2. Metodologia e evidências

Foram executados, sem confiar no relatório anterior:

- leitura da constituição, postura de segurança, backlog, pentests e auditoria de 29/07;
- `git status`, branch, HEAD e histórico;
- `npx tsc --noEmit`;
- `npm run lint`;
- `npm test`;
- `npm run build` e build Vite isolado;
- cobertura V8 com Vitest 4.1.10;
- `npm audit --json` e inspeção da cadeia de dependências;
- `npx deno check` em cada Edge Function;
- `npx supabase functions list --output json`;
- download via API de todas as 18 Edge Functions remotas;
- comparação SHA-256 entre repo e produção;
- Gitleaks v8.30.1 no HEAD e em todo o histórico;
- smoke test REST/RLS e Storage com chave anon, sem exibir dados;
- smoke E2E no domínio produtivo e verificação de console;
- leitura das 80 migrations SQL, com foco na cadeia final 069–081.

### Limitações explícitas

- As policies remotas completas e a lista de migrations aplicadas não foram extraídas por falta de conexão SQL administrativa; o smoke REST prova apenas o comportamento anônimo observado.
- Não foi criado usuário de ataque para evitar efeitos colaterais. O P0 de signup é sustentado por configuração remota + UI produtiva + trigger versionado + policies versionadas.
- Não foram enviados e-mails, arquivos, chamadas OpenAI ou requests SSRF durante a auditoria.
- Não foi confirmado se a chave Resend versionada ainda está ativa; por estar exposta, a rotação é obrigatória independentemente disso.

## 3. Qualidade, lint, TypeScript, build e warnings

### 3.1 Resultado mecânico

```text
TSC_EXIT=0
LINT_EXIT=0
TEST_EXIT=0
BUILD_EXIT=0
Test Files 28 passed (28)
Tests      130 passed (130)
```

### 3.2 Warnings e falsos verdes

Os testes não estão limpos:

- `tests/vagas/vagas.test.tsx` registra quatro `TypeError` em operações `update().eq()` e `delete().eq()`, mas os testes passam porque o erro é capturado pelo componente e não há assert de sucesso real;
- `PipelineLinkSection` e `PoolAddCandidate` geram warnings de atualização fora de `act(...)`;
- PDF.js avisa para usar o build `legacy` em Node;
- `safeLogger` revela raw error em ambiente de teste/dev, esperado para debug, mas gera ruído e pode acostumar a suíte a aceitar logs sensíveis;
- não há política de falhar testes quando `console.error`, unhandled rejection ou warning inesperado aparece.

### 3.3 Cobertura medida

```text
Statements : 34.95% (1599/4575)
Branches   : 25.69% (1232/4795)
Functions  : 27.34% (350/1280)
Lines      : 38.01% (1472/3872)
```

O provider de cobertura não está declarado no projeto. Foi instalado temporariamente em `node_modules`, sem alteração em `package.json`/lockfile, apenas para a medição.

### 3.4 CI/CD

`.github/workflows/main.yml` não executa:

- ESLint;
- build em pull request;
- Deno check das Edge Functions;
- npm audit;
- Gitleaks;
- cobertura/threshold;
- validação de migrations;
- teste de divergência entre EFs do Git e produção.

Outros gaps:

- `contents: write` está no workflow inteiro, inclusive quality job;
- há excludes obsoletos ou perigosos, inclusive `tests/security/ai_bypass.test.ts`;
- pushes na branch `usabit-people-v_1.4` não disparam CI;
- deploy GitHub Pages permanece versionado apesar do domínio atual não depender desse fluxo, gerando drift operacional;
- actions usam tags móveis, não SHA pinado.

## 4. Dependências

`npm audit --json` no lockfile:

```text
critical: 0
high:     6
moderate: 3
low:      3
total:   12
```

| Pacote | Severidade | Direto | Observação |
|---|---:|---:|---|
| `react-router-dom` / `react-router` | high | sim/transitiva | fix sugerido pelo audit exige mudança de versão potencialmente breaking |
| `brace-expansion` | high | não | correção disponível |
| `fast-uri` | high | não | correção disponível |
| `js-yaml` | high | não | correção disponível |
| `postcss` | high | não | correção disponível |
| `dompurify` | low | sim | correção disponível; sanitizador é controle XSS central |
| `hono`, `@hono/node-server`, MCP SDK | moderate | não | entram principalmente pela dependência `shadcn` |
| `body-parser`, `esbuild` | low | não | correção disponível |

`shadcn` é CLI de scaffolding, mas está em `dependencies`; deve migrar para `devDependencies` ou ser removido do runtime para reduzir superfície transitiva.

## 5. Secrets e exposição

### 5.1 HEAD atual

Gitleaks encontrou 15 ocorrências. Triagem:

- **confirmado real:** `supabase/functions/send-invite-email/README.md:10` — chave Resend completa;
- exemplos truncados: 3 documentos de API e `tests/setup.ts` — não são credenciais completas;
- falso positivo: spec legado `future-pt-en`.

### 5.2 Histórico Git

Gitleaks encontrou 49 ocorrências históricas, incluindo JWTs em bundles commitados, scripts antigos, docs de integração e a chave Resend. Remover do HEAD não elimina o acesso pelo histórico.

### 5.3 Disco local

`.env.local` está ignorado e contém quatro classes detectadas: GCP/Google, OpenAI, anon JWT e API key genérica. Valores não foram exibidos. O fato de estarem ignorados é positivo; validade/rotação não foi confirmada.

### 5.4 Bundle

O scan do bundle encontrou somente JWT anon da Supabase, esperado e público por definição. Não foi detectada chave privada OpenAI/GCP no JavaScript gerado.

## 6. Autenticação, autorização e sessão

### SEC-CRIT-01 — Signup público gera `owner` global

**Evidência:**

- Auth remoto: `AUTH_DISABLE_SIGNUP=False`;
- Auth remoto: `AUTH_MAILER_AUTOCONFIRM=True`;
- produção: `https://rh.usabitspace.com/#/registro` renderiza formulário sem convite;
- `Register.tsx` chama `supabase.auth.signUp()`;
- migration 067 usa default `owner`;
- migration 065 define owner como super-admin global.

**Impacto:** leitura e alteração cross-tenant de perfis, vagas, candidatos, logs e demais tabelas cobertas pelas policies globais de owner; acesso a funções internas que aceitam owner.

### SEC-CRIT-02 — `manage-users` confia em `user_metadata.role`

A função remota, ausente do repo, valida usuário e depois confia em `user.user_metadata.role`. Com service role, expõe operações administrativas de Auth. O correto é autorização por `app_metadata` emitido por servidor ou por perfil/RPC com policy confiável, nunca metadado controlado pelo usuário.

### SEC-HIGH-01 — Status de conta não revoga acesso

`App.tsx` protege rotas apenas por presença de sessão. As policies e EFs leem role/org, não `profiles.status`. Usuários `inactive` ou `pending` com sessão válida mantêm acesso até revogação externa/expiração.

### SEC-MED-01 — Política de senha fragmentada e fraca

`SetPassword.tsx` e `Configuracoes.tsx` aceitam 6 caracteres; Register não compartilha o mesmo validator. A política remota do Auth não foi obtida. Recomendação: 12+ caracteres, bloqueio de senhas comprometidas quando disponível e validator compartilhado, com servidor como fonte de verdade.

### SEC-MED-02 — Reset limitado só por IP

`send-password-reset-email` retorna resposta genérica, o que reduz enumeração, mas usa apenas IP. Falta chave secundária baseada em e-mail normalizado e hasheado, rate limit nativo do Supabase Auth e telemetria de abuso.

## 7. Edge Functions — produção real

A API de gerenciamento confirmou:

```text
REMOTE_FUNCTION_COUNT=18
REMOTE_VERIFY_JWT_TRUE=18
```

Três EFs órfãs foram atualizadas em 2025-11-10. As demais foram atualizadas entre 2026-07-22 e 2026-07-23. Logo, o commit local de 29/07 não está deployado.

### 7.1 Drift

- repo: 15 funções;
- produção: 18 funções;
- órfãs: `analyze-resumes`, `manage-users`, `update-n8n-webhook`;
- 15/15 funções comuns têm conteúdo diferente por SHA-256;
- `_shared/safe-logger.ts` não está no pacote remoto;
- produção usa `rh.usabitspace.com` no CORS, mas o repo regrediu 10 funções para `usabit.github.io`;
- deploy em lote do repo atual pode quebrar produção.

### 7.2 Matriz resumida

| Função remota | Categoria | Auth de aplicação | Rate limit | Veredito |
|---|---|---|---|---|
| `analyze-resumes` | pública por anon JWT | nenhuma identidade/role | não | 🔴 encaminha Base64/PII para webhook e loga dados |
| `manage-users` | administrativa | JWT + `user_metadata.role` | não | 🔴 escalada para service role |
| `update-n8n-webhook` | administrativa | nenhuma além do gateway | não | 🔴 SSRF/POST arbitrário |
| `enrich-candidate` | interna/mista | service role ou role, sem org/status | sim, falho | 🔴 BOLA cross-tenant + custo IA |
| `get-upload-url` | pública | anon JWT | sim, falho | 🔴 assina path arbitrário em `job-applications/resumes/` |
| `submit-candidate` | pública | anon JWT | sim, falho | 🔴 aceita campos internos controlados pelo candidato |
| `submit-application` | pública | anon JWT | sim, falho | 🟠 aceita `resume_url` sem vínculo forte com upload/vaga/org |
| `openai-proxy` | interna | JWT + role DB, sem status | sim, falho | 🟠 modelo/tokens/body/tools sem caps robustos |
| `send-application-email` | pública | ID de candidatura | sim, falho | 🟠 spam dirigido por ID |
| `send-spontaneous-email` | pública | ID de candidato | sim, falho | 🟠 spam dirigido por ID |
| `send-password-reset-email` | pública | e-mail | sim, IP | 🟡 genérica, mas sem chave por identidade |
| `public-jobs` | pública | anon JWT | sim, falho | 🟡 comportamento público correto; método não é reforçado |
| `public-job-detail` | pública | anon JWT | sim, falho | 🟡 comportamento público correto; método não é reforçado |
| 4 EFs de status de candidato | interna | JWT + role + org, sem status | sim, falho | 🟡 auth razoável; logger/CORS duplicados |
| `send-invite-email` | interna | JWT + role + org, sem status | sim, falho | 🟠 amplificada pelo owner global; secret em README |

### 7.3 `deno check`

As 15 funções do repo falham no Deno check. Causas principais:

- tipo incompatível de `ReturnType<typeof createClient>` no helper de rate limit;
- chamadas `safeEdgeError(scope, object)` quando o segundo argumento exige string;
- chamadas com quatro argumentos;
- acesso a `error.message` sem narrowing em paths específicos;
- import npm de `pdf-parse` sem configuração compatível.

Em runtime, `safeEdgeError(scope, object)` pode chamar `.replace()` sobre objeto e mascarar o erro original. Portanto, o safe logger não está pronto para deploy.

### 7.4 Rate limit

O helper faz:

1. `COUNT` de linhas na janela;
2. compara com o limite;
3. `INSERT` separado;
4. ignora erro de select/insert e retorna `true`.

Consequências:

- requests concorrentes observam o mesmo count e ultrapassam o limite;
- indisponibilidade/erro da tabela libera requests (fail-open);
- tabela cresce continuamente, sem rotina versionada de expurgo;
- IP não é chave suficiente para reset/email/upload;
- as três EFs órfãs não usam rate limit.

## 8. Banco, RLS e migrations

### Controles positivos observados

Smoke REST anônimo remoto:

```text
profiles:            0 linhas visíveis
activity_logs:       0 linhas visíveis
vagas_candidaturas:  0 linhas visíveis
organizations:       leitura pública intencional
vagas_white_label:   2 linhas, ambas status aberta
```

Isso confirma que as tabelas mais sensíveis não estavam anonimamente legíveis no teste e que a policy pública de vagas filtra o status observado.

### Gaps

1. **`activity_logs` não é append-only.** A policy final usa `FOR ALL`, permitindo UPDATE/DELETE a usuários que satisfazem a policy.
2. **`resume_uploads.organization_id` permanece nullable.** Com `IS NOT DISTINCT FROM`, perfis sem organização podem coincidir com linhas órfãs `NULL`.
3. **Integridade vaga/org não é garantida em `vagas_candidaturas`.** A policy valida `organization_id` da linha, não que `vaga_id` pertença à mesma organização. Um membro pode gerar relacionamento cross-tenant e acionar contador em vaga alheia.
4. **`get_convidado_vaga_ids()` é `SECURITY DEFINER` sem `SET search_path`.** Viola o padrão de hardening exigido pela constituição.
5. **Estado remoto das 80 migrations não foi comprovado.** Não existe `supabase/config.toml` versionado e não houve conexão SQL administrativa.
6. **Role `owner` mistura platform admin e tenant owner.** Esse acoplamento é a raiz do P0 de signup.

## 9. Storage, uploads e arquivos

### Avatar

- remoto: anon conseguiu listar objeto em `avatars`;
- migrations mantêm leitura pública;
- signed URL não torna bucket público em privado;
- `Configuracoes.tsx` gera prévia inválida `signed:${path}?t=...`;
- `handleSave` pode persistir esse valor inválido, sobrescrevendo o path correto;
- não há validação de MIME/tamanho/magic bytes no upload do avatar;
- remove foto apenas limpa banco, não remove objeto do Storage.

### Currículos

- `get-upload-url` aceita apenas bucket/path e assina qualquer path prefixado com `resumes/`;
- não vincula token a vaga, organização, candidatura, usuário, MIME, tamanho ou hash;
- validações de PDF/10 MB existem no frontend, mas não no servidor;
- policy histórica de INSERT público em `job-applications` não foi explicitamente removida pela migration 076, permitindo possível bypass da EF;
- bucket `resumes` permite INSERT a qualquer autenticado com validação ampla de bucket;
- `submit-application` aceita referência de arquivo enviada pelo cliente sem provar posse/origem.

## 10. IA, prompt injection e custos

### Positivos

- entradas principais passam por normalização NFKC e filtros de prompt injection;
- prompts server-side existem para operações estruturadas;
- proxy exige JWT de usuário e role permitida;
- parser/normalização existe no frontend.

### Gaps

- sanitização por regex não é boundary de segurança e pode ser contornada;
- formato legado aceita `messages` e `tools` vindos do cliente;
- `model` e `max_tokens` são controlados pelo cliente sem allowlist/cap rígido;
- não há limite claro de bytes/imagens/body por request;
- 50 requests/minuto por usuário com respostas grandes ainda permite custo elevado;
- `enrich-candidate` recebe `rawText` do cliente e não valida tenant;
- signup owner transforma rate limit por usuário em contas descartáveis;
- logs de IA/EF ainda podem conter IDs, tamanhos, nomes e erros suficientes para PII operacional.

## 11. XSS, HTML e frontend

### Positivos

- DOMPurify é usado no helper de HTML;
- usos ativos de HTML perigoso foram encontrados com sanitização ou conteúdo controlado;
- ReactMarkdown não habilita HTML bruto por padrão;
- login e signup usam mensagens genéricas para o usuário.

### Gaps

- DOMPurify tem advisory aberto na versão resolvida;
- `ALLOWED_ATTR` inclui `style`, ampliando superfície de CSS injection/abuso visual;
- existe uma cópia completa futura do app em `.opencode/specs/future-pt-en/source`, com código inseguro/obsoleto que scanners tratam como produção;
- Evolution API key é carregada no browser e usada diretamente em requests, expondo a credencial a qualquer usuário com acesso ao perfil/DevTools;
- `UserContext` usa `user_metadata` para decisões otimistas de premium; decisões de entitlement devem vir do servidor.

## 12. LGPD e auditabilidade

- logs de atividade são mutáveis;
- não há política técnica completa de retenção/expurgo;
- deleção de candidato em UI não garante remoção de arquivos, logs, análises e cópias relacionadas;
- não há fluxo comprovado de direito ao esquecimento end-to-end;
- consentimento e base legal não estão representados de forma auditável no fluxo de candidatura;
- EFs órfãs enviam currículo/PII a webhook externo sem controle versionado de finalidade, allowlist ou retenção;
- Evolution API key e conversas são tratadas no cliente, aumentando exposição de dados pessoais.

## 13. Clean Engineering

### Métricas

- `src/`: 85 arquivos TS/TSX, aproximadamente 32.656 linhas;
- EFs: 28 arquivos TS, aproximadamente 3.724 linhas;
- migrations: 80 arquivos, aproximadamente 4.357 linhas;
- testes: 29 arquivos, aproximadamente 2.420 linhas.

### God components

| Arquivo | Linhas |
|---|---:|
| `src/pages/candidates/Pipeline.tsx` | 2.451 |
| `src/pages/vagas/VagaForm.tsx` | 2.381 |
| `src/pages/vagas/Vagas.tsx` | 1.978 |
| `src/pages/vagas/JobApplication.tsx` | 1.566 |
| `src/pages/settings/Configuracoes.tsx` | 1.532 |
| `src/pages/vagas/PoolTalentos.tsx` | 1.391 |
| `src/pages/dashboard/AdminDashboard.tsx` | 1.371 |
| `src/features/analysis/CandidatePanel.tsx` | 1.349 |
| `src/common/components/AddCandidateModal.tsx` | 1.220 |

Consequências: baixa testabilidade, responsabilidades misturadas, mocks frágeis, maior chance de regressão e dificuldade de aplicar autorização consistente.

### Drift e duplicação

- EFs duplicam CORS, auth, role checks, rate limit, Resend e uma imagem Base64 enorme;
- 15 funções do Git não refletem produção;
- três funções de produção não existem no Git;
- `.opencode/specs/future-pt-en/source` replica código da aplicação;
- documentos e workflow ainda referenciam GitHub Pages enquanto o domínio produtivo segue outra infraestrutura;
- `shadcn` runtime introduz dependências de CLI/MCP desnecessárias.

## 14. Validação da auditoria original de 29/07

### Correto

- tsc, lint, build e testes terminavam com exit 0;
- `match-analysis` não está no repo nem na lista remota;
- login/auth usa copy genérica;
- `activity_logs` não é imutável;
- senha de 6 caracteres é fraca;
- há gaps de retenção/direito ao esquecimento;
- caminhos de currículo passaram a usar URLs assinadas para leitura.

### Incorreto, incompleto ou sem evidência suficiente

| Alegação original | Revalidação |
|---|---|
| 0 achados altos | **Falso.** Há P0 e múltiplos altos. |
| 15 EFs cobertas | **Falso para produção.** Há 18 ativas. |
| safeLogger protege produção | **Falso.** Não deployado; repo não compila e tem chamadas inválidas. |
| EFs TypeScript limpas | **Falso.** `tsc` não cobre Deno; todas falham no check. |
| avatars privados por signed URL | **Falso.** Bucket/listagem seguem públicos e há bug de persistência. |
| sem warnings | **Falso.** Há warnings e TypeErrors durante testes. |
| rate limit presente e efetivo | **Parcial.** 15/18, não atômico e fail-open. |
| estado de produção validado | **Falso.** Repo diverge integralmente do remoto. |
| migrations até 068 | **Desatualizado.** Repo vai a 081, com 80 arquivos. |
| secrets controlados | **Falso.** Resend key completa no HEAD e histórico. |

### Conclusão sobre o documento anterior

A auditoria original é útil como histórico de intenção e de checks do frontend, mas **não deve ser usada como atestado de segurança nem de produção**. Ela misturou estado do Git, estado remoto e sucesso de ferramentas que não cobriam as Edge Functions.

## 15. Priorização

### P0 — conter em até 24 horas

1. desabilitar signup público temporariamente;
2. corrigir o modelo `owner` global/tenant e o trigger de criação de perfil;
3. desabilitar `manage-users` e reconstruir autorização;
4. rotacionar a chave Resend e remover a credencial do HEAD;
5. desabilitar ou restringir `update-n8n-webhook` e `analyze-resumes`;
6. congelar deploy de EFs a partir do repo até reconciliar produção/Git.

### P1 — 1 a 3 dias

1. versionar as 18 EFs e `config.toml`;
2. zerar Deno check;
3. criar rate limiter atômico e fail-closed;
4. corrigir BOLA em `enrich-candidate`;
5. endurecer upload e DTOs públicos;
6. aplicar caps/allowlists no OpenAI proxy;
7. tornar status/inativação efetivos;
8. tornar activity log append-only;
9. corrigir dependências high.

### P2 — 1 a 2 semanas

1. fortalecer senha/reset;
2. corrigir constraints/policies RLS residuais;
3. mover Evolution API para backend;
4. corrigir avatar e tornar bucket coerente com decisão de privacidade;
5. elevar cobertura, remover falsos verdes e ativar quality gates;
6. implementar retenção, consentimento e direito ao esquecimento.

### P3 — contínuo

1. decompor god components;
2. centralizar middleware de EF;
3. remover cópias/artefatos obsoletos;
4. consolidar deploy/CI e observabilidade.

O plano executável detalhado está em [`../../../.opencode/plans/security-hardening-2026-07-29.md`](../../../.opencode/plans/security-hardening-2026-07-29.md).

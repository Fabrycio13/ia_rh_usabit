# Plano de Security Hardening e Clean Engineering — IA RH

> **Data:** 2026-07-29  
> **Branch de referência:** `usabit-people-v_1.4`  
> **Base:** `docs/security/audits/2026-07-29-revalidacao-end-to-end.md`  
> **Postura:** defesa em profundidade, least privilege, fail-closed, tenant isolation e evidência executável.

## Regra de execução

- Não fazer deploy em produção antes dos critérios de aceite da fase correspondente.
- Não considerar “corrigido” por alteração de frontend: cada controle deve existir no servidor, banco ou gateway quando aplicável.
- Não confiar em `user_metadata`, IDs enviados pelo cliente, CORS, validação de MIME declarada pelo browser ou rate limit somente por IP.
- Não invalidar senhas existentes automaticamente.
- Não reintroduzir Turnstile sem investigação independente.
- Toda alteração de Edge Function exige `deno check`, teste local/integrado e confirmação de deploy remoto.
- Toda alteração de RLS exige teste positivo e negativo com pelo menos dois tenants e roles diferentes.
- Todo secret exposto deve ser rotacionado antes de ser removido do código.
- Não reescrever histórico Git sem autorização explícita e plano de coordenação.

---

# Fase 0 — Contenção imediata (P0, antes de qualquer novo deploy)

## H-00.1 — Fechar criação pública de contas

**Problema:** Auth remoto está com `disable_signup=false` e `mailer_autoconfirm=true`; `Register.tsx` é público; o trigger pode criar `owner` global.

**Ações:**

- [ ] No Supabase Dashboard, definir signup como fechado temporariamente (`disable_signup=true`) ou exigir convite.
- [ ] Não confiar em `user_role` vindo de `raw_user_meta_data` no trigger.
- [ ] Alterar o trigger para criar usuário novo com role não privilegiada e status `pending`, sem organização privilegiada.
- [ ] Fazer aprovação/associação de organização por fluxo server-side autorizado.
- [ ] Separar `platform_admin` de `organization_owner`; não usar `owner` global como role de self-signup.
- [ ] Definir explicitamente o que acontece com cadastro sem convite: rejeitar, `pending` sem dados tenant ou criar tenant isolado.

**Aceite:**

- signup sem convite não produz role privilegiada;
- `raw_user_meta_data` não consegue escolher `owner`, `admin` ou `supervisor`;
- teste com usuário novo em Tenant A não lê nem altera Tenant B;
- nenhuma policy usa `owner` global para um usuário de tenant sem a claim server-side correta;
- configuração do Dashboard documentada e verificada.

## H-00.2 — Desativar/reconstruir `manage-users`

**Problema:** EF remota órfã libera operações Admin Auth com `user.user_metadata.role === 'admin'`.

**Ações:**

- [ ] Desabilitar imediatamente a função remota se não for indispensável.
- [ ] Se indispensável, trazer a fonte para `supabase/functions/manage-users`.
- [ ] Autorizar por `app_metadata` emitido por servidor ou RPC SQL protegida; nunca por `user_metadata`.
- [ ] Exigir role de plataforma, não apenas role de tenant.
- [ ] Validar `profile.status`, organização e ação permitida.
- [ ] Aplicar allowlist de campos mutáveis; nunca aceitar role/metadata privilegiado livremente.
- [ ] Rate limit, auditoria append-only e resposta genérica.

**Aceite:**

- usuário comum não consegue virar admin alterando seus próprios metadados;
- usuário de Tenant A não administra usuário de Tenant B;
- operações de criação, alteração e exclusão têm teste negativo;
- função está versionada, compilada com Deno e listada no inventário de deploy.

## H-00.3 — Rotacionar credenciais expostas

**Problema:** chave Resend completa em `supabase/functions/send-invite-email/README.md:10`; 49 ocorrências históricas detectadas.

**Ações:**

- [ ] Revogar/rotacionar a chave Resend no provedor.
- [ ] Confirmar que o novo valor existe somente em secret manager/Supabase Secrets.
- [ ] Remover o valor do README e substituir por `[REDACTED]`/placeholder.
- [ ] Procurar o valor antigo em logs, CI, artefatos e backups acessíveis.
- [ ] Avaliar purge histórico somente com autorização explícita e coordenação dos remotes.
- [ ] Rotacionar também `.env.local` se as chaves GCP/OpenAI ainda forem válidas ou tiverem sido compartilhadas.

**Aceite:**

- Gitleaks no HEAD não encontra segredo privado;
- Gitleaks no bundle não encontra chave privada;
- teste de uso da chave antiga falha (executado pelo responsável do provedor, sem expor valor);
- secrets do deploy estão documentados por nome, nunca por valor.

## H-00.4 — Conter funções órfãs e drift de produção

**Problema:** produção tem 18 EFs; o repo tem 15; `analyze-resumes`, `manage-users` e `update-n8n-webhook` não estão versionadas. As funções comuns divergiram do Git.

**Ações:**

- [ ] Congelar deploy das 15 funções do repo atual.
- [ ] Exportar as 18 funções remotas para branch de reconciliação, preservando evidência.
- [ ] Decidir explicitamente: manter, corrigir ou remover cada órfã.
- [ ] Atualizar CORS para `rh.usabitspace.com` em um único helper/configuração.
- [ ] Criar inventário versionado: nome, dono, finalidade, público/interno, `verify_jwt`, secrets, dependências e último deploy.
- [ ] Adicionar check CI que compare nomes locais com funções esperadas no ambiente alvo.

**Aceite:**

- não existem funções ativas sem fonte e owner;
- nenhum deploy pode apagar/reverter CORS ou controles remotos sem revisão;
- `supabase functions list` bate com o inventário versionado.

---

# Fase 1 — Correções P1 de segurança (1–3 dias)

## H-01 — Corrigir Deno e safe logger

**Problema:** `deno check` falha nas EFs; chamadas `safeEdgeError` usam objeto/quantidade de argumentos incompatível e podem quebrar o próprio tratamento de erro.

**Ações:**

- [ ] Definir assinatura estrita: `safeEdgeError(scope, message, detail?)` com `unknown` normalizado com segurança.
- [ ] Corrigir todas as chamadas para não passar objeto como `message`.
- [ ] Normalizar `unknown` sem acessar `.message` sem narrowing.
- [ ] Fixar imports/versionamento Deno e resolver `pdf-parse`.
- [ ] Executar `deno check` em todas as 18 EFs versionadas.
- [ ] Remover PII de logs: nome, e-mail, currículo, URL, conteúdo bruto, tokens e mensagens completas.

**Aceite:**

```text
deno check supabase/functions/*/index.ts -> exit 0
```

Além disso, teste de erro deve produzir resposta genérica sem lançar nova exceção.

## H-02 — Rate limit atômico e fail-closed

**Problema:** helper faz `COUNT` e `INSERT` separados, permite corrida e ignora erro do banco.

**Ações:**

- [ ] Criar RPC SQL atômica ou tabela com contador/window e `INSERT ... ON CONFLICT`/lock apropriado.
- [ ] Em erro de storage/RPC, bloquear a operação de risco (`fail-closed`).
- [ ] Adicionar expiração/limpeza indexada de janelas antigas.
- [ ] Usar chaves combinadas: IP + e-mail normalizado/hasheado para reset; usuário + endpoint para IA; IP + fingerprint de upload para público.
- [ ] Limitar body, concorrência e custo por identidade.
- [ ] Cobrir as três órfãs ou remover as funções.

**Aceite:**

- teste concorrente não ultrapassa o limite configurado;
- indisponibilidade do rate-limit retorna 429/503, nunca libera;
- queries antigas não crescem sem limite;
- relatório lista limite por endpoint.

## H-03 — Corrigir BOLA em `enrich-candidate`

**Problema:** role é validada, mas não há vínculo do candidato com a organização do caller.

**Ações:**

- [ ] Resolver caller org/role no servidor.
- [ ] Buscar candidato com filtro tenant-aware no mesmo query/RLS.
- [ ] Permitir service-role apenas em chamada interna autenticada por mecanismo não forjável e com escopo mínimo.
- [ ] Trocar `includes(SUPABASE_SERVICE_ROLE_KEY)` por validação exata de credencial interna; preferir secret de função/assinatura interna.
- [ ] Adicionar timeout, tamanho máximo de `rawText`, limite de imagens e custo por candidato.
- [ ] Não aceitar `organizationId` do cliente como autoridade.

**Aceite:**

- caller Tenant A recebe 404/403 para candidato Tenant B;
- owner de tenant não vira platform admin;
- chamada interna válida funciona;
- chamada com token parcial/forjado falha.

## H-04 — Fechar cadeia de upload

**Problema:** `get-upload-url` assina path arbitrário; storage tem policies amplas; `submit-application` aceita `resume_url` enviado pelo cliente.

**Ações:**

- [ ] Gerar o path no servidor a partir de `application_id`/nonce, nunca aceitar path livre.
- [ ] Vincular token a vaga, organização, candidatura, expiração, MIME, tamanho e hash.
- [ ] Revalidar MIME real/magic bytes após upload; não confiar no `Content-Type` do browser.
- [ ] Remover policies públicas históricas de INSERT em `storage.objects` e confirmar no banco remoto.
- [ ] Separar buckets: avatar, currículo e anexos, cada um com política mínima.
- [ ] Limitar tamanho, extensão, número de uploads e retenção.
- [ ] Não permitir overwrite de outro candidato.
- [ ] `submit-application` aceitar apenas upload emitido para a mesma candidatura/vaga.

**Aceite:**

- não é possível obter URL para path de outro tenant;
- upload executável/HTML/MIME falso é rejeitado;
- replay/expiração do token falha;
- leitura pública de currículo retorna 401/403;
- teste direto em `storage.objects` não bypassa a EF.

## H-05 — Reduzir DTOs públicos

**Problema:** `submit-candidate` aceita `analysis`, `status`, `source`, `skills`, `experience` e outros campos internos controlados pelo anônimo.

**Ações:**

- [ ] Definir schema server-side allowlist para campos públicos.
- [ ] Ignorar/rejeitar status, análise, flags internas, org efetiva e ownership enviados pelo cliente.
- [ ] Derivar organização/vaga a partir de identificador público assinado.
- [ ] Validar comprimento, Unicode, e-mail, telefone e campos aninhados.
- [ ] Aplicar idempotência para evitar candidaturas duplicadas.

**Aceite:**

- payload com role/status/analysis não altera estado interno;
- org inexistente ou vaga de outra org falha;
- payload grande e aninhado recebe 400/413;
- duplicata é tratada de forma idempotente.

## H-06 — Limitar IA e proteger custo

**Ações:**

- [ ] Allowlist de modelos server-side.
- [ ] Caps server-side para tokens, bytes, mensagens, imagens e tools.
- [ ] Remover formato legado livre ou converter para DTO estruturado.
- [ ] Timeout e retry limitado em chamadas OpenAI.
- [ ] Quota diária/mensal por organização/usuário.
- [ ] Separar prompts de sistema de dados do usuário e aplicar output schema/validação.
- [ ] Logar apenas metadados mínimos de custo, sem prompt/currículo.

**Aceite:**

- modelo/token/tools enviados pelo cliente fora da allowlist falham;
- payload gigante recebe 413;
- timeout não deixa request pendurado;
- quota é aplicada server-side.

## H-07 — Tornar status e revogação efetivos

**Ações:**

- [ ] Policies e EFs devem exigir `status = active`.
- [ ] `pending`, `inactive`, `suspended` e expirado não acessam dados nem IA.
- [ ] Revogar sessões/refresh tokens ao suspender conta.
- [ ] Evitar decisão de autorização somente em `App.tsx`/contexto.
- [ ] Testar sessão existente após alteração de status.

**Aceite:** usuário inativado com sessão antiga recebe 401/403 em dados, Storage e EFs.

## H-08 — Corrigir audit trail

**Ações:**

- [ ] Remover UPDATE/DELETE de usuários e roles comuns em `activity_logs`.
- [ ] Permitir apenas INSERT controlado por servidor/RPC.
- [ ] Se exclusão LGPD exigir, tombstone/retention separado, com trilha de motivo.
- [ ] Adicionar hash chain ou mecanismo equivalente se o log for evidência de auditoria.

**Aceite:** tentativa de UPDATE/DELETE por qualquer role operacional falha; INSERT contém actor, tenant, ação, alvo e timestamp server-side.

## H-09 — Corrigir dependências

**Ações:**

- [ ] Atualizar `react-router`, `brace-expansion`, `fast-uri`, `js-yaml`, `postcss`, `body-parser`, `esbuild`, `dompurify` conforme changelogs e testes.
- [ ] Se atualização breaking não puder ocorrer, aplicar mitigação documentada e pin seguro.
- [ ] Mover `shadcn` para `devDependencies` ou removê-lo do runtime.
- [ ] Adicionar `npm audit --omit=dev` ao CI com baseline temporário explicitamente justificado.

**Aceite:** zero high/critical; low/moderate restantes têm owner, prazo e justificativa.

---

# Fase 2 — Correções P2 de privacidade e qualidade (1–2 semanas)

## H-10 — Avatar coerente e privado

- [ ] Escolher uma decisão: bucket público ou privado; não misturar.
- [ ] Para privado, remover SELECT público/bucket público.
- [ ] Persistir somente `avatar_path` canônico.
- [ ] Ao carregar, gerar signed URL e usar a URL real na preview.
- [ ] Nunca persistir `signed:` ou URL expirada.
- [ ] Remover objeto antigo ao substituir/deletar, com tratamento idempotente.
- [ ] Validar imagem, tamanho e dimensões server-side.

**Aceite:** upload → preview imediata → reload → signed URL válida → expiração → nova URL; sem URL pública permanente.

## H-11 — Corrigir RLS e constraints cross-tenant

- [ ] Tornar `resume_uploads.organization_id` NOT NULL após backfill seguro.
- [ ] Eliminar uso de `IS NOT DISTINCT FROM` onde `NULL` não representa tenant válido.
- [ ] Criar constraint/trigger que `vagas_candidaturas.organization_id = vaga.organization_id`.
- [ ] Revisar todas as FKs que atravessam tenant.
- [ ] Adicionar `SET search_path = public, pg_temp` a todo `SECURITY DEFINER`.
- [ ] Revogar EXECUTE público desnecessário.

**Aceite:** suíte RLS com Tenant A/B, owner de tenant, platform admin, RH, supervisor, convidado e anon; inclui SELECT/INSERT/UPDATE/DELETE e Storage.

## H-12 — Password/reset

- [ ] Definir política Auth de 12+ caracteres e bloqueio de senhas comprometidas.
- [ ] Criar validator compartilhado entre Register, SetPassword e Configurações.
- [ ] Adicionar rate limit nativo do Supabase Auth.
- [ ] Adicionar segunda chave de reset por e-mail normalizado/hasheado.
- [ ] Manter mensagens genéricas e não invalidar senhas existentes sem decisão.

**Aceite:** UI e Auth rejeitam senha fraca; reset não enumera e não permite abuso por troca de IP simples.

## H-13 — Evolution API server-side

- [ ] Remover API key do perfil retornado ao browser.
- [ ] Criar EF/backend proxy autenticado por org/role.
- [ ] Armazenar secret em secret manager.
- [ ] Allowlist de endpoints, timeout, payload e rate limit.
- [ ] Remover chave de logs e respostas.

## H-14 — LGPD

- [ ] Mapear finalidade, base legal, consentimento e retenção para currículo, candidatura, IA, e-mail e WhatsApp.
- [ ] Versionar política de privacidade e termos linkados no cadastro/portal.
- [ ] Criar fluxo de exportação e exclusão por sujeito.
- [ ] Implementar cascade/retention que cubra profiles, candidates, applications, resumes, analysis, logs e integrações.
- [ ] Implementar expurgo agendado e relatório de execução.
- [ ] Documentar terceiros: OpenAI, Resend, n8n e Evolution API.

**Aceite:** solicitação de titular produz inventário de dados, prazo, exclusão e evidência sem deixar currículo órfão no Storage.

## H-15 — Testes e CI

- [ ] Adicionar `eslint`, `tsc`, `build`, `npm audit`, Gitleaks e Deno check ao CI.
- [ ] Remover excludes obsoletos; nenhum teste de segurança pode ser excluído sem ticket/justificativa.
- [ ] Corrigir mocks de Vagas para que TypeError falhe o teste.
- [ ] Falhar por `console.error`, unhandled rejection e warning inesperado, com allowlist pequena.
- [ ] Declarar provider de cobertura no projeto e thresholds progressivos: 50% → 65% → 80% statements/branches relevantes.
- [ ] Criar testes de integração locais para EFs, com Supabase local ou ambiente efêmero.
- [ ] Pin de GitHub Actions por SHA e permissions mínimas por job.
- [ ] Rodar CI em push/PR da branch `usabit-people-v_1.4`.

**Aceite:** PR não passa sem todos os gates; output não contém warnings não tratados; cobertura aparece no CI.

---

# Fase 3 — Clean Engineering (contínua, após P0/P1)

## H-16 — Decompor componentes grandes

Ordem sugerida:

1. `Pipeline.tsx`: data hooks, mutations, DnD, modais, apresentação;
2. `VagaForm.tsx`: schema/form steps, persistence service, pipeline setup, UI;
3. `Configuracoes.tsx`: perfil, segurança, organização, usuários, plano, integrações;
4. `Vagas.tsx` e `PoolTalentos.tsx`: query hooks + commands + views;
5. `CandidatePanel.tsx` e `AdminDashboard.tsx`.

**Regra:** extrair sem mudança visual/funcional, cada extração acompanhada de teste de comportamento.

## H-17 — Centralizar middleware de Edge Functions

Criar `_shared` versionado para:

- CORS configurável por ambiente;
- método HTTP;
- autenticação;
- role/org/status;
- rate limit;
- body size;
- resposta de erro genérica;
- logger sanitizado;
- timeout/fetch seguro.

Nenhuma EF nova deve duplicar esses controles.

## H-18 — Remover drift e código morto

- [ ] Importar/revisar as três EFs órfãs.
- [ ] Remover apenas após confirmação de caller e undeploy verificado.
- [ ] Separar specs futuras/copied source do scanner de produção ou arquivar de modo explícito.
- [ ] Remover docs com exemplos que se parecem com secrets.
- [ ] Centralizar domínio/origins e fonte de deploy.
- [ ] Garantir que `package.json`, lock, CI e documentação apontem para o mesmo runtime.

## H-19 — Observabilidade segura

- [ ] Métricas de auth failures, rate-limit rejects, upload rejects, IA tokens/custo, RLS denies e e-mail enviado.
- [ ] Alertas sem PII e com correlation ID não reversível.
- [ ] Runbook para rotação de secret, revogação de sessão, incidente cross-tenant e rollback.
- [ ] Dashboard de funções: versão, último deploy, owner, erro e latência.

---

# Ordem recomendada de execução

1. **Agora:** fechar signup, conter `manage-users`/órfãs, rotacionar Resend, congelar deploy.
2. **Depois:** reconciliar produção/Git e versionar as 18 EFs.
3. **P1:** Deno/safe logger, rate limit atômico, BOLA, uploads, DTOs e IA.
4. **Gate de segurança:** RLS/Storage com dois tenants + integração de EFs + Gitleaks + audit zero high.
5. **P2:** status/revogação, avatar, senha/reset, LGPD, Evolution API.
6. **CI:** ativar todos os gates antes de qualquer novo deploy.
7. **Clean Engineering:** decompor componentes e eliminar duplicação/drift.

# Critério final de aprovação

O projeto só pode ser declarado “end-to-end seguro para release” quando todos os itens abaixo forem evidenciados por output real:

- [ ] signup não cria privilégio global;
- [ ] nenhum usuário consegue alterar sua própria role privilegiada;
- [ ] nenhum teste cross-tenant positivo/negativo falha;
- [ ] as 18 EFs estão versionadas, compiladas e reconciliadas;
- [ ] verify_jwt, auth, role, org e status estão testados por EF;
- [ ] rate limit é atômico e fail-closed;
- [ ] uploads não permitem path/tenant/MIME/tamanho arbitrários;
- [ ] bucket de currículo e avatar tem privacidade coerente;
- [ ] zero segredo privado no HEAD, histórico operacional, CI e bundle;
- [ ] zero vulnerabilidade high/critical sem exceção aprovada;
- [ ] `tsc`, ESLint, build, testes, cobertura, Deno check e Gitleaks passam;
- [ ] warnings de teste não tratados foram eliminados;
- [ ] retenção, consentimento e exclusão LGPD têm fluxo comprovado;
- [ ] deploy remoto e Git têm a mesma fonte, versão e inventário.

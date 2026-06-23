# Plano de Renomeação: Space Talent → Usabit people

**Data:** 2026-06-16
**Objetivo:** Substituir toda ocorrência de "Space Talent" por "Usabit people" no código-fonte, emails, configuração e documentação.

## Premissas (NÃO alterar)

| Item | Motivo |
|---|---|
| `spacetalent.com.br` em `ALLOWED_ORIGINS` | Domínio ainda não definido |
| Arquivos `space-talent-favicon.svg` e `space-talent-logo.png` | Só troca texto, filenames mantidos |
| Componente `SpaceLogo` (identificador interno) | Não é texto visível ao usuário |
| Fonte `'Space Grotesk'` | É nome de fonte Google, não branding |
| Conteúdo do SVG do favicon | Só contém "IA" |
| `dist/` (build output) | Regenerado pelo build |

## Lote 1 — Código-fonte (8 arquivos, 12 edições)

### 1. `index.html:7`
```diff
-    <title>Space Talent</title>
+    <title>Usabit people</title>
```

### 2. `src/layouts/Sidebar.tsx:12`
```diff
-/* ─── Animated Space Talent Logo ────────────────────────────────────────── */
+/* ─── Animated Usabit people Logo ─────────────────────────────────────────── */
```

### 3. `src/layouts/Sidebar.tsx:283`
```diff
-<p ...>Space Talent</p>
+<p ...>Usabit people</p>
```

### 4. `src/pages/auth/Register.tsx:191`
```diff
-                            Space Talent
+                            Usabit people
```

### 5. `src/pages/marketing/LandingPage.tsx:34`
```diff
- text: '"O Space Talent revolucionou nosso processo...
+ text: '"O Usabit people revolucionou nosso processo...
```

### 6. `src/pages/marketing/LandingPage.tsx:435`
```diff
- alt="Space Talent"
+ alt="Usabit people"
```

### 7. `src/pages/marketing/LandingPage.tsx:438`
```diff
-<span>Space Talent</span>
+<span>Usabit people</span>
```

### 8. `src/pages/marketing/LandingPage.tsx:636`
```diff
-<h2 ...>Mais de 1.000 recrutadores confiam no Space Talent</h2>
+<h2 ...>Mais de 1.000 recrutadores confiam no Usabit people</h2>
```

### 9. `src/pages/marketing/LandingPage.tsx:781`
```diff
-<p ...>Powered by <strong>Space Talent</strong></p>
+<p ...>Powered by <strong>Usabit people</strong></p>
```

### 10. `src/pages/vagas/OrganizationCareerPage.tsx:78`
```diff
-      document.title = 'Space Talent';
+      document.title = 'Usabit people';
```

### 11. `src/pages/vagas/PortalPreview.tsx:202`
```diff
-                        Powered by <strong>Space Talent</strong>
+                        Powered by <strong>Usabit people</strong>
```

### 12. `src/pages/vagas/portal/FooterPortal.tsx:205`
```diff
-            Powered by <strong style={{ color: '#C3C7CD' }}>Space Talent</strong>
+            Powered by <strong style={{ color: '#C3C7CD' }}>Usabit people</strong>
```

## Lote 2 — Edge Functions (7 arquivos)

Em cada um, substituir no HTML do email:
```diff
-<p style="margin: 0;">Powered by <strong style="color: #C3C7CD;">Space Talent</strong></p>
+<p style="margin: 0;">Powered by <strong style="color: #C3C7CD;">Usabit people</strong></p>
```

| # | Arquivo | Linha |
|---|---|---|
| 13 | `supabase/functions/send-invite-email/index.ts` | 125 |
| 14 | `supabase/functions/send-spontaneous-email/index.ts` | 94 |
| 15 | `supabase/functions/send-candidate-vaga-reopened-email/index.ts` | 103 |
| 16 | `supabase/functions/send-candidate-vaga-canceled-email/index.ts` | 94 |
| 17 | `supabase/functions/send-candidate-thankyou-email/index.ts` | 96 |
| 18 | `supabase/functions/send-candidate-congratulations-email/index.ts` | 90 |
| 19 | `supabase/functions/send-application-email/index.ts` | 93 |

## Lote 3 — Config / Infra (2 arquivos)

### 20. `.env.example:2`
```diff
-# Space Talent AI - Variáveis de Ambiente
+# Usabit people - Variáveis de Ambiente
```

### 21. `supabase/migrations/010_multi_talent.sql:28`
```diff
-SET user_role = 'owner', organization_name = 'Space Talent'
+SET user_role = 'owner', organization_name = 'Usabit people'
```

## Lote 4 — Documentação (12 arquivos)

### 22. `README.md:2`
```diff
-<img src="public/docs/banner.png" alt="Space Talent Banner" width="100%">
+<img src="public/docs/banner.png" alt="Usabit people Banner" width="100%">
```

### 23. `README.md:5`
```diff
-<h1 align="center">🚀 Space Talent AI</h1>
+<h1 align="center">🚀 Usabit people</h1>
```

### 24. `README.md:24`
```diff
-O **Space Talent AI** é um ecossistema premium...
+O **Usabit people** é um ecossistema premium...
```

### 25. `docs/manuais/identidade_visual.md:1`
```diff
-# 🎨 Manual de Identidade Visual — Space Talent
+# 🎨 Manual de Identidade Visual — Usabit people
```

### 26. `docs/manuais/componentes_e_padroes.md:1`
```diff
-# 🧩 Manual de Componentes e Padrões — Space Talent
+# 🧩 Manual de Componentes e Padrões — Usabit people
```

### 27. `docs/architecture/PLAN-003-remediacao-seguranca-e-qualidade.md:1`
```diff
-# Plano de Remediação Cirúrgico — Space Talent AI
+# Plano de Remediação Cirúrgico — Usabit people
```

### 28. `docs/architecture/PLAN-003-remediacao-seguranca-e-qualidade.md:359`
```diff
-# Space Talent AI - Variáveis de Ambiente
+# Usabit people - Variáveis de Ambiente
```

> ⚠️ A linha 71 (`spacetalent.com.br`) NÃO é alterada — é domínio mantido.

### 29. `docs/architecture/tasks-remediation-sprint.md:5`
```diff
-# Tasks: Remediação Segurança e Qualidade — Space Talent AI
+# Tasks: Remediação Segurança e Qualidade — Usabit people
```

### 30. `docs/security/security_audit_2026_04_17.md:1`
```diff
-# Relatório de Auditoria de Segurança: Space Talent IA RH
+# Relatório de Auditoria de Segurança: Usabit people
```

### 31. `docs/security/pentest_report_2026_04_17.md:1`
```diff
-# Relatório de Penetration Testing (Red Team): Space Talent IA RH
+# Relatório de Penetration Testing (Red Team): Usabit people
```

### 32. `docs/plans/lint-errors-plan.md:1`
```diff
-# Plano de Correção de Lint — Space Talent AI
+# Plano de Correção de Lint — Usabit people
```

### 33. `docs/logs/2026-06-04.md:17`
```diff
-- ...para preservar o branding do Space Talent.
+- ...para preservar o branding do Usabit people.
```

### 34. `docs/logs/2026-06-09.md:14`
```diff
-- ...Space Talent metrics...
+- ...Usabit people metrics...
```

### 35. `specs/alteracoes-emails/plan.md:72`
```diff
-...footer "Powered by Space Talent" e copyright...
+...footer "Powered by Usabit people" e copyright...
```

### 36. `supabase/functions/send-invite-email/README.md:28`
```diff
-from: 'Space Talent <convite@seudominio.com>'
+from: 'Usabit people <convite@seudominio.com>'
```

## Pós-execução — Verificação

```bash
npm run lint
npm run build    # tsc -b && vite build
```

Verificar zero erros e zero warnings.

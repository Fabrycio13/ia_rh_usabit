# Plano: Alteração dos Templates de E-mail

**Branch:** `fix/remediation-sprint`

## Arquivos afetados

| Função | Apenas HTML | Assunto novo |
|--------|------------|--------------|
| `send-application-email` | ✅ | `Recebemos seu currículo` |
| `send-spontaneous-email` | ✅ | `Cadastro realizado com sucesso` |
| `send-candidate-thankyou-email` | ✅ | `Retorno do Processo Seletivo – {jobTitle}` |
| `send-candidate-congratulations-email` | ✅ | `Retorno do Processo Seletivo – {jobTitle}` |
| `send-candidate-vaga-canceled-email` | ✅ | `Atualização sobre a vaga de {jobTitle}` |
| `send-candidate-vaga-reopened-email` | ✅ | `Atualização sobre a vaga de {jobTitle}` |

## Estrutura de cada alteração

Cada função Edge Function tem a mesma estrutura:
1. **`subject`** (linha ~112) — string no body do fetch p/ Resend
2. **`html`** (template literal ~40 linhas) — conteúdo HTML do e-mail
3. **`from`** (linha ~102) — `Equipe de Talentos Usabit <noreply@space.pro.br>` (mesmo em todas)

O resto da função (validação, headers, parse, fetch) permanece idêntico.

## Passo a passo

### Fase 1: send-application-email
- Arquivo: `supabase/functions/send-application-email/index.ts`
- Substituir `subject` e `html` pelo novo texto
- Variáveis usadas: `${candidateFirstName}`, `${jobTitle}`

### Fase 2: send-spontaneous-email
- Arquivo: `supabase/functions/send-spontaneous-email/index.ts`
- Substituir `subject` e `html` pelo novo texto
- Variáveis usadas: `${candidateFirstName}`, `${displayName}` (orgName)
- Manter `orgName` na desestruturação e `displayName` no template

### Fase 3: send-candidate-thankyou-email
- Arquivo: `supabase/functions/send-candidate-thankyou-email/index.ts`
- Substituir `subject` e `html`
- Variáveis usadas: `${candidateFirstName}`, `${jobTitle}`

### Fase 4: send-candidate-congratulations-email
- Arquivo: `supabase/functions/send-candidate-congratulations-email/index.ts`
- Substituir `subject` e `html`
- Variáveis usadas: `${candidateFirstName}`, `${jobTitle}`

### Fase 5: send-candidate-vaga-canceled-email
- Arquivo: `supabase/functions/send-candidate-vaga-canceled-email/index.ts`
- Substituir `subject` e `html`
- Variáveis usadas: `${candidateFirstName}`, `${jobTitle}`

### Fase 6: send-candidate-vaga-reopened-email
- Arquivo: `supabase/functions/send-candidate-vaga-reopened-email/index.ts`
- Substituir `subject` e `html`
- Variáveis usadas: `${candidateFirstName}`, `${jobTitle}`

### Fase 7: Deploy
```bash
npx supabase functions deploy send-application-email
npx supabase functions deploy send-spontaneous-email
npx supabase functions deploy send-candidate-thankyou-email
npx supabase functions deploy send-candidate-congratulations-email
npx supabase functions deploy send-candidate-vaga-canceled-email
npx supabase functions deploy send-candidate-vaga-reopened-email
```

## Observações finais

1. **send-spontaneous-email** — manter `orgName`/`displayName` (multi-tenant). A assinatura "Equipe de Talentos Usabit" vira `Equipe de Talentos ${displayName}`. As outras 5 funções mantêm "Usabit" fixo (não recebem `orgName` no payload)
2. **From name** — atualizar de `Equipe de Carreiras <noreply@space.pro.br>` para `Equipe de Talentos Usabit <noreply@space.pro.br>` em todas as 6 funções
3. **HTML wrapper preservado** — manter a estrutura HTML existente (gradiente, card, logo, footer "Powered by Usabit people" e copyright). Apenas substituir o conteúdo textual interno (subject + corpo do e-mail)
4. **`[e-mail RH]` no reopened** — placeholder literal no novo texto. O usuário substitui manualmente quando for usar ou pode virar variável de ambiente futuramente
5. **Assuntos duplicados** — `thankyou` e `congratulations` ambos usam `Retorno do Processo Seletivo – {jobTitle}`. Confirmado manter assim.
6. **Deploy necessário** — Edge Functions são serverless, toda alteração precisa ser deployada via `npx supabase functions deploy`
7. **Logo** — mantém a logo base64 atual, sem alteração

# Plano: Trial — Cadastro Self-Service

## Conceito

Usuário se cadastra sozinho pela Landing Page ("Criar Conta Grátis"), sem depender de convite de ninguém. Conta autônoma com acesso limitado por créditos de IA.

- **Nunca vira Owner** — é uma conta separada, não entra na hierarquia owner→gestor→rh→convidado
- Upgrade é feito manualmente via contato com especialista

## Fluxo

1. LP → "Criar Conta Grátis"
2. Formulário só com **nome + email** (sem senha)
3. Edge function `send-trial-invite` → `generateLink` (tipo invite) com `user_role: trial`
4. Email de confirmação enviado via Resend (template bonito igual convite)
5. Clica no link → `/set-password` (reaproveitar fluxo existente)
6. Define senha → login
7. Onboarding: escolhe nome da organização
8. Acesso limitado ao sistema

## Role `trial`

### Permissões (`permissions.ts`)
- Acesso completo ao app (dashboard, vagas, kanban, candidatos)
- **Limitação por créditos de IA**, não por feature bloqueada
- Criar vagas: permitido (mas limitado pelo número de análises)
- Criar usuários: ❌ não pode (conta individual)

### Coluna nova em `profiles`
```sql
ai_credits_used INTEGER DEFAULT 0
ai_credits_limit INTEGER DEFAULT 30
```

Ou tabela separada `usage_credits`:
```sql
CREATE TABLE usage_credits (
  user_id UUID REFERENCES profiles(id),
  credits_used INTEGER DEFAULT 0,
  credits_limit INTEGER DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Limites sugeridos

| Recurso | Limite Trial |
|---|---|
| Análises de currículo (IA) | **30 créditos** |
| Vagas ativas | Ilimitado (mas cada análise consome crédito) |
| Candidatos no banco | Ilimitado (add manual não consome crédito) |
| Criar usuários | ❌ |
| Duração | **Para sempre** (enquanto não bater limite) |
| Upgrade | Contato com especialista → vira Owner |

## Contagem de créditos

Onde decrementar:
- `openai-proxy` edge function — cada chamada com `user_role = trial` decrementa
- `submit-application` — análise automática via jobAnalyzer (frontend chama openai-proxy)
- `ReanalyzeCandidateModal` — reanálise manual também consome
- Upload manual no Pool + "Analisar Currículo" — também consome

Quando `ai_credits_used >= ai_credits_limit`:
- `openai-proxy` retorna **402 Payment Required**
- Frontend exibe banner: "Seus créditos acabaram. Fale com um especialista!"
- Botões de análise ficam desabilitados com tooltip

## O que implementar

### Backend (Edge Functions + DB)

| Item | Arquivo |
|---|---|
| Criar tabela `usage_credits` | migration `063_create_usage_credits.sql` |
| Adicionar role `trial` ao `handle_new_user()` trigger | trigger já aceita qualquer role, só garantir |
| Adicionar permissões `trial` em `permissions.ts` | `src/core/config/permissions.ts` |
| Criar edge function `send-trial-invite` | `supabase/functions/send-trial-invite/index.ts` |
| Adicionar contagem de créditos no `openai-proxy` | `supabase/functions/openai-proxy/index.ts` |

### Frontend

| Item | Arquivo |
|---|---|
| Formulário "Criar Conta Grátis" (só nome + email) | Nova página ou modal na LP |
| Banner de créditos acabando/expirados | Componente reutilizável |
| Desabilitar análises quando sem crédito | `JobApplication.tsx`, `SpontaneousApplication.tsx`, `PoolAddCandidate.tsx`, `ReanalyzeCandidateModal.tsx` |
| CTA "Fale com especialista" | Link WhatsApp (já existe na LP) |
| Onboarding trial pós-login | Escolher nome da organização |

### Observações
- Candidatura pública + análise automática: cada candidatura que roda análise = 1 crédito
- Upload manual no Pool: extract não consome crédito (só se clicar "Analisar Currículo")
- Chat IA na LP e no dashboard: também consome crédito
- Re-análise de candidato existente: também consome

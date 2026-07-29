# Supabase Edge Function: send-invite-email

## Deploy

```bash
# Link projeto
supabase link --project-ref SEU_PROJECT_REF

# Set env vars
supabase secrets set RESEND_API_KEY=[REDACTED]
supabase secrets set APP_URL=https://seu-dominio.com

# Deploy
supabase functions deploy send-invite-email
```

## Test local

```bash
supabase functions serve --env-file .env
```

## Configuração no Resend

1. Acesse https://resend.com/api-keys
2. Verifique o domínio: `resend domains add --domain seudominio.com`
3. Configure DNS conforme instruções do Resend
4. Atualize o `from` na edge function para: `from: 'Usabit people <convite@seudominio.com>'`

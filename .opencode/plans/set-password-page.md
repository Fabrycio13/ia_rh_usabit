# Plano: Página customizada `/#/set-password`

**Data**: 2026-06-08  
**Status**: Aprovado  

## Problema

Atualmente o Owner precisa digitar manualmente a senha ao criar um novo gestor. O email de convite usa um magic link (`type: 'signup'`) que já autentica o usuário automaticamente — sem passar por uma tela de criação de senha.

## Fluxo desejado

1. Owner cria gestor sem digitar senha (só nome, email, perfil)
2. Sistema gera senha aleatória internamente
3. Email enviado com botão **"Definir Minha Senha"**
4. Usuário clica → confirma email + redirecionado para `/#/set-password`
5. SetPassword renderiza formulário no estilo do app
6. Usuário cria nova senha → `supabase.auth.updateUser()`
7. SignOut → redirect `/login`
8. Usuário loga com email + senha que criou

## Arquivos

### Criar
- `src/pages/auth/SetPassword.tsx`

### Modificar
- `src/App.tsx`
- `supabase/functions/send-invite-email/index.ts`
- `src/pages/settings/Configuracoes.tsx`

## Pontos cegos tratados

| Ponto cego | Solução |
|-----------|---------|
| OnboardingModal sobrepõe SetPassword | Suprimir modal na rota `/set-password` |
| Hash duplo `#/set-password#access_token=` | Manter `type: 'signup'` (já funciona com hash router) |
| Auto-confirm + signup link duplicados | Remover auto-confirm — signup link faz tudo |
| Sessão ativa durante SetPassword | Rota pública fora do DashboardLayout |
| Acesso direto sem sessão | Redirect `/login` com toast |
| `newUser.password` no estado | Remover do estado, validadores e reset |

## Ordem de implementação

1. `src/pages/auth/SetPassword.tsx` (criar)
2. `src/App.tsx` (rota + suprimir modal)
3. `supabase/functions/send-invite-email/index.ts` (redirectTo + HTML)
4. `src/pages/settings/Configuracoes.tsx` (remover senha, gerar aleatória)
5. Deploy edge function
6. Build + Lint + verificar

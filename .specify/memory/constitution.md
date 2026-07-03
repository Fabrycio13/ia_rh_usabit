# IA RH — Usabit people Constitution

> Regras não-negociáveis do projeto. Supersede práticas locais.
> Consulte para decisões arquiteturais e revisões de código.

## Core Principles

### I. Segurança de Dados (NON-NEGOTIABLE)
Nenhum PII (email, telefone, endereço, CPF, CEP) em logs ou erros de cliente.
Toda Edge Function pública com auth ou rate limit. Toda tabela com RLS.
Respostas de erro genéricas (`'Erro interno'`), nunca raw stack traces ou detalhes de API externa.

### II. Consistência Visual (NON-NEGOTIABLE)
CSS via variáveis (`var(--text-main)`, `var(--bg-card)`, `var(--border)`), nunca `#fff`/`#000`.
Componentes como `export const`, nunca `export default`. Ícones `lucide-react`.
Dois temas (dark + light) sempre funcionais.

### III. TypeScript Estrito (NON-NEGOTIABLE)
`strict: true`, `noUnusedLocals`, `noUnusedParameters`.
Tipos com `interface` para objetos, não classes. Sem `any` sem justificativa.
`verbatimModuleSyntax` e `erasableSyntaxOnly` habilitados.

### IV. SQL com RLS em Camadas (NON-NEGOTIABLE)
`IS NOT DISTINCT FROM` para org_id. `SECURITY DEFINER SET search_path` para helpers.
Migration numerada, idempotente com `DO $$`.
Roles: owner > administrador > supervisor > rh > convidado.
Toda política cobre todos os 5 roles.

### V. Qualidade com Evidência (NON-NEGOTIABLE)
Toda funcionalidade nova com teste. `npm run lint && npx tsc --noEmit` antes de commit.
Sem regressão de segurança. Testes de segurança nunca excluídos do CI.

## Segurança (obrigatório para toda mudança)

- **Edge Functions de email**: autenticação + rate limit obrigatórios
- **Error handling**: mensagens genéricas ao cliente, log interno sem PII
- **Storage RLS**: ownership checks por auth.uid() ou organization_id
- **Anti-XSS**: DOMPurify (sanitizeHtml) para HTML injetável
- **Anti-prompt-injection**: sanitizeAIInput() para inputs que vão para AI
- **Audit trail**: activity_logs NÃO pode ser mutável (sem UPDATE/DELETE por não-owner)

## Revisão de Código

- Toda mudança em SQL, RLS, auth, Edge Functions deve passar pelo @revisor
- O revisor usa o formato 🔴 ALTA | 🟡 MÉDIA | 🟢 BAIXA | ❓ DÚVIDA
- Issues de segurança são sempre no mínimo 🟡
- Violações de NON-NEGOTIABLE no constitution são 🔴 e bloqueiam a implementação

## Governance

Constitution supersedes all other practices. Amendments require:
1. Proposta documentada
2. Aprovação por owner/lead
3. Atualização deste documento com versão + data

**Version**: 1.0.0 | **Ratified**: 2026-06-29 | **Last Amended**: 2026-06-29

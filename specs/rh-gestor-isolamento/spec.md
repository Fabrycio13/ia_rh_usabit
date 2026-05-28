# Spec: Isolamento de Dados entre Gestor e RH

## Contexto

Atualmente não há diferenciação entre os perfis **Gestor** e **RH** nas consultas de dados. Ambos usam o mesmo filtro `.or(organization_id.eq.X, user_id.eq.Y)`, o que faz com que o RH veja todas as vagas, pipelines e dados criados pelo Gestor (e vice-versa). Isso infla indicadores, polui a interface e fere a privacidade dos processos seletivos de cada usuário.

## Regras de Negócio

| Papel | Vagas | Pipeline | Banco de Talentos | Dashboard |
|-------|-------|----------|-------------------|-----------|
| **Owner** | Todas (cross-org ou filtro manual) | Todas | Todos | Todas |
| **Gestor** | Todas da organização | Todos da organização | Todos da organização | Próprias análises + todas vagas da org |
| **RH** | Apenas próprias (`user_id`) | Apenas próprios (`user_id`) | Todos da organização | Apenas próprios dados |
| **Convidado** | Apenas permitidas via `convidado_vaga_access` | Apenas permitidas | Nenhum (já bloqueado) | Sem acesso |

## Requisitos Funcionais

### FR-01: Dashboard isola contagem de vagas para RH
O Dashboard do RH deve exibir apenas as vagas criadas por ele (`user_id`). O Dashboard do Gestor continua exibindo todas as vagas da organização.

### FR-02: Listagem de vagas isolada para RH
A página `/vagas` para RH deve mostrar apenas vagas onde `user_id = currentUserId`. Gestor vê todas da organização.

### FR-03: Vagas em tempo real (Realtime) respeita o isolamento
O canal `vagas-updates-realtime` no Vagas.tsx não pode adicionar vagas de outros usuários na lista do RH via callback INSERT.

### FR-04: Pipeline isolado para RH
A listagem de pipelines (`init()` em Pipeline.tsx) para RH retorna apenas pipelines onde `user_id = currentUserId`. Gestor vê todos da organização.

### FR-05: Modal "Vincular vaga" no Pipeline respeita isolamento
A função `loadAvailableVagas()` (usada nos modais de vincular/desvincular vaga) para RH retorna apenas vagas próprias.

### FR-06: RLS reforça isolamento no banco
As políticas RLS das tabelas `vagas_white_label`, `pipelines`, `pipeline_columns`, `pipeline_cards` são atualizadas para:
- **gestor**: acesso por `organization_id`
- **rh**: acesso por `user_id`

### FR-07: Banco de Talentos permanece aberto (org-wide)
CandidateBank continua com filtro `organization_id` para ambos os perfis. Todos na organização veem todos os candidatos.

## Restrições Técnicas

- TypeScript strict mode
- ESLint com `max-warnings 0`
- RLS como camada de segurança final (defense-in-depth)
- Pipeline.tsx tem ~2285 linhas — alterações cirúrgicas
- Migration 059 deve ser aplicada via Management API (mesmo processo da 058) devido a conflitos de versão conhecidos (025-028)
- Gestor mantém `OR(organization_id, user_id)` para capturar registros antigos sem `organization_id`

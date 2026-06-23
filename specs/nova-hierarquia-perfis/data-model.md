# Data Model: Nova Hierarquia de Perfis

## Entidades Alteradas

### `profiles` (tabela existente)

**Coluna alterada**: `user_role` (TEXT)

**Valores antigos**: `'owner'`, `'gestor'`, `'rh'`, `'convidado'`

**Valores novos**: `'owner'`, `'administrador'`, `'supervisor'`, `'rh'`, `'convidado'`

**Migration**: `UPDATE profiles SET user_role = 'administrador' WHERE user_role = 'gestor'`

### `convidado_vaga_access` (tabela existente)

**Políticas RLS**: Atualizadas para incluir `'administrador'` e `'supervisor'` nos lugares onde `'gestor'` era referenciado.

## Novas Entidades

Nenhuma nova tabela é criada. Apenas:
- Novo valor `'supervisor'` na coluna `user_role` de `profiles`
- Novo valor `'administrador'` substituindo `'gestor'` na coluna `user_role` de `profiles`

## Mapa de Permissões (RolePermissions)

```typescript
interface RolePermissions {
    dashboard: boolean;
    vagas: boolean;
    vagas_edit: boolean;
    analises: boolean;
    analises_edit: boolean;
    candidatos: boolean;
    candidatos_edit: boolean;
    pipeline: boolean;
    pipeline_edit: boolean;
    chat: boolean;
    chat_widget: boolean;
    admin: boolean;
    logs: boolean;
}
```

| Permissão | owner | administrador | supervisor | rh | convidado |
|-----------|-------|---------------|------------|-----|-----------|
| dashboard | true | true | true | true | false |
| vagas | true | true | true | true | true |
| vagas_edit | true | true | true | true | false |
| analises | true | true | true | true | false |
| analises_edit | true | true | true | true | false |
| candidatos | true | true | true | true | false |
| candidatos_edit | true | true | true | true | false |
| pipeline | true | true | true | true | true |
| pipeline_edit | true | true | true | true | false |
| chat | true | false | false | false | false |
| chat_widget | true | true | true | true | false |
| admin | true | true | **true** | false | false |
| logs | true | true | **true** | false | false |

**Destaques**: `supervisor` = `rh` + `admin: true` + `logs: true`

## Hierarquia de Criação

```typescript
// Em AdminDashboard.tsx
const canCreate = (creatorRole: string, targetRole: string): boolean => {
    if (creatorRole === 'owner') return targetRole === 'administrador';
    if (creatorRole === 'administrador') return ['supervisor', 'rh', 'convidado'].includes(targetRole);
    if (creatorRole === 'supervisor') return ['rh', 'convidado'].includes(targetRole);
    return false;
};
```

## Hierarchy Numérica (Edge Functions)

```typescript
const hierarchy: Record<string, number> = {
    owner: 5,
    administrador: 4,
    supervisor: 3,
    rh: 2,
    convidado: 1,
};
```

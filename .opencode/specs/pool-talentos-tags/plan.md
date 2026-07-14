# Pool de Talentos — Sistema de Tags (v2)

## Pontos Cegos Identificados

- ❌ **Multi-tenancy**: queries de tags não filtram por `organization_id`
- ❌ **"Criar tag" não persiste**: tag só existe em memória, não no banco
- ❌ **Migration 069 não aplicada**: coluna `tags` não existe no banco
- ❌ **Sem erro visível**: falhas de save são silenciosas

## Arquitetura

### Tabela `tags` (global registry por org)

```
tags
├── id UUID PK
├── name TEXT (normalizado: lowercase + trim)
├── organization_id UUID FK → organizations(id)
├── created_at TIMESTAMPTZ
└── UNIQUE(name, organization_id)
```

- RLS: `organization_id = get_my_org_id()` (padrão `IS NOT DISTINCT FROM`)
- Tags são CRIADAS na tabela `tags` (via "Criar tag" ou automaticamente ao adicionar numa linha)
- Tags são ATRIBUÍDAS a candidatos via `candidates.tags TEXT[]`

### Fluxo

```
[Criar tag no filtro] → INSERT na tabela tags (persiste)
       ↓
[Linha "+" ou CandidatePanel] → SELECT tag da tabela tags → adiciona em candidates.tags
       ↓
[Filtro de tags] → SELECT name FROM tags WHERE organization_id = ?
       ↓
[Sugestões TagInput] → SELECT name FROM tags WHERE organization_id = ?
```

## O que precisa mudar

### 1. Migration 070 — criar tabela `tags`
`supabase/migrations/070_tags_table.sql`
- CREATE TABLE tags com id, name, organization_id, created_at, UNIQUE(name, org_id)
- ENABLE ROW LEVEL SECURITY
- Policy multitenancy (SELECT/INSERT/UPDATE/DELETE com `get_my_org_id()`)
- Policy para convidado (SELECT only)
- COMMENT ON TABLE e COLUMNS

### 2. PoolTalentos — "Criar tag" persiste no banco
- Em vez de só adicionar ao state `allTags`, fazer INSERT na tabela `tags`
- `allTags` passa a vir de `supabase.from('tags').select('name').eq('organization_id', profile.organization_id)`
- Filtro de tags usa os dados do banco

### 3. PoolTalentos — "+" inline salva no banco
- Ao salvar tag no candidato: atualiza `candidates.tags` 
- Garantir que a tag existe na tabela `tags` (upsert)
- Adicionar `.catch()` com `toast.error()` visível

### 4. CandidatePanel — TagInput
- Já salva em `candidates.tags`
- Sugestões vindo de `tags` table (org-scoped)
- Já funciona, só precisa da migration

### 5. PoolAddCandidate — TagInput na importação
- Já usa TagInput com sugestões
- Precisa buscar sugestões de `tags` table (org-scoped)
- Ao importar, as tags manuais são salvas em `candidates.tags` + garantir que existem na `tags` table

### 6. Todas as queries de sugestão
- Adicionar `.eq('organization_id', profile.organization_id)` em todos os lugares que buscam tags

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/070_tags_table.sql` | NOVO — criar tabela + RLS |
| `src/pages/vagas/PoolTalentos.tsx` | "Criar tag" → INSERT na tags table; "+" → error handling; allTags scoped por org |
| `src/features/analysis/CandidatePanel.tsx` | TagInput sugestões scoped por org |
| `src/features/candidates/components/PoolAddCandidate.tsx` | TagInput sugestões scoped por org |

## Ordem

1. Migration 070 (tabela tags + RLS)
2. PoolTalentos: queries scoped por org, "Criar tag" salva no banco, "+" com catch
3. CandidatePanel + PoolAddCandidate: sugestões scoped por org
4. Verificar typecheck + lint + testes

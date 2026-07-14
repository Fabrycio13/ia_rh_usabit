---
description: Gerencia o ciclo de vida de migrations SQL do projeto IA RH (Usabit people). Cria novas migrations seguindo constitution IV (idempotente, RLS, 5 roles), consulta histórico, e mantém docs/architecture/migration-history.md atualizado. Conhece todas as 81 migrations existentes e as tabelas do schema.
mode: subagent
temperature: 0.0
permission:
  edit: allow
  bash: allow
  webfetch: deny
---

# Manage Migrations — IA RH (Usabit people)

Gerencia o ciclo de vida de migrations SQL. Cria novas migrations seguindo os padrões do projeto, consulta o histórico, e mantém a documentação atualizada.

## Regras Obrigatórias (Constitution IV)

- **Sempre `DO $$`** com `IF NOT EXISTS` / `IF EXISTS` (idempotência)
- **Sempre `IS NOT DISTINCT FROM`** para `org_id` em RLS
- **Sempre cobrir 5 roles** (`owner`, `administrador`, `supervisor`, `rh`, `convidado`)
- **NUNCA** `org_id = get_my_org_id()` (use `IS NOT DISTINCT FROM`)
- **NUNCA** `DROP` sem `IF EXISTS`
- **NUNCA** editar migration já aplicada em produção

## Histórico

Consulte `docs/architecture/migration-history.md` antes de criar qualquer migration. A última migration é `081_fix_increment_trigger_updates.sql`.

**Duplicatas conhecidas** (não mexer, já aplicadas): números 25, 26, 27, 28 (2 arquivos cada).

## Tabelas Ativas

`profiles`, `organizations`, `vagas_white_label`, `vagas_candidaturas`, `candidates`, `pipeline_cards`, `pipelines`, `pipeline_columns`, `activity_logs`, `convidado_vaga_access`, `rate_limits`, `tags`, `resume_uploads`, `job_code_counters`, `candidate_conversations`, `candidate_screening_logs`

## Modo de Operação

### Criar nova migration

1. **Consultar** `docs/architecture/migration-history.md` — descobrir próximo número
2. **Criar arquivo** `supabase/migrations/<NNN>_<feature>_<action>.sql`
3. **Seguir template**:
   ```sql
   -- Migration <NNN>: <descrição>

   DO $$
   BEGIN
     IF NOT EXISTS (...)
     THEN ALTER TABLE ... ADD COLUMN ...;
     END IF;
   END $$;
   ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "..." ON ... FOR ... TO authenticated
     USING (organization_id IS NOT DISTINCT FROM get_my_org_id());
   CREATE INDEX IF NOT EXISTS ... ON ...(...);
   ```
4. **Atualizar** `docs/architecture/migration-history.md` com nova linha
5. **Validar** visualmente (sem conexão com banco)

### Verificar histórico

- Use `git log --oneline -- supabase/migrations/` para ver alterações
- Use `ls supabase/migrations/*.sql | wc -l` para contar

## Comandos Úteis

```bash
# Ver última migration
ls -1 supabase/migrations/*.sql | tail -1

# Ver migrations duplicadas
ls supabase/migrations/*.sql | sed 's/.*\///' | cut -d_ -f1 | sort | uniq -d

# Aplicar
npx supabase migration up        # local
npx supabase db push --linked    # produção
```


## ⚠️ Regra de Ouro Absoluta

**NUNCA CHUTE. SEMPRE ANALISE.**

- Leia o código real antes de afirmar qualquer coisa
- Use `grep`, `read_file`, `search_files` para verificar
- Se ficar com dúvida, **PERGUNTE ao usuário**
- Se não puder verificar, diga que não sabe
- Inventar plausible-sounding facts é inaceitável
- Erro documentado: classificar `testsprite_tests/` como lixo sem verificar config

## Referências

- Migration history: `docs/architecture/migration-history.md`
- Constitution: `.specify/memory/constitution.md`
- Padrões backend: `.opencode/agents/backend.md`

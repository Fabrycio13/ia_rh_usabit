# Plano: Permissionamento granular de Vagas para Convidado

**Branch:** `fix/remediation-sprint` | **Data:** 2026-05-28

## Objetivo

Gestor poder selecionar quais vagas da organização um Convidado pode ver. O Convidado enxerga apenas:
- Vagas permitidas (lista + candidatos)
- Pipeline vinculado a essas vagas (sidebar + board read-only, sem drag)
- CandidatePanel (view-only — RLS bloqueia escrita)
- Todo o resto bloqueado

---

## Pré-análise de Pontos Cegos (Resolvidos no Plano)

| # | Ponto Cego | Solução |
|---|------------|---------|
| 1 | `convidado` não existe em nenhuma RLS policy atual | Adicionar policies específicas com `get_my_role() = 'convidado'` — RLS é OR, não conflita |
| 2 | Pipeline.tsx `init()` linha 666: `organization_id.eq.${profile.organization_id}` sem guard null | Adicionar fallback: se `profile.organization_id` for nulo, usar só `user_id.eq.${userId}` |
| 3 | Pipeline.tsx `loadAvailableVagas()` linha 701-721: busca TODAS vagas sem filtro de org | Adicionar filtro por `organization_id` (já existe RLS, mas explícito é mais seguro) + filtro convidado |
| 4 | Pipeline.tsx linha 789: insert em `pipeline_columns` sem `\|\| undefined` | Já existente, não vamos alterar (não é escopo) |
| 5 | `candidate_screening_logs` sem RLS para convidado | Adicionar policy na migration |
| 6 | `candidate_conversations` RLS bloqueia gestor/rh (pré-existente) | Fora do escopo — não vamos alterar |
| 7 | Convidado sem `organization_id` em Vagas.tsx linha 151-153 | Já tratado: fallback para `user_id` filter |
| 8 | `loadEligibles()` para convidado | Pular execução se `convidado` |
| 9 | TypeScript `noUnusedLocals`/`noUnusedParameters` | Garantir que variáveis/funções novas são usadas |
| 10 | ESLint `react-hooks/exhaustive-deps` | Garantir deps corretas nos useEffects |

---

## Tarefa 1: Migration Database

**Arquivo:** `supabase/migrations/058_convidado_vaga_access.sql`

```sql
-- 058: Permissao granular de vagas para convidados
-- Gestor pode selecionar quais vagas um convidado pode ver

-- 1. Tabela de permissao
CREATE TABLE convidado_vaga_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    convidado_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vaga_id UUID NOT NULL REFERENCES vagas_white_label(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(convidado_user_id, vaga_id)
);

CREATE INDEX idx_cva_convidado ON convidado_vaga_access(convidado_user_id);
CREATE INDEX idx_cva_vaga ON convidado_vaga_access(vaga_id);

ALTER TABLE convidado_vaga_access ENABLE ROW LEVEL SECURITY;

-- Gestor/owner: SELECT
CREATE POLICY "cva_gestor_select" ON convidado_vaga_access
    FOR SELECT USING (
        get_my_role() IN ('owner', 'gestor')
        AND convidado_user_id IN (
            SELECT id FROM profiles
            WHERE organization_id = get_my_org_id()
        )
    );

-- Gestor/owner: INSERT
CREATE POLICY "cva_gestor_insert" ON convidado_vaga_access
    FOR INSERT WITH CHECK (
        get_my_role() IN ('owner', 'gestor')
        AND EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = convidado_user_id
            AND p.organization_id = get_my_org_id()
        )
        AND EXISTS (
            SELECT 1 FROM vagas_white_label v
            WHERE v.id = vaga_id
            AND v.organization_id = get_my_org_id()
        )
    );

-- Gestor/owner: DELETE
CREATE POLICY "cva_gestor_delete" ON convidado_vaga_access
    FOR DELETE USING (
        get_my_role() IN ('owner', 'gestor')
        AND convidado_user_id IN (
            SELECT id FROM profiles
            WHERE organization_id = get_my_org_id()
        )
    );

-- Convidado: SELECT apenas proprios registros
CREATE POLICY "cva_convidado_select" ON convidado_vaga_access
    FOR SELECT USING (
        convidado_user_id = auth.uid()
    );

-- Helper function segura: retorna vaga_ids que o convidado atual pode ver
CREATE OR REPLACE FUNCTION get_convidado_vaga_ids()
RETURNS TABLE (vaga_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT vaga_id FROM convidado_vaga_access
    WHERE convidado_user_id = auth.uid();
$$;

-- 2. RLS: vagas_white_label
CREATE POLICY "vwl_convidado_select" ON vagas_white_label
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
    );

-- 3. RLS: pipelines
CREATE POLICY "pipelines_convidado_select" ON pipelines
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
    );

-- 4. RLS: pipeline_columns
CREATE POLICY "pcols_convidado_select" ON pipeline_columns
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND pipeline_id IN (
            SELECT id FROM pipelines
            WHERE vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
        )
    );

-- 5. RLS: pipeline_cards
CREATE POLICY "pcards_convidado_select" ON pipeline_cards
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND pipeline_id IN (
            SELECT id FROM pipelines
            WHERE vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
        )
    );

-- 6. RLS: vagas_candidaturas
CREATE POLICY "vc_convidado_select" ON vagas_candidaturas
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
    );

-- 7. RLS: candidates (via pipeline_cards)
CREATE POLICY "candidates_convidado_select" ON candidates
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND id IN (
            SELECT candidate_id FROM pipeline_cards
            WHERE pipeline_id IN (
                SELECT id FROM pipelines
                WHERE vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
            )
        )
    );

-- 8. RLS: candidate_screening_logs (para CandidatePanel > Triagem)
CREATE POLICY "csl_convidado_select" ON candidate_screening_logs
    FOR SELECT USING (
        get_my_role() = 'convidado'
        AND candidate_id IN (
            SELECT id FROM candidates
            WHERE id IN (
                SELECT candidate_id FROM pipeline_cards
                WHERE pipeline_id IN (
                    SELECT id FROM pipelines
                    WHERE vaga_id IN (SELECT vaga_id FROM get_convidado_vaga_ids())
                )
            )
        )
    );
```

**Verificação:** Migration testada no Supabase local via `npx supabase migration up`.

---

## Tarefa 2: Permissions Config

**Arquivo:** `src/core/config/permissions.ts`

**Localização:** linha 72-87 (objeto `convidado`)

**Antes:**
```ts
convidado: {
    dashboard: false,
    vagas: true,
    vagas_edit: false,
    analises: false,
    analises_edit: false,
    candidatos: false,
    candidatos_edit: false,
    pipeline: false,
    pipeline_edit: false,
    chat: false,
    chat_widget: false,
    admin: false,
    logs: false,
},
```

**Depois:**
```ts
convidado: {
    dashboard: false,
    vagas: true,
    vagas_edit: false,
    analises: false,
    analises_edit: false,
    candidatos: false,
    candidatos_edit: false,
    pipeline: true,
    pipeline_edit: false,
    chat: false,
    chat_widget: false,
    admin: false,
    logs: false,
},
```

**Verificação:** `npx eslint .` — zero warnings novos (muda apenas valor booleano).

---

## Tarefa 3: Pipeline.tsx — Filtro de Dados + View-Only

**Arquivo:** `src/pages/candidates/Pipeline.tsx`

### 3.1 — Filtro de pipelines no `init()` (~linha 660)

**Antes:**
```ts
async function init(userId: string) {
    const { data: pipes } = await supabase
        .from('pipelines')
        .select('*')
        .eq('is_active', true)
        .or(`organization_id.eq.${profile.organization_id},user_id.eq.${userId}`)
        .order('name');
```

**Depois:**
```ts
async function init(userId: string) {
    let query = supabase
        .from('pipelines')
        .select('*')
        .eq('is_active', true)
        .order('name');

    if (profile.user_role === 'convidado') {
        const { data: acesso } = await supabase
            .from('convidado_vaga_access')
            .select('vaga_id')
            .eq('convidado_user_id', userId);
        const vagaIds = (acesso || []).map(a => a.vaga_id);
        if (vagaIds.length === 0) {
            setPipelines([]);
            setFetchingPipelines(false);
            return;
        }
        query = query.in('vaga_id', vagaIds);
    } else if (profile.organization_id) {
        query = query.or(`organization_id.eq.${profile.organization_id},user_id.eq.${userId}`);
    } else {
        query = query.eq('user_id', userId);
    }

    const { data: pipes } = await query;
```

**⚠️ Ponto cego:** Se `profile.organization_id` for null/undefined, `organization_id.eq.null` gera SQL inválido. A solução acima trata com `else if`.

### 3.2 — Filtro no `loadAvailableVagas()` (~linha 701)

**Antes:**
```ts
async function loadAvailableVagas() {
    const { data: vagas } = await supabase
        .from('vagas_white_label')
        .select('id, title, status, is_accepting_applications, job_code, pipeline_id, is_active')
        .order('job_code', { ascending: true, nullsFirst: false });
```

**Depois:**
```ts
async function loadAvailableVagas() {
    let vagaQuery = supabase
        .from('vagas_white_label')
        .select('id, title, status, is_accepting_applications, job_code, pipeline_id, is_active')
        .order('job_code', { ascending: true, nullsFirst: false });

    if (profile.user_role === 'convidado') {
        const { data: acesso } = await supabase
            .from('convidado_vaga_access')
            .select('vaga_id')
            .eq('convidado_user_id', profile.userId);
        const vagaIds = (acesso || []).map(a => a.vaga_id);
        if (vagaIds.length > 0) {
            vagaQuery = vagaQuery.in('id', vagaIds);
        } else {
            setAvailableVagas([]);
            return;
        }
    }

    const { data: vagas } = await vagaQuery;
```

### 3.3 — Pular `loadEligibles()` para Convidado (~linha 929)

**Antes:**
```ts
await loadEligibles(userId);
```

**Depois:**
```ts
if (profile.user_role !== 'convidado') {
    await loadEligibles(userId);
}
```

A função `loadEligibles` busca candidatos elegíveis para adicionar ao pipeline — convidado não pode adicionar.

### 3.4 — Desabilitar Drag-and-Drop

**Card drag (~linha 455):**
```ts
useEffect(() => {
    if (profile.user_role === 'convidado') return;
    // ... todo o código existente de draggable
}, [cards, columns, profile, pipelines, selectedPipelineId]);
```

**Column drop target (~linha 553):**
```ts
useEffect(() => {
    if (profile.user_role === 'convidado') return;
    // ... todo o código existente de dropTargetForElements
}, [columns, selectedPipelineId]);
```

**Column header drag (~linha 572):**
```ts
useEffect(() => {
    if (profile.user_role === 'convidado') return;
    // ... todo o código existente de column header draggable
}, [columns, selectedPipelineId]);
```

### 3.5 — Esconder Botões de Ação

Envolver cada botão com `{profile.user_role !== 'convidado' && (`:

| Linha | Elemento | Código |
|-------|----------|--------|
| ~1488 | "Novo Processo" | `{userRole !== 'convidado' && <button ...>Novo Processo</button>}` |
| ~1552 | "Nova Coluna" | `{userRole !== 'convidado' && <button ...>Nova Coluna</button>}` |
| ~1522 | "Vincular a vaga" | `{userRole !== 'convidado' && <button ...>Vincular a vaga</button>}` |
| ~1537 | "Desvincular vaga" | `{userRole !== 'convidado' && <button ...>Desvincular vaga</button>}` |
| ~1449 | Delete pipeline | `{userRole !== 'convidado' && <button ...>Excluir</button>}` |
| ~285-358 | AddCandidateModal | Já é condicional no componente pai — verificar se o botão que abre o modal existe |

Para o context menu do card (3 dots → opções de reordenar/mover/remover), verificar se `userRole !== 'convidado'` antes de renderizar o menu.

**⚠️ Ponto cego:** Para evitar repetir `profile.user_role` várias vezes, extrair para uma constante no início do componente:
```ts
const userRole = profile.user_role;
const isConvidado = userRole === 'convidado';
```

### 3.6 — Verificação ESLint + TS

- `userRole` e `isConvidado` declarados e usados → sem `noUnusedLocals`
- `useEffect` com guard `if (isConvidado) return;` → hook continua válido, deps inalteradas
- Nenhum import novo necessário

**Verificação:** `npx eslint .` + `npx tsc -b` — 0 erros, 0 warnings novos.

---

## Tarefa 4: Configuracoes.tsx — UI do Gestor

**Arquivo:** `src/pages/settings/Configuracoes.tsx`

### 4.1 — Localizar seção "Minha Equipe"

Na área onde os usuários da equipe são listados/editados, adicionar um bloco condicional:

```tsx
{selectedUser?.user_role === 'convidado' && (
    <VagasPermitidasSection
        convidadoUserId={selectedUser.id}
        organizationId={profile.organization_id}
        currentUserId={profile.userId}
    />
)}
```

### 4.2 — Componente `VagasPermitidasSection`

```tsx
function VagasPermitidasSection({
    convidadoUserId,
    organizationId,
    currentUserId,
}: {
    convidadoUserId: string;
    organizationId: string | null;
    currentUserId: string;
}) {
    const [allVagas, setAllVagas] = useState<{ id: string; title: string; job_code: string | null }[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!organizationId) return;
        setLoading(true);
        Promise.all([
            supabase.from('vagas_white_label')
                .select('id, title, job_code')
                .eq('organization_id', organizationId)
                .eq('is_active', true),
            supabase.from('convidado_vaga_access')
                .select('vaga_id')
                .eq('convidado_user_id', convidadoUserId),
        ]).then(([vagasRes, acessoRes]) => {
            if (!vagasRes.error) setAllVagas(vagasRes.data);
            if (!acessoRes.error) {
                setSelectedIds(new Set((acessoRes.data || []).map(a => a.vaga_id)));
            }
            setLoading(false);
        });
    }, [convidadoUserId, organizationId]);

    async function handleSave() {
        await supabase.from('convidado_vaga_access')
            .delete()
            .eq('convidado_user_id', convidadoUserId);
        if (selectedIds.size > 0) {
            await supabase.from('convidado_vaga_access')
                .insert(Array.from(selectedIds).map(vagaId => ({
                    convidado_user_id: convidadoUserId,
                    vaga_id: vagaId,
                    created_by: currentUserId,
                })));
        }
    }

    if (loading) return <p>Carregando vagas...</p>;

    return (
        <div>
            <h4>Vagas Permitidas</h4>
            {allVagas.map(vaga => (
                <label key={vaga.id} style={{ display: 'block', margin: '4px 0' }}>
                    <input
                        type="checkbox"
                        checked={selectedIds.has(vaga.id)}
                        onChange={() => {
                            setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(vaga.id)) next.delete(vaga.id);
                                else next.add(vaga.id);
                                return next;
                            });
                        }}
                    />
                    {' '}{vaga.job_code ? `${vaga.job_code} - ` : ''}{vaga.title}
                </label>
            ))}
            <button onClick={handleSave}>Salvar Permissões</button>
        </div>
    );
}
```

**⚠️ Ponto cego:** O `useEffect` usa `organizationId` nas deps. Se `organizationId` for `null`, o efeito retorna cedo — o gestor não tem org (owner criando), então não há vagas para exibir.

**Verificação:** `npx eslint .` — verificar exhaustive-deps do useEffect (todas as deps presentes).

---

## Tarefa 5: CandidatePanel — Guard View-Only

**Arquivo:** `src/features/analysis/CandidatePanel.tsx`

### 5.1 — Guard no `handleFieldSave` (~linha 129)

**Antes:**
```ts
async function handleFieldSave(field: string) {
    if (savingField) return;
    setSavingField(true);
```

**Depois:**
```ts
async function handleFieldSave(field: string) {
    if (savingField || profile.user_role === 'convidado') return;
    setSavingField(true);
```

### 5.2 — Guard no `toggleBlacklist` (~linha 116)

```ts
async function toggleBlacklist() {
    if (togglingBlacklist || profile.user_role === 'convidado') return;
```

### 5.3 — Guard no botão "Mover para Banco de Talentos"

Verificar a linha onde o botão é renderizado e adicionar:
```tsx
{profile.user_role !== 'convidado' && (
    <button onClick={...}>Mover para Banco de Talentos</button>
)}
```

**⚠️ Ponto cego:** O `handleFieldSave` lida com dois caminhos — `isVagaView` (atualiza `vagas_candidaturas`) e não-`isVagaView` (atualiza `candidates`). Ambos precisam ser bloqueados. O guard no início cobre ambos.

**Verificação:** `npx eslint .` + `npx tsc -b` — 0 erros.

---

## Tarefa 6: Sidebar e Roteamento

**Arquivo:** `src/layouts/Sidebar.tsx` (~linha 345) e `src/App.tsx` (~linha 95)

Com `pipeline: true` no permissions.ts:
- Sidebar: item "Pipeline" já aparece via `{hasPermission(profile.user_role, 'pipeline') && ...}`
- Rota: guard `hasPermission(profile.user_role, 'pipeline')` já permite

**Nenhuma alteração necessária.**

---

## Tarefa 7: Vagas.tsx e VagaCandidatos.tsx

**Nenhuma alteração necessária.** As novas RLS policies filtram automaticamente no banco:
- `vwl_convidado_select` → vagas permitidas
- `vc_convidado_select` → candidaturas das vagas permitidas

---

## Tarefa 8: Validação Final

### 8.1 — ESLint
```bash
npx eslint . --max-warnings 0
```
Esperado: 1 warning pré-existente (linha 112 do CandidatePanel, não relacionado).

### 8.2 — TypeScript
```bash
npx tsc -b
```
Esperado: 0 erros.

### 8.3 — Build
```bash
npx vite build
```
Esperado: build bem-sucedido.

---

## Ordem de Execução (Surgical)

```
T1: Migration DB (SQL)          → npx supabase migration up
T2: permissions.ts (1 linha)     → npx eslint .
T3: Pipeline.tsx (~100 linhas)   → npx tsc -b
T4: Configuracoes.tsx            → npx eslint .
T5: CandidatePanel.tsx (3 guards)→ npx tsc -b
T6: Verificação final            → npx eslint . && npx tsc -b && npx vite build
```

---

## Resumo de Arquivos Alterados

| Arquivo | Tipo | Linhas |
|---------|------|--------|
| `supabase/migrations/058_convidado_vaga_access.sql` | **Novo** | ~90 |
| `src/core/config/permissions.ts` | Edit | 1 |
| `src/pages/candidates/Pipeline.tsx` | Edit | ~30 |
| `src/pages/settings/Configuracoes.tsx` | Edit | ~80 |
| `src/features/analysis/CandidatePanel.tsx` | Edit | 3 |

---

## Checklist de Verificação Pós-Implementação

- [ ] Migration `058` rodou sem erros
- [ ] `npx eslint .` — 0 erros, 0 warnings novos
- [ ] `npx tsc -b` — sem erros
- [ ] `npx vite build` — build bem-sucedido
- [ ] Gestor consegue ver/editar vagas permitidas de um convidado em Configurações
- [ ] Convidado vê apenas vagas permitidas na lista
- [ ] Convidado vê candidatos das vagas permitidas
- [ ] Convidado vê pipeline na sidebar (apenas pipelines vinculados)
- [ ] Convidado não consegue arrastar cards (read-only)
- [ ] Convidado não consegue criar pipeline, coluna, nem editar nada
- [ ] Convidado abre CandidatePanel e não consegue salvar edições
- [ ] Convidado não vê Dashboard, Candidatos, Análises, Admin, Chat

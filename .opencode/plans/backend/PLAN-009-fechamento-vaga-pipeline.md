# Plano Passo a Passo — Fechamento de Vaga com Pipeline

**Estratégia de Risco ZERO**
- **Fase 1:** Criar tudo novo (funções + modal) ao lado do código existente — zero risco de quebra
- **Fase 2:** Trocar o entry point (1 linha em updateVagaStatus) — risco mínimo, facilmente reversível
- **Fase 3:** Remover código morto — só depois de confirmar que o novo fluxo funciona

Cada fase é um commit separado. Se algo estranho aparecer, `git revert` na fase 2 sem perder a fase 1.

---

## FASE 1 — Criar funções + novo modal (nada é removido)

### 1.1 — Adicionar `fetchApprovedEmails()` (função auxiliar reutilizável)

Inserir **ANTES** de `sendCloseEmails()` (linha ~446):

```ts
async function fetchApprovedEmails(vagaId: string): Promise<Set<string>> {
    const { data: pipes } = await supabase
        .from('pipelines')
        .select('id')
        .eq('vaga_id', vagaId);

    if (!pipes?.length) return new Set();

    const { data: cols } = await supabase
        .from('pipeline_columns')
        .select('id')
        .in('pipeline_id', pipes.map(p => p.id))
        .ilike('name', '%aprovado%');

    if (!cols?.length) return new Set();

    const { data: cards } = await supabase
        .from('pipeline_cards')
        .select('candidate_id')
        .eq('vaga_id', vagaId)
        .in('column_id', cols.map(c => c.id));

    if (!cards?.length) return new Set();

    const { data: cands } = await supabase
        .from('candidates')
        .select('email')
        .in('id', cards.map(c => c.candidate_id));

    return new Set(
        (cands || []).map(c => c.email?.toLowerCase()).filter(Boolean)
    );
}
```

### 1.2 — Adicionar `fetchCloseCounts()` (para preview no modal)

Inserir antes de `sendCloseEmails()` (linha ~446):

```ts
async function fetchCloseCounts(vagaId: string) {
    setLoadingCounts(true);
    try {
        const { count: total } = await supabase
            .from('vagas_candidaturas')
            .select('id', { count: 'exact' })
            .eq('vaga_id', vagaId)
            .eq('organization_id', userOrgId)
            .neq('status', 'talent_bank');

        const approved = await fetchApprovedEmails(vagaId);
        const totalInt = total || 0;

        setCloseCounts({ total: totalInt, aprovados: approved.size, naoAprovados: totalInt - approved.size });
    } finally {
        setLoadingCounts(false);
    }
}
```

### 1.3 — Adicionar estados novos

No bloco de `useState` (linha ~200), adicionar:

```ts
const [closeModalOpen, setCloseModalOpen] = useState<{ vagaId: string; title: string } | null>(null);
const [closeCounts, setCloseCounts] = useState<{ total: number; aprovados: number; naoAprovados: number } | null>(null);
const [loadingCounts, setLoadingCounts] = useState(false);
```

### 1.4 — Adicionar `confirmCloseAndSend()` (substitui sendCloseEmails + confirmPipelineDelete)

Inserir próximo a `sendCloseEmails()`:

```ts
async function confirmCloseAndSend(vagaId: string, title: string) {
    if (sendingCloseEmails) return;
    setSendingCloseEmails(true);
    try {
        // 1. Atualizar status da vaga (moveu de updateVagaStatus para cá)
        await supabase
            .from('vagas_white_label')
            .update({ status: 'fechada', is_accepting_applications: false })
            .eq('id', vagaId);

        // 2. Marcar pipeline como inativo
        await supabase
            .from('pipelines')
            .update({ is_active: false })
            .eq('vaga_id', vagaId);

        // 3. Enviar e-mails
        const [candidates, approvedEmails] = await Promise.all([
            supabase.from('vagas_candidaturas')
                .select('candidate_name, candidate_email')
                .eq('vaga_id', vagaId)
                .eq('organization_id', userOrgId)
                .neq('status', 'talent_bank'),
            fetchApprovedEmails(vagaId)
        ]);

        const list = candidates.data || [];
        if (list.length === 0) {
            toast('Nenhum candidato para notificar');
            setCloseModalOpen(null);
            return;
        }

        const results = await Promise.allSettled(
            list.map(c => {
                const fn = approvedEmails.has(c.candidate_email?.toLowerCase())
                    ? 'send-approval-email'
                    : 'send-candidate-thankyou-email';
                return supabase.functions.invoke(fn, {
                    body: { candidateName: c.candidate_name, candidateEmail: c.candidate_email, jobTitle: title }
                });
            })
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        toast.success(`${sent} e-mails enviados${failed ? `, ${failed} falhas` : ''}`);

    } catch (err) {
        console.error('Erro ao fechar vaga:', err);
        toast.error('Erro ao fechar vaga');
    } finally {
        setSendingCloseEmails(false);
        setCloseModalOpen(null);
        setCloseCounts(null);
    }
}
```

### 1.5 — Adicionar `confirmCloseWithoutEmail()` (fecha sem enviar)

```ts
async function confirmCloseWithoutEmail(vagaId: string) {
    try {
        await supabase
            .from('vagas_white_label')
            .update({ status: 'fechada', is_accepting_applications: false })
            .eq('id', vagaId);

        await supabase
            .from('pipelines')
            .update({ is_active: false })
            .eq('vaga_id', vagaId);

        toast.success('Vaga fechada com sucesso');
    } catch (err) {
        toast.error('Erro ao fechar vaga');
    } finally {
        setCloseModalOpen(null);
        setCloseCounts(null);
    }
}
```

### 1.6 — Adicionar novo modal no JSX (antes do modal de delete antigo, ~linha 1408)

Renderizar condicionalmente:

```tsx
{closeModalOpen && (
    <div style={{...backdrop}}>
        <div style={{...modalCard}}>
            {loadingCounts ? (
                /* spinner */
            ) : (
                /* preview + opções */
            )}
        </div>
    </div>
)}
```

### 1.7 — Adicionar `handleDeletePipeline` (exclui sem enviar)

```ts
async function handleDeletePipeline(vagaId: string) {
    setDeletingPipeline(true);
    try {
        await supabase.from('pipelines').delete().eq('vaga_id', vagaId);
        toast.success('Pipeline excluído');
    } catch (err) {
        toast.error('Erro ao excluir pipeline');
    } finally {
        setDeletingPipeline(false);
        setCloseModalOpen(null);
        setCloseCounts(null);
    }
}
```

---

## FASE 2 — Trocar entry point (1 arquivo, 1 linha)

### 2.1 — Modificar `updateVagaStatus()` (linhas 320-338)

**ANTES:**
```ts
if (status === 'cancelada' || status === 'fechada') {
    setVagaForPipelineDelete(id);
    setPipelineDeleteModalOpen(true);
```

**DEPOIS:**
```ts
if (status === 'cancelada' || status === 'fechada') {
    // Verificar se tem pipeline
    const { data: pipes } = await supabase
        .from('pipelines')
        .select('id')
        .eq('vaga_id', id);

    if (!pipes?.length) {
        // Sem pipeline → fechar direto (já atualizou status na linha 295-298)
        setVagas(prev => prev.map(v => v.id === id ? { ...v, status, is_accepting_applications: false } : v));
        toast.success('Vaga fechada com sucesso');
        return;
    }

    // Com pipeline → abrir modal único
    // Reverter status que já foi setado (voltamos para aberta, o modal confirma)
    await supabase
        .from('vagas_white_label')
        .update({ status: 'aberta', is_accepting_applications: true })
        .eq('id', id);

    setCloseModalOpen({ vagaId: id, title: vaga.title });
    fetchCloseCounts(id);
```

**Por que reverter?** As linhas 295-298 já atualizaram para 'fechada' antes do modal. Precisamos reverter para 'aberta' e só marcar como 'fechada' quando o usuário confirmar no modal.

### 2.2 — TESTAR

1. Abrir vaga com pipeline → mudar status para "Fechada"
2. Verificar se o novo modal aparece com os counts corretos
3. Testar "Enviar E-mails" → verificar se os e-mails chegam
4. Testar "Fechar sem Enviar" → verificar se fecha sem e-mails
5. Testar "Excluir Pipeline" → verificar se exclui e fecha
6. Testar "Cancelar" → verificar se status volta pra "Aberta"

---

## FASE 3 — Remover código morto (só após Fase 2 funcionando)

### 3.1 — Remover estados
- `pipelineDeleteModalOpen`
- `vagaForPipelineDelete`
- `closeEmailVaga`
- `closeEmailVagaCount`

### 3.2 — Remover funções
- `confirmPipelineDelete()`
- `cancelPipelineDelete()`

### 3.3 — Remover JSX
- Modal "Pipeline Delete Confirmation" (linhas ~1410-1512)
- Modal "Thank You Email" (linhas ~1513-1558)

### 3.4 — `npm run build` — verificar zero erros

---

---

## FASE 4 — Vincular pipeline a vaga existente (Pipeline.tsx)

**Problema:** Quando uma vaga é criada sem pipeline (opção "Não, criar manualmente depois"), não há como vincular um pipeline depois. O modal "Novo Processo Seletivo" em `Pipeline.tsx` só pede o nome, sem opção de vincular a uma vaga.

**Objetivo:** No modal de criação de pipeline, adicionar uma opção expansível (tooltip/accordion) "Vincular a vaga existente" que permite selecionar uma vaga.

**Regras de exibição de vagas:**
- Mostrar apenas vagas com status `aberta` ou `invisivel`
- **NÃO** mostrar vagas `fechada`, `pausada` ou `cancelada`
- Se uma vaga fechada for reaberta para `aberta`, ela volta a aparecer
- Apenas vagas **sem pipeline vinculado** (`pipeline_id is null`)

**Regras de nome do pipeline:**
- **Pipeline novo (sem nome digitado):** Ao selecionar a vaga, o nome do pipeline auto-preenche com o título da vaga (ex: "Design")
- **Pipeline novo (já digitou um nome):** mantém o nome digitado (não sobrescrever)
- **Pipeline existente vinculando a uma vaga:** renomear para `"{nomeAtual} - {tituloVaga} ({job_code})"` (ex: "AB - Design (VAGA-01)")

### 4.1 — Carregar vagas disponíveis (sem pipeline)

Adicionar no `init()` ou em um `useEffect` separado:

```ts
async function loadAvailableVagas() {
    const { data } = await supabase
        .from('vagas_white_label')
        .select('id, title, job_code')
        .is('pipeline_id', null)
        .in('status', ['aberta', 'invisivel'])
        .eq('organization_id', profile.organization_id);

    setAvailableVagas(data || []);
}
```

### 4.2 — Adicionar toggle "Vincular a vaga existente" no modal "Novo Processo Seletivo"

No modal de criação de pipeline (linhas ~1787-1838), adicionar após o input de nome:

```tsx
{/* Opção expansível de vínculo */}
<details
    style={{ marginTop: 12, cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}
    onToggle={(e) => { if (e.currentTarget.open) loadAvailableVagas(); }}
>
    <summary style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500 }}>
        Vincular a vaga existente (opcional)
    </summary>
    <select
        value={selectedVagaId}
        onChange={e => {
            const vagaId = e.target.value;
            setSelectedVagaId(vagaId);
            // Auto-preenche nome se o usuário ainda não digitou nada
            if (vagaId && !newPipeName.trim()) {
                const vaga = availableVagas.find(v => v.id === vagaId);
                if (vaga) setNewPipeName(vaga.title);
            }
        }}
        style={{
            width: '100%', marginTop: 8, padding: '12px 14px',
            background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)',
            borderRadius: 10, color: '#f1f5f9', fontSize: 15,
            fontFamily: "'Space Grotesk', sans-serif", outline: 'none',
        }}
    >
        <option value="">Selecione uma vaga...</option>
        {availableVagas.map(v => (
            <option key={v.id} value={v.id}>
                {v.job_code ? `[${v.job_code}] ` : ''}{v.title}
            </option>
        ))}
    </select>
</details>
```

### 4.3 — Modificar `createPipeline()` para aceitar `vaga_id`

Na função `createPipeline()` (linhas ~707-742), alterar o insert para incluir `vaga_id` quando selecionada:

```ts
const insertData: any = {
    name: newPipeName.trim(),
    user_id: profile.userId,
    organization_id: profile.organization_id,
};
if (selectedVagaId) insertData.vaga_id = selectedVagaId;

const { data: pipe, error } = await supabase
    .from('pipelines')
    .insert(insertData)
    .select().single();
```

Após criar o pipeline com sucesso, se `selectedVagaId` foi informado, atualizar a vaga:

```ts
if (selectedVagaId) {
    await supabase
        .from('vagas_white_label')
        .update({ pipeline_id: pipe.id })
        .eq('id', selectedVagaId);
}
```

### 4.4 — Adicionar ação "Vincular a vaga" na lista de pipelines existentes

Quando um pipeline **já existe mas não tem vaga vinculada** (`vaga_id` é nulo), exibir um botão "Vincular a vaga" (ex: no tooltip/info do pipeline na sidebar ou no dropdown):

```tsx
{!p.vaga_id && (
    <button
        onClick={() => setLinkVagaPipeline(p)}
        style={{ /* botão pequeno */ }}
    >
        Vincular a vaga
    </button>
)}
```

Isso abre um modal simples com o mesmo selector de vagas do passo 4.2. Ao confirmar:

```ts
// Atualizar pipeline com vaga_id
await supabase.from('pipelines')
    .update({
        vaga_id: selectedVagaId,
        // Renomear para: "nomeAtual - tituloVaga (job_code)"
        name: `${linkVagaPipeline.name} - ${vagaAtual.title} (${vagaAtual.job_code})`,
    })
    .eq('id', linkVagaPipeline.id);

// Atualizar vaga com pipeline_id
await supabase.from('vagas_white_label')
    .update({ pipeline_id: linkVagaPipeline.id })
    .eq('id', selectedVagaId);
```

### 4.5 — Adicionar estados novos

```ts
const [availableVagas, setAvailableVagas] = useState<Array<{ id: string; title: string; job_code: string | null }>>([]);
const [selectedVagaId, setSelectedVagaId] = useState('');
const [linkVagaPipeline, setLinkVagaPipeline] = useState<Pipeline | null>(null);
```

### 4.6 — Limpar `selectedVagaId` ao fechar/criar

Garantir que o estado reseta quando o modal é fechado ou o pipeline é criado:

```ts
// No fechar modal
setShowCreatePipeline(false);
setSelectedVagaId('');

// No final de createPipeline()
setSelectedVagaId('');
```

### 4.7 — TESTAR

1. Criar vaga como "Invisível" sem pipeline → ir em Pipelines → "Novo Processo Seletivo"
2. Abrir "Vincular a vaga existente" → verificar se a vaga aparece
3. Selecionar a vaga → verificar se o nome do pipeline auto-preencheu
4. Criar → verificar pipeline vinculado e vaga com pipeline_id
5. Testar vaga "Fechada" → **não** deve aparecer no selector
6. Reabrir vaga fechada para "Aberta" → deve aparecer
7. Testar pipeline existente sem vínculo → clicar "Vincular a vaga" → selecionar vaga → verificar nome renomeado para `"AB - Design (VAGA-01)"`
8. Testar criar pipeline sem vincular vaga (comportamento atual continua funcionando)

---

## Resumo de Arquivos Modificados

| Fase | Arquivo | Mudança | Risco |
|------|---------|---------|-------|
| 1 | `Vagas.tsx` | +funções novas | 🔵 Nenhum (código novo não conectado) |
| 1 | `Vagas.tsx` | +modal novo | 🔵 Nenhum (renderizado ao lado do antigo) |
| 2 | `Vagas.tsx` | 1 linha em updateVagaStatus | 🟡 Reversível (`git revert`) |
| 3 | `Vagas.tsx` | -código morto | 🟢 Seguro (código não é mais chamado) |
| 4 | `Pipeline.tsx` | +selector de vaga no modal | 🔵 Nenhum (novo campo opcional) |
| 4 | `Pipeline.tsx` | +loadAvailableVagas | 🔵 Nenhum (função nova) |
| 4 | `Pipeline.tsx` | +ação vincular pipeline | 🔵 Nenhum (UI nova não conectada) |

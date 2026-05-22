# PLAN-004: Email de Aprovação no Pipeline

## Objetivo

Enviar e-mail de aprovação para o candidato quando ele for movido para a coluna "Aprovado" no pipeline, com confirmação via modal.

## Edge Function: `send-approval-email`

**Arquivo**: `supabase/functions/send-approval-email/index.ts`

Baseada no `send-application-email` (CORS, try/catch, Resend fetch), com diferenças:

| Campo | Valor |
|-------|-------|
| `from` | `Equipe de Carreiras <noreply@space.pro.br>` |
| `subject` | `"Parabéns, {candidateFirstName}! Você foi aprovado(a)!"` + `{jobTitle ? "para a vaga " + jobTitle : "no processo seletivo"}` |
| Parâmetros | `candidateName`, `candidateEmail`, `jobTitle` (jobTitle opcional — fallback textual se vazio) |
| HTML | Mesmo template visual (logo Usabit, gradiente azul escuro), mensagem de aprovação |

### Comportamento

- Se `RESEND_API_KEY` não configurada: loga erro, retorna 500
- Se campos obrigatórios faltando (`candidateName`, `candidateEmail`): retorna 400
- `jobTitle` é opcional — se vazio, o texto do email usa fallback genérico

## Modificações em `Pipeline.tsx`

### Imports

Adicionar:
```tsx
import toast from 'react-hot-toast';
```

### Estado

```tsx
const [approvalEmailTarget, setApprovalEmailTarget] = useState<{
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
} | null>(null);
```

### Função helper

```tsx
async function checkApprovalEmail(card: PipelineCard, colName: string) {
  if (!colName.toLowerCase().includes('aprovado')) return;

  const { data } = await supabase
    .from('candidates')
    .select('email')
    .eq('id', card.candidate_id)
    .single();

  if (!data?.email) {
    toast.error('Candidato não possui e-mail cadastrado');
    return;
  }

  let jobTitle = '';
  try {
    const notes = JSON.parse(card.notes || '{}');
    jobTitle = notes.selected_job_name || '';
  } catch {}

  setApprovalEmailTarget({
    candidateName: card.candidate_name,
    candidateEmail: data.email,
    jobTitle,
  });
}
```

### 3 pontos de disparo

| # | Local | Onde inserir |
|---|-------|-------------|
| 1 | **Drag-and-drop** (~linha 507-514) | Após `setCards(updatedCards)` e `supabase.from('pipeline_cards').update(...)`, verificar `targetCol.name` |
| 2 | **`moveCard()`** (~linha 1057) | Após `await supabase.from('pipeline_cards').update(...)` e `setCards(...)`, verificar `targetCol.name` |
| 3 | **`addCard()`** (~linha 978) | Após `setCards(prev => [...prev, newCard])`, verificar coluna alvo (`columnId` param) |

### Modal de confirmação

Mesmo padrão do modal de exclusão (overlay com backdrop-filter, card centralizado, dois botões):

```
┌─────────────────────────────────────────┐
│  Enviar e-mail de aprovação?            │
│                                         │
│  Deseja enviar um e-mail para           │
│  [Nome do candidato] informando         │
│  que foi aprovado(a)?                   │
│                                         │
│         [Não]    [Sim, enviar]          │
└─────────────────────────────────────────┘
```

- **"Sim, enviar"**: `supabase.functions.invoke('send-approval-email', body)` → `toast.success()` ou `toast.error()` → fecha modal
- **"Não"**: fecha modal

### Reaprovação

Toda vez que o card **entra** na coluna "Aprovado" (vindo de qualquer outra coluna), o modal aparece novamente. A verificação é feita no momento do movimento, independente de já ter estado lá antes.

## Deploy

```bash
supabase functions deploy send-approval-email
```

A `RESEND_API_KEY` já está setada como secret no projeto Supabase.

## Arquivos alterados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `supabase/functions/send-approval-email/index.ts` | **Novo** | ~140 linhas |
| `src/pages/candidates/Pipeline.tsx` | Modificado | ~+60 linhas |

# Plano: Email de Suspensão e Reabertura de Vaga

## Resumo

Implementar dois fluxos de e-mail:
1. **Cancelar vaga** - todos candidatos recebem email de "vaga suspensa"
2. **Reabrir vaga cancelada** - todos candidatos recebem email de "vaga reaberta"

---

## Correções de Pontos Cegos (v3)

### CB-1: `previousVagaStatus` — NÃO precisa de state novo
`vagaAtual.status` (linha 327) já contém o status ANTIGO da vaga, lido ANTES do update do banco. Comparar diretamente: `vagaAtual.status === 'cancelada'` é suficiente.

### CB-2: Detecção de reabertura no lugar errado
`updateVagaStatus(id, 'aberta')` entra no `else` (linha 317) que apenas reativa pipeline. É preciso um `else if (status === 'aberta' && vagaAtual?.status === 'cancelada')` explícito.

### CB-3: Filtro de email vazio
Antes de enviar, filtrar: `c.email && c.email.includes('@')`.

### CB-4: Modal "cancelada" não reutiliza breakdown categorizado
Para "cancelada" o modal mostra lista única (flat). O breakdown `{ approved, rejected, others }` ainda é usado para calcular a contagem, mas o modal ignora as categorias para "cancelada".

### CB-5: Cleanup de `closeEmailVagaType`
Todo "Não" / finally que limpa modal de email precisa também limpar `setCloseEmailVagaType(null)`.

### CB-6: Import de `RefreshCw`
O ícone `RefreshCw` (ou similar) precisa constar no import do lucide-react.

---

## Contexto Técnico Atual

### Fluxo existente de "Fechar Vaga" (`Vagas.tsx`)

**Trigger:** `updateVagaStatus(id, 'fechada')` ou `updateVagaStatus(id, 'cancelada')`

**`computeCloseEmailBreakdown(vagaId)`** (linha 449):
- Busca todos candidatos de `vagas_candidaturas` pela vaga
- Separa em 3 grupos: `approved`, `rejected`, `others`
- `approved` = estão no banco de talentos E na coluna "Aprovado" do pipeline
- `rejected` = NÃO estão no banco de talentos (foram reprovados direto)
- `others` = estão no banco mas NÃO estão no pipeline ou em outra coluna
- **Retorna:** `{ approved, rejected, others }` — cada um é `{ name, email }[]`

**Modal de email** (linha 1644):
- Mostra 3 seções colapsáveis: Aprovados (verde), Reprovados (vermelho), Demais (cinza)
- Botões: "Sim, enviar para N candidatos" / "Não"

**`sendCloseEmails(vagaId, vagaTitle)`** (linha 554):
- approved → `send-candidate-congratulations-email`
- rejected/others → `send-candidate-thankyou-email`

**`updateVagaStatus`** (linha 293):
- `status === 'fechada' || 'cancelada'`: abre modal de email se houver candidatos
- `status === 'aberta'`: else block — apenas reativa pipeline (NÃO detecta reabertura)
- `status === 'pausada'`: desativa pipeline

### Template de Email Base (usado em todos)

```html
- Background: #04070c com gradiente radial #1a3597
- Card: #0b111a, border-radius 24px, padding 48px 40px
- Logo: altura 32px, embed via cid:logo (content_id: 'logo')
- Fonts: Inter (400,600,700) + Space Grotesk (700)
- From: Equipe de Carreiras <noreply@space.pro.br>
- Logo PNG via LOGO_BASE64 (same em todas functions)
```

---

## User Stories

### US1: Cancelar vaga - Email de Suspensão

**Quando:** RH muda status da vaga para "Cancelada"

**Fluxo:**
1. `updateVagaStatus(id, 'cancelada')` executa
2. `computeCloseEmailBreakdown(id)` roda (linha 345)
3. Modal de email abre com `tipo='cancelada'`:
   - Lista única (flat) de TODOS candidatos, sem separação por categoria
   - Texto: "Esta vaga foi cancelada. Os candidatos serão notificados."
   - Botão: "Sim, notificar N candidatos" / "Não"
4. Se "Sim": `sendCloseEmails(id, title, 'cancelada')` — todos recebem `send-candidate-vaga-canceled-email`
5. Se "Não": limpa states e abre modal de pipeline se aplicável

### US2: Reabrir vaga cancelada - Email de Reabertura

**Quando:** RH muda status de "Cancelada" para "Aberta"

**Fluxo:**
1. `updateVagaStatus(id, 'aberta')` executa
2. `else if (status === 'aberta' && vagaAtual?.status === 'cancelada')` detecta reabertura
3. `computeCloseEmailBreakdown(id)` busca candidatos
4. Modal de reabertura abre:
   - Lista de candidatos (flat, única seção)
   - Pergunta: "A vaga foi reaberta. Deseja notificar os candidatos?"
   - Botões: "Sim, notificar" / "Não"
5. Se "Sim": `sendReopenedEmails(id, title)` — todos recebem `send-candidate-vaga-reopened-email`
6. Se "Não": apenas muda status e reativa pipeline

---

## Tarefas

### Tarefa 1: Nova Edge Function `send-candidate-vaga-canceled-email`

**Arquivo:** `supabase/functions/send-candidate-vaga-canceled-email/index.ts`

**Steps:**
1. Copiar estrutura exata de `send-candidate-thankyou-email` (mesmo HTML template, mesmo logo, mesmo `LOGO_BASE64`, mesmo `from`, mesmo `attachments`)
2. Modificar APENAS:
   - Function name em `Deno.serve`
   - `candidateName`, `candidateEmail`, `jobTitle` como parâmetros
   - Subject: `"Atualização sobre sua candidatura - ${jobTitle}"`
   - Corpo HTML (ver abaixo)
   - NÃO alterar mais nada — estrutura, cores, logo, fonte idem

**Corpo HTML do email cancelado:**
```html
<h2 style="color: #6366f1; font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em;">Olá, ${candidateFirstName}!</h2>
<p style="font-size: 17px; line-height: 1.6; color: #ffffff; margin: 0; font-weight: 500;">
    Sua candidatura para a vaga:
    <span style="display: block; margin-top: 8px; color: #94a3b8; font-size: 18px; font-weight: 700;">${jobTitle}</span>
</p>
<p style="color: #94a3b8; font-size: 16px; line-height: 1.7; margin: 24px 0 20px;">
    Informamos que esta vaga foi <strong style="color:#f59e0b;">cancelada</strong>.
</p>
<p style="color: #94a3b8; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
    No momento, a posição não está mais disponível. Caso a vaga seja reaberta futuramente, entraremos em contato.
</p>
<p style="color: #ffffff; font-size: 16px; line-height: 1.7; font-weight: 600; margin: 0;">
    Desejamos muito sucesso na sua jornada profissional!
</p>
```

---

### Tarefa 2: Nova Edge Function `send-candidate-vaga-reopened-email`

**Arquivo:** `supabase/functions/send-candidate-vaga-reopened-email/index.ts`

**Steps:**
1. Copiar estrutura exata de `send-candidate-thankyou-email`
2. Modificar APENAS:
   - Function name em `Deno.serve`
   - `candidateName`, `candidateEmail`, `jobTitle` como parâmetros
   - Subject: `"Boas notícias! Sua candidatura foi reaberta - ${jobTitle}"`
   - Corpo HTML (ver abaixo)

**Corpo HTML do email reaberto:**
```html
<h2 style="color: #22c55e; font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em;">Olá, ${candidateFirstName}!</h2>
<p style="font-size: 17px; line-height: 1.6; color: #ffffff; margin: 0; font-weight: 500;">
    Ótima notícia! A vaga:
    <span style="display: block; margin-top: 8px; color: #94a3b8; font-size: 18px; font-weight: 700;">${jobTitle}</span>
</p>
<p style="color: #94a3b8; font-size: 16px; line-height: 1.7; margin: 24px 0 20px;">
    para a qual você se candidatou, foi <strong style="color:#22c55e;">reaberta</strong>!
</p>
<p style="color: #94a3b8; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
    Se você ainda tem interesse, por favor, entre em contato para darmos continuidade ao processo.
</p>
<p style="color: #ffffff; font-size: 16px; line-height: 1.7; font-weight: 600; margin: 0;">
    Estamos ansiosos para tê-lo(a) em nosso processo seletivo!
</p>
```

---

### Tarefa 3: Modificar `sendCloseEmails` para suportar `cancelada`

**Arquivo:** `src/pages/vagas/Vagas.tsx`

**Changes:**
1. Mudar assinatura:
   ```typescript
   async function sendCloseEmails(vagaId: string, vagaTitle: string, tipo: 'fechada' | 'cancelada' = 'fechada')
   ```
2. `allCandidaturas` já é flat: `[...breakdown.approved, ...breakdown.rejected, ...breakdown.others]`
3. NOVO: filtrar emails vazios antes de enviar:
   ```typescript
   const validCandidaturas = allCandidaturas.filter(c => c.email && c.email.includes('@'));
   ```
4. No Promise.allSettled, logic:
   ```typescript
   if (tipo === 'cancelada') {
     return supabase.functions.invoke('send-candidate-vaga-canceled-email', { body: { candidateName: c.name, candidateEmail: c.email, jobTitle: vagaTitle } });
   }
   // tipo === 'fechada'
   if (approvedEmails.has(c.email)) {
     return supabase.functions.invoke('send-candidate-congratulations-email', { ... });
   }
   return supabase.functions.invoke('send-candidate-thankyou-email', { ... });
   ```
5. Toast: para `cancelada` usar "Nenhum candidato para notificar" (não "enviar email")
6. Filtro de `validCandidaturas.length === 0` antes do Promise.allSettled

---

### Tarefa 4: Modal de email para "cancelada" (lista única vs 3 seções)

**Arquivo:** `src/pages/vagas/Vagas.tsx`

**Changes:**

1. **State novo** (adicão near linha 98):
   ```typescript
   const [closeEmailVagaType, setCloseEmailVagaType] = useState<'fechada' | 'cancelada'>('fechada');
   ```

2. **No `updateVagaStatus`** (linha 326-362):
   - Quando `status === 'cancelada'`: `setCloseEmailVagaType('cancelada')` antes de abrir modal
   - Quando `status === 'fechada'`: `setCloseEmailVagaType('fechada')`

3. **No JSX do modal** (linha 1644-1760), condicional por `closeEmailVagaType`:
   ```jsx
   {closeEmailVagaType === 'cancelada' ? (
     // Lista única flat
     <div>
       <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
         Esta vaga foi cancelada. Os candidatos serão notificados por e-mail.
       </p>
       <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24 }}>
         {closeEmailBreakdown && (
           <>
             {closeEmailBreakdown.approved.concat(closeEmailBreakdown.rejected, closeEmailBreakdown.others).map(c => (
               <div key={c.email} style={{ padding: '8px 14px', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                 {c.name} <span style={{ color: 'var(--text-dim)' }}>{c.email}</span>
               </div>
             ))}
           </>
         )}
       </div>
     </div>
   ) : (
     // 3 seções colapsáveis (fechada) - código original
     ...
   )}
   ```
   - Header do modal: usar ícone `AlertTriangle` com cor laranja para cancelada (não `Mail` com primary)

4. **Botão "Não"** (linha 1746): também limpar `setCloseEmailVagaType(null)` no cleanup

5. **finally block** de `sendCloseEmails` (linha 608-618): também `setCloseEmailVagaType(null)`

---

### Tarefa 5: Detectar reabertura em `updateVagaStatus`

**Arquivo:** `src/pages/vagas/Vagas.tsx`

**Changes** em `updateVagaStatus` (after linha 323):

```typescript
// NOVO: Reabertura de vaga cancelada
else if (status === 'aberta' && vagaAtual?.status === 'cancelada') {
    // Buscar candidatos para possivel notificacao
    const breakdown = await computeCloseEmailBreakdown(id);
    const allCandidates = breakdown
        ? [...breakdown.approved, ...breakdown.rejected, ...breakdown.others].filter(c => c.email && c.email.includes('@'))
        : [];

    if (allCandidates.length > 0) {
        setReopenCandidates(allCandidates);
        setReopenEmailVagaId(id);
        setReopenEmailVagaTitle(vagaAtual?.title || '');
        setShowReopenEmailModal(true);
    } else {
        // Sem candidatos: só muda status e reativa pipeline
        setVagas(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
        toast.success(`Status alterado para "Aberta"`);
    }
    return; // IMPORTANTE: não executar o código abaixo
}
```

**States novos** (near linha 98):
```typescript
const [showReopenEmailModal, setShowReopenEmailModal] = useState(false);
const [reopenEmailVagaId, setReopenEmailVagaId] = useState<string | null>(null);
const [reopenEmailVagaTitle, setReopenEmailVagaTitle] = useState('');
const [reopenCandidates, setReopenCandidates] = useState<{name: string; email: string}[]>([]);
```

---

### Tarefa 6: Modal de "Reabertura de Vaga" + `sendReopenedEmails`

**Arquivo:** `src/pages/vagas/Vagas.tsx`

**Novo modal JSX** (after the closeEmailVaga modal, before closing `</div>`):

```jsx
{showReopenEmailModal && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 40, maxWidth: 480, width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <RefreshCw size={40} color="#22c55e" />
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 12 }}>Notificar candidatos?</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    A vaga foi reaberta. Deseja notificar os candidatos?
                </p>
            </div>

            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24 }}>
                {reopenCandidates.map(c => (
                    <div key={c.email} style={{ padding: '8px 14px', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                        {c.name} <span style={{ color: 'var(--text-dim)' }}>{c.email}</span>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                    onClick={() => sendReopenedEmails()}
                    disabled={sendingCloseEmails}
                    style={{
                        width: '100%', padding: 16,
                        background: 'var(--primary)', border: 'none', borderRadius: 12,
                        color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700,
                        opacity: sendingCloseEmails ? 0.7 : 1
                    }}
                >
                    {sendingCloseEmails ? 'Enviando...' : `Sim, notificar ${reopenCandidates.length} candidato${reopenCandidates.length !== 1 ? 's' : ''}`}
                </button>
                <button
                    onClick={() => {
                        setShowReopenEmailModal(false);
                        setReopenCandidates([]);
                        setReopenEmailVagaId(null);
                        setReopenEmailVagaTitle('');
                    }}
                    disabled={sendingCloseEmails}
                    style={{
                        width: '100%', padding: 16,
                        background: 'transparent', border: '1px solid var(--border)', borderRadius: 12,
                        color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, fontWeight: 600
                    }}
                >
                    Não
                </button>
            </div>
        </div>
    </div>
)}
```

**Nova funcao** `sendReopenedEmails` (near `sendCloseEmails`):
```typescript
async function sendReopenedEmails() {
    if (sendingCloseEmails || !reopenEmailVagaId) return;
    setSendingCloseEmails(true);
    try {
        const results = await Promise.allSettled(
            reopenCandidates.map(c =>
                supabase.functions.invoke('send-candidate-vaga-reopened-email', {
                    body: { candidateName: c.name, candidateEmail: c.email, jobTitle: reopenEmailVagaTitle }
                })
            )
        );
        const sent = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
            toast.success(`${sent} notificações enviadas, ${failed} falhas`);
        } else {
            toast.success(`${sent} candidat${sent !== 1 ? 'os' : 'a'} notificado${sent !== 1 ? 's' : ''} sobre a reabertura`);
        }
    } catch (err) {
        console.error('Erro ao enviar notificações:', err);
        toast.error('Erro ao enviar notificações');
    } finally {
        setSendingCloseEmails(false);
        setShowReopenEmailModal(false);
        setReopenCandidates([]);
        setReopenEmailVagaId(null);
        setReopenEmailVagaTitle('');
    }
}
```

---

### Tarefa 7: Adicionar import `RefreshCw`

**Arquivo:** `src/pages/vagas/Vagas.tsx`, linha 5:
```typescript
import { Briefcase, Plus, Search, Filter, Edit, Trash2, Eye, ExternalLink, ChevronDown, Users, AlertTriangle, X, Mail, RefreshCw } from 'lucide-react';
```

---

### Tarefa 8: Deploy das Edge Functions

```bash
npx supabase functions deploy send-candidate-vaga-canceled-email
npx supabase functions deploy send-candidate-vaga-reopened-email
```

---

## Validação

Após implementar:

1. `npm run build` — sem erros
2. `npm run lint` — sem erros
3. `npm run typecheck` — sem erros
4. **Cancelar vaga** com candidatos → modal mostra lista ÚNICA (não 3 seções), ícone AlertTriangle laranja
5. **Confirmar cancelamento** → todos recebem `send-candidate-vaga-canceled-email`
6. **Fechar vaga** → modal mostra 3 seções colapsáveis (comportamento inalterado)
7. **Cancelada → Aberta** → modal "Notificar candidatos?" aparece com `RefreshCw` verde
8. **Confirmar reabertura** → todos recebem `send-candidate-vaga-reopened-email`
9. **Cancelada → Aberta** (sem candidatos) → muda status diretamente sem modal
10. `git diff` antes de commit — verificar apenas changes esperados

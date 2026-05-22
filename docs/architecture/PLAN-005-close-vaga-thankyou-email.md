# PLAN-005: Email de Agradecimento ao Fechar Vaga

## Objetivo

Quando uma vaga for fechada (status `'fechada'`), exibir modal perguntando se deseja enviar e-mails de agradecimento para os candidatos que **não foram movidos para o Banco de Talentos** daquela vaga.

## Fluxo Completo

```
Usuário muda status da vaga para "Fechada"
  → updateVagaStatus() altera status + desativa pipeline
  → Modal 1: "Excluir Pipeline de Candidatos?" (já existe)
  → Usuário clica "Sim, Excluir Pipeline" ou "Não, manter histórico"
  → Modal 1 fecha
  → Modal 2: "Enviar e-mails de agradecimento?"  ← NOVO
     → "Não": apenas fecha
     → "Sim, enviar para N candidatos": envia emails em paralelo
       → toast com resultado (X enviados, Y falhas)
```

**Independência**: O Modal 2 aparece independente da escolha no Modal 1 (excluir ou não o pipeline).

## Edge Function: `send-candidate-thankyou-email`

**Arquivo**: `supabase/functions/send-candidate-thankyou-email/index.ts`

Baseada no `send-application-email` (CORS, try/catch, Resend fetch, mesmo tema visual).

| Campo | Valor |
|-------|-------|
| `from` | `Equipe de Carreiras <noreply@space.pro.br>` |
| `subject` | `"Agradecimento pela sua candidatura - {jobTitle}"` |
| Parâmetros | `candidateName` (obrigatório), `candidateEmail` (obrigatório), `jobTitle` (obrigatório) |
| HTML | Mesmo template (logo Usabit, gradiente escuro), mensagem: "Não deu certo desta vez, mas agradecemos seu interesse. Desejamos sucesso na sua jornada." |

### Tratamento de erros
- `RESEND_API_KEY` não configurada → log + 500
- Campos obrigatórios faltando → 400
- Resend retorna erro → log + 500

## Modificações em `Vagas.tsx`

### Estado novo

```tsx
const [closeEmailVaga, setCloseEmailVaga] = useState<{ id: string; title: string } | null>(null);
const [closeEmailVagaCount, setCloseEmailVagaCount] = useState<number | null>(null);  // ← Contagem de candidatos
const [sendingCloseEmails, setSendingCloseEmails] = useState(false);
```

### Alteração em `confirmPipelineDelete` (linha ~341)

No `finally`, após fechar o modal de pipeline, buscar contagem e abrir modal de email:

```tsx
finally {
    setDeletingPipeline(false);
    setPipelineDeleteModalOpen(false);
    const vaga = vagas.find(v => v.id === vagaForPipelineDelete);
    if (vaga) {
        // Buscar contagem de candidatos elegíveis para email
        const { count } = await supabase
            .from('vagas_candidaturas')
            .select('id', { count: 'exact' })
            .eq('vaga_id', vagaForPipelineDelete!)
            .eq('organization_id', profile.organization_id)
            .neq('status', 'talent_bank');
        setCloseEmailVagaCount(count || 0);
        setCloseEmailVaga({ id: vagaForPipelineDelete!, title: vaga.title });
    }
    setVagaForPipelineDelete(null);
}
```

### Alteração em `cancelPipelineDelete` (linha ~370)

```tsx
const cancelPipelineDelete = async () => {
    const vaga = vagas.find(v => v.id === vagaForPipelineDelete);
    setPipelineDeleteModalOpen(false);
    if (vaga) {
        // Buscar contagem de candidatos elegíveis para email
        const { count } = await supabase
            .from('vagas_candidaturas')
            .select('id', { count: 'exact' })
            .eq('vaga_id', vagaForPipelineDelete!)
            .eq('organization_id', profile.organization_id)
            .neq('status', 'talent_bank');
        setCloseEmailVagaCount(count || 0);
        setCloseEmailVaga({ id: vagaForPipelineDelete!, title: vaga.title });
    }
    setVagaForPipelineDelete(null);
};
```

### Função de envio

```tsx
async function sendCloseEmails(vagaId: string, vagaTitle: string, organizationId: string, candidateCount?: number | null) {
    if (sendingCloseEmails) return;  // Guard contra double-click
    setSendingCloseEmails(true);
    try {
        const { data: candidates } = await supabase
            .from('vagas_candidaturas')
            .select('candidate_name, candidate_email')
            .eq('vaga_id', vagaId)
            .eq('organization_id', organizationId)
            .neq('status', 'talent_bank');

        if (!candidates?.length) {
            toast.success('Nenhum candidato pendente para enviar e-mail');
            setCloseEmailVaga(null);
            setCloseEmailVagaCount(null);
            return;
        }

        const count = candidateCount ?? candidates.length;
        const results = await Promise.allSettled(
            candidates.map(c =>
                supabase.functions.invoke('send-candidate-thankyou-email', {
                    body: {
                        candidateName: c.candidate_name,
                        candidateEmail: c.candidate_email,
                        jobTitle: vagaTitle,
                    }
                })
            )
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (failed > 0) {
            toast.success(`${sent} e-mails enviados, ${failed} falhas`);
        } else {
            toast.success(`${sent} e-mail${sent !== 1 ? 's' : ''} de agradecimento enviado${sent !== 1 ? 's' : ''}`);
        }
    } catch (err) {
        toast.error('Erro ao enviar e-mails');
    } finally {
        setSendingCloseEmails(false);
        setCloseEmailVaga(null);
        setCloseEmailVagaCount(null);
    }
}
```

### Critério de filtro

```sql
status != 'talent_bank'
```

Inclui: `'pendente'` (default), `NULL`, `'rejeitado'` (se existir), etc.
Exclui: candidatos que foram explicitamente transferidos para o Banco de Talentos.

### Modal de confirmação (após modal do pipeline)

```tsx
{closeEmailVaga && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'fadeIn 0.2s ease-out' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 40, maxWidth: 480, width: '90%', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Mail size={40} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 12 }}>Enviar e-mails de agradecimento?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
                Deseja enviar e-mails de agradecimento para os candidatos que não foram selecionados para o Banco de Talentos?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                    onClick={() => {
                        if (sendingCloseEmails) return;  // ← Guard contra double-click
                        const candidateCount = closeEmailVagaCount;  // Pré-buscado na abertura do modal
                        sendCloseEmails(closeEmailVaga.id, closeEmailVaga.title, profile.organization_id, candidateCount);
                    }}
                    disabled={sendingCloseEmails}
                    style={{
                        width: '100%', padding: 16,
                        background: sendingCloseEmails ? '#6366f1' : 'var(--primary)',  // ← Feedback visual
                        border: 'none', borderRadius: 12, color: '#fff',
                        cursor: sendingCloseEmails ? 'not-allowed' : 'pointer',
                        fontSize: 16, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        opacity: sendingCloseEmails ? 0.7 : 1
                    }}
                >
                    {sendingCloseEmails ? 'Enviando...' : `Sim, enviar para ${candidateCount || '...'} candidato${candidateCount !== 1 ? 's' : ''}`}
                </button>
                <button
                    onClick={() => { setCloseEmailVaga(null); setCloseEmailVagaCount(null); }}
                    disabled={sendingCloseEmails}
                    style={{
                        width: '100%', padding: 16,
                        background: 'transparent', border: '1px solid var(--border)', borderRadius: 12,
                        color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, fontWeight: 600,
                        opacity: sendingCloseEmails ? 0.5 : 1
                    }}
                >
                    Não
                </button>
            </div>
        </div>
    </div>
)}
```

**Nota:** Para mostrar a contagem de candidatos antes de confirmar, é necessário buscar a contagem quando o modal é aberto (no `confirmPipelineDelete` e `cancelPipelineDelete`). Adicione estado `const [closeEmailVagaCount, setCloseEmailVagaCount] = useState<number | null>(null);` e busque com `.eq('vaga_id', vagaId).eq('organization_id', profile.organization_id).neq('status', 'talent_bank').select('id', { count: 'exact' })`.

**Necessário adicionar `Mail` ao import de `lucide-react` em Vagas.tsx.**

## Deploy

```bash
supabase functions deploy send-candidate-thankyou-email
```

`RESEND_API_KEY` já configurada como secret no projeto Supabase.

## Arquivos

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `supabase/functions/send-candidate-thankyou-email/index.ts` | **Novo** | ~140 linhas |
| `src/pages/vagas/Vagas.tsx` | Modificado | ~+100 linhas (estado + função + modal + import Mail) |

## Observações

- Email é enviado **apenas** para candidatos com `status != 'talent_bank'` na tabela `vagas_candidaturas`
- **Multi-tenancy**: Todas as queries devem incluir `.eq('organization_id', profile.organization_id)`
- Candidatos já no Banco de Talentos NÃO recebem o email
- O modal de email aparece independente da decisão de excluir ou manter o pipeline
- Envio em lote com `Promise.allSettled` — falhas em alguns emails não bloqueiam os demais
- Feedback visual via `toast.success`/`toast.error`
- Se não houver candidatos pendentes, mostra toast informativo e não tenta enviar
- **Proteção contra double-click**: Guard `if (sendingCloseEmails) return` no início do handler + `disabled` nos botões durante envio
- Contagem de candidatos é buscada **antes** de abrir o modal para exibir no botão

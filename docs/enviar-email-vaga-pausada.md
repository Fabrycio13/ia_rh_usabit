# Enviar e-mail ao pausar vaga

## Contexto

Quando uma vaga é pausada, o pipeline é desativado mas nenhum e-mail é enviado aos candidatos. O fluxo deve ser similar ao de cancelamento: ao mudar status para "pausada", perguntar se deseja notificar todos os candidatos da vaga e do pipeline.

## Template do e-mail

**Assunto:** Atualização sobre a vaga de [Nome da Vaga]

**Corpo:**

> Olá, [Nome].
>
> Gostaríamos de informar que o processo seletivo referente à vaga de [Nome da Vaga] foi temporariamente pausado por necessidades internas da empresa.
>
> Neste momento, não há previsão definida para a continuidade das etapas, mas manteremos seu cadastro ativo e entraremos em contato caso o processo seja retomado.
>
> Agradecemos sua compreensão e o interesse em fazer parte da nossa equipe.
>
> Atenciosamente,

## Implementação

### 1. Nova Edge Function

Criar `supabase/functions/send-candidate-vaga-paused-email/index.ts`

- Cópia adaptada de `send-candidate-vaga-canceled-email`
- Conteúdo HTML com o template acima
- Enviada via Resend de `noreply@space.pro.br`
- Input: `{ candidateName, candidateEmail, jobTitle }`

### 2. Alterações em `src/pages/vagas/Vagas.tsx`

**a. `updateVagaStatus` (~linha 329)**

O caso `pausada` hoje faz apenas:
```ts
if (status === 'pausada') {
    await supabase.from('pipelines').update({ is_active: false }).eq('vaga_id', id);
}
```

Mudar para:
- Manter a mutation no banco (`status='pausada'`, `is_accepting_applications=false`)
- Manter a desativação do pipeline imediatamente
- Chamar `computeCloseEmailBreakdown(id)` para buscar candidatos
- Se houver candidatos → abrir modal de confirmação de envio
- Se não houver → toast "Status alterado para 'Pausada'" (igual hoje)

**b. Estender `closeEmailVagaType`**

`'cancelada' | 'fechada'` → `'cancelada' | 'fechada' | 'pausada'`

**c. `sendCloseEmails` (~linha 610)**

Adicionar branch para `tipo === 'pausada'`:
```
todos os candidatos → invoke send-candidate-vaga-paused-email
```

**d. Modal de confirmação (~linha 1791)**

Adicionar variante `pausada`:
- Ícone `PauseCircle` (lucide-react)
- Título: "Notificar candidatos?"
- Texto: "Esta vaga foi pausada. Os candidatos serão notificados por e-mail."
- Lista de candidatos (igual cancelada)
- Botões: "Sim, enviar para N candidatos" / "Não"

**e. Fluxo pós-modal**

Quando tipo for `pausada`, **não** abrir modal de exclusão de pipeline (diferente de cancelada/fechada).

### 3. Deploy

```sh
npx supabase functions deploy send-candidate-vaga-paused-email
```

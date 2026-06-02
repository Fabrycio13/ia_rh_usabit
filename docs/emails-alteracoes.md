# Alterações de E-mails

> Documento de controle para alterações nos templates de e-mail.
>
> **From geral:** `Equipe de Talentos Usabit <noreply@space.pro.br>` (atualizar em todas)
> **Nota:** `{displayName}` = nome da organização (dinâmico por tenant)
> **Footer:** Substituir o footer atual pelo mesmo estilo do portal público (tagline + redes sociais + WhatsApp + copyright)
> **Status:** ✅ Concluído (subject + from + body + footer) — deploy pendente

## send-application-email

**Status:** Pendente

**Alteração:**
- Assunto: `Recebemos seu currículo`
- From: `Equipe de Talentos Usabit <noreply@space.pro.br>`
- Texto:

---

Olá, {candidateFirstName}.

Agradecemos pelo seu interesse na vaga de {jobTitle}.

Recebemos seu currículo com sucesso e ele será analisado pela nossa equipe de Recrutamento e Seleção. Caso seu perfil esteja alinhado aos requisitos da posição, entraremos em contato para dar continuidade ao processo.

Agradecemos pelo seu interesse em fazer parte da nossa equipe.

Atenciosamente, Equipe de Talentos Usabit

---

**Arquivo:** `supabase/functions/send-application-email/index.ts`

---

## send-spontaneous-email

**Status:** Pendente

**Alteração:**
- Assunto: `Cadastro realizado com sucesso`
- From: `Equipe de Talentos Usabit <noreply@space.pro.br>`
- Variáveis: `{candidateFirstName}`, `{displayName}` (nome da org)
- Texto:

---

Olá, {candidateFirstName}.

Agradecemos pelo envio do seu currículo.

Seu perfil foi incluído em nosso Banco de Talentos e poderá ser considerado para futuras oportunidades compatíveis com sua experiência e qualificações.

Sempre que surgirem vagas aderentes ao seu perfil, nossa equipe poderá entrar em contato.

Agradecemos pelo seu interesse em fazer parte da {displayName}.

Atenciosamente, Equipe de Talentos {displayName}

---

**Arquivo:** `supabase/functions/send-spontaneous-email/index.ts`

---

## send-candidate-thankyou-email

**Status:** Pendente

**Alteração:**
- Assunto: `Retorno do Processo Seletivo – {jobTitle}`
- From: `Equipe de Talentos Usabit <noreply@space.pro.br>`
- Texto:

---

Olá, {candidateFirstName}.

Agradecemos sua participação no processo seletivo para a vaga de {jobTitle}.

Após a conclusão das avaliações, optamos por seguir com outro candidato que apresentou maior aderência às necessidades da posição neste momento.

Agradecemos pelo interesse em nossa empresa e pelo tempo dedicado ao processo. Seu currículo poderá permanecer em nosso banco de talentos para futuras oportunidades compatíveis com seu perfil.

Desejamos sucesso em sua trajetória profissional.

Atenciosamente, Equipe de Talentos Usabit

---

**Arquivo:** `supabase/functions/send-candidate-thankyou-email/index.ts`

---

## send-candidate-congratulations-email

**Status:** Pendente

**Alteração:**
- Assunto: `Retorno do Processo Seletivo – {jobTitle}`
- From: `Equipe de Talentos Usabit <noreply@space.pro.br>`
- Texto:

---

Olá, {candidateFirstName}.

Temos o prazer de informar que você foi selecionado(a) para a vaga de {jobTitle}.

Parabenizamos você pelo desempenho ao longo do processo seletivo e estamos muito felizes em seguir com sua contratação.

Em breve, nossa equipe entrará em contato para compartilhar as próximas etapas e orientações necessárias.

Seja bem-vindo(a) ao time!

Atenciosamente, Equipe de Talentos Usabit

---

**Arquivo:** `supabase/functions/send-candidate-congratulations-email/index.ts`

---

## send-candidate-vaga-canceled-email

**Status:** Pendente

**Alteração:**
- Assunto: `Atualização sobre a vaga de {jobTitle}`
- From: `Equipe de Talentos Usabit <noreply@space.pro.br>`
- Texto:

---

Olá, {candidateFirstName}.

Agradecemos sua participação no processo seletivo para a vaga de {jobTitle}.

Informamos que, por decisão interna e alinhamento estratégico da empresa, esta oportunidade foi cancelada e o processo seletivo foi encerrado.

Agradecemos seu interesse e o tempo dedicado durante esta etapa. Seu perfil poderá ser considerado para futuras oportunidades compatíveis com sua experiência ou até mesmo em caso de reabertura desta posição, entraremos em contato.

Desejamos muito sucesso em sua trajetória profissional.

Atenciosamente, Equipe de Talentos Usabit

---

**Arquivo:** `supabase/functions/send-candidate-vaga-canceled-email/index.ts`

---

## send-candidate-vaga-reopened-email

**Status:** Pendente

**Alteração:**
- Assunto: `Atualização sobre a vaga de {jobTitle}`
- From: `Equipe de Talentos Usabit <noreply@space.pro.br>`
- Texto:

---

Olá, {candidateFirstName}.

Temos uma ótima notícia!

O processo seletivo para a vaga de {jobTitle} foi reativado e gostaríamos de saber se você ainda tem interesse em participar da seleção.

Caso deseje seguir no processo, solicitamos que envie um e-mail para [e-mail RH] no prazo de até 24 horas, utilizando o seguinte formato:
Assunto: RETOMADA PROCESSO SELETIVO – [Nome da Vaga] | Nome Completo | Telefone

Não é necessário incluir nenhuma informação no corpo do e-mail.

O envio dessa mensagem será considerado como sua confirmação de interesse e permitirá a continuidade da sua candidatura nas próximas etapas do processo seletivo.

Ficamos no aguardo do seu retorno.

Atenciosamente, Equipe de Talentos Usabit

---

**Arquivo:** `supabase/functions/send-candidate-vaga-reopened-email/index.ts`

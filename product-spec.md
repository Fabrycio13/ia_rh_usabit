# Product Spec — IA RH (Usabit people)

> Plataforma SaaS de recrutamento e seleção com IA.
> Stack: React 19 + TypeScript 5.9 (strict) + Vite 7 + Tailwind CSS v4 + Supabase

---

## 1. Tipo de Aplicação

Frontend SPA (Single Page Application) com HashRouter. Autenticação via Supabase Auth.
Páginas públicas (landing, vagas, candidatura) e páginas internas (dashboard, admin, gestão).

---

## 2. Páginas Públicas (sem login)

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | LandingPage | Hero, features, CTA para login |
| `/login` | Login | Formulário de login (email + senha) |
| `/registro` | Register | Cadastro de nova conta |
| `/set-password` | SetPassword | Definir senha após convite/cadastro |
| `/v/:hash` | PublicJobPage | Detalhe de vaga pública |
| `/v/:hash/candidatar` | JobApplication | Formulário de candidatura (upload currículo, dados) |
| `/carreiras/:orgId` | OrganizationCareerPage | Portal de carreiras da organização |
| `/carreiras/:orgId/candidatar` | SpontaneousApplication | Candidatura espontânea |

### Fluxo de candidatura pública
1. Usuário acessa `/v/:hash/candidatar`
2. Preenche formulário: nome, email, telefone, cidade, currículo (PDF/DOCX)
3. Upload do currículo → Supabase Storage via signed URL
4. Dados salvos via Edge Function `submit-application`
5. Email de confirmação enviado via `send-application-email`

---

## 3. Páginas Internas (autenticadas)

Todas dentro de `<DashboardLayout />` com sidebar de navegação.

### 3.1 Dashboard (`/dashboard`)
- Métricas: total de vagas, candidatos, análises, taxa de match
- Acesso: RH, Supervisor, Admin, Owner
- Convidado redirecionado para `/vagas`

### 3.2 Vagas (`/vagas`)
- `CareerPortalHub` — listagem de vagas com filtros e busca
- `VagaForm` — criação/edição de vaga (campos: título, descrição, tipo, local, faixa salarial, requisitos)
- `VagaCandidatos` — candidatos por vaga com scores de match

### 3.3 Candidatos (`/candidatos`)
- `CandidateBank` — banco de talentos (pool de candidatos)
- Busca, filtros, tags, ações em lote

### 3.4 Pipeline (`/pipeline`)
- Kanban com colunas: Triagem → Revisão → Entrevista → Proposta → Contratado → Arquivado
- Drag & drop via `@atlaskit/pragmatic-drag-and-drop`
- Reanálise de candidatos, transferência entre vagas

### 3.5 Admin (`/admin`)
- `AdminDashboard` — métricas gerais da organização
- `AdminLogs` — auditoria de atividades (tabela activity_logs, somente leitura)

### 3.6 Configurações (`/configuracoes`)
- Perfil, tema (dark/light), branding do portal de carreiras
- Painéis específicos para Owner

### 3.7 Chat IA (`/chat`)
- Assistente interno com IA (premium, apenas Owner)
- ChatWidget flutuante disponível para todos (exceto Convidado)

---

## 4. Hierarquia de Permissões (RBAC)

```
Owner (5) > Administrador (4) > Supervisor (3) > RH (2) > Convidado (1)
```

| Funcionalidade | owner | admin | supervisor | rh | convidado |
|---------------|-------|-------|------------|----|-----------|
| dashboard | ✔ | ✔ | ✔ | ✔ | ✘ |
| vagas (ver) | ✔ | ✔ | ✔ | ✔ | ✔ |
| vagas (editar) | ✔ | ✔ | ✔ | ✔ | ✘ |
| analises | ✔ | ✔ | ✔ | ✔ | ✘ |
| candidatos | ✔ | ✔ | ✔ | ✔ | ✘ |
| pipeline (ver) | ✔ | ✔ | ✔ | ✔ | ✔ |
| pipeline (editar) | ✔ | ✔ | ✔ | ✔ | ✘ |
| chat IA | ✔ | ✘ | ✘ | ✘ | ✘ |
| chat widget | ✔ | ✔ | ✔ | ✔ | ✘ |
| admin | ✔ | ✔ | ✔ | ✘ | ✘ |
| logs auditoria | ✔ | ✔ | ✔ | ✘ | ✘ |

---

## 5. Funcionalidades Principais para Teste

### 5.1 Autenticação
- Login com email/senha
- Registro de nova conta
- Definição de senha via convite
- Logout
- Proteção de rotas (redirect p/ login se não autenticado)
- Redirecionamento por role (convidado → `/vagas`)

### 5.2 Gestão de Vagas (CRUD)
- Listar vagas com filtros (status, tipo, local)
- Criar vaga (formulário completo)
- Editar vaga
- Visualizar candidatos por vaga
- Compartilhar link público (`/v/:hash`)

### 5.3 Candidatura Pública
- Acessar página pública de vaga
- Preencher formulário de candidatura
- Upload de currículo (PDF/DOCX)
- Validação de campos obrigatórios
- Confirmação de envio

### 5.4 Banco de Candidatos
- Listar candidatos
- Buscar/filtrar
- Visualizar detalhes
- Gerenciar tags

### 5.5 Pipeline (Kanban)
- Visualizar colunas de status
- Arrastar cards entre colunas
- Reanalisar candidato
- Transferir entre vagas

### 5.6 Dashboard
- Visualizar métricas e gráficos
- KPIs de recrutamento

### 5.7 Tema
- Alternar entre Dark e Light
- Persistência da preferência
- Temas secundários (simple, planets, spatial, frequence)

### 5.8 Chat IA
- Abrir/fechar widget flutuante
- Enviar mensagem
- Visualizar resposta da IA

---

## 6. Comportamentos Esperados (Critérios de Aceitação)

### 6.1 Login
- [ ] Campos: email + senha + botão "Entrar"
- [ ] Botão desabilitado enquanto carrega
- [ ] Erro exibido para credenciais inválidas
- [ ] Redireciona ao dashboard após sucesso
- [ ] Se convirado, redireciona para `/vagas`

### 6.2 Cadastro
- [ ] Formulário: nome, email, senha, confirmar senha
- [ ] Validação: senha mínima 6 caracteres
- [ ] Validação: emails iguais
- [ ] Confirmação de email enviada

### 6.3 Listagem de Vagas
- [ ] Tabela com colunas: título, status, tipo, local, candidatos, ações
- [ ] Botão "Nova Vaga"
- [ ] Filtros funcionando
- [ ] Paginação ou scroll infinito

### 6.4 Candidatura Pública
- [ ] Formulário com validação de campos obrigatórios
- [ ] Upload de currículo com progresso
- [ ] Confirmação visível após envio
- [ ] Erro amigável se vaga não existir mais

### 6.5 Pipeline Kanban
- [ ] 6 colunas visíveis
- [ ] Cards com nome, score, vaga
- [ ] Drag & drop move o card
- [ ] Feedback visual ao arrastar

### 6.6 Tema
- [ ] Botão de toggle no canto inferior direito
- [ ] Transição suave (wipe)
- [ ] Tema persiste após refresh
- [ ] Aplicação consistente em todas as páginas

### 6.7 Header e Sidebar
- [ ] Nome do usuário e avatar visíveis
- [ ] Sidebar colapsável
- [ ] Item ativo destacado
- [ ] Links corretos para cada role

---

## 7. Dados de Teste

### Credenciais sugeridas
- Login real via Supabase (depende do projeto configurado)
- Ou usar `supabase.auth.signInWithPassword` com email/senha de teste

### Organizações
- O projeto usa multi-tenancy via `organization_id`
- Cada usuário pertence a uma organização

### Vagas de exemplo
- Criadas via formulário interno (`/vagas/nova`)
- Status: aberta, pausada, fechada
- Tipos: remoto, presencial, híbrido

---

## 8. Notas Técnicas para o Teste

- **Router**: HashRouter (URLs com `#/`), ex: `http://localhost:5173/#/login`
- **Build dev**: `npm run dev` → porta 5173
- **Produção local**: `npm run build && npm run preview` → porta 4173
- **Autenticação**: Supabase Auth com session storage
- **API**: Chamadas Supabase diretas + Edge Functions via `supabase.functions.invoke()`
- **CSS**: Variáveis CSS (`var(--bg-card)`, `var(--text-main)`, etc.) — nunca cores fixas
- **Tema**: Atributo `data-theme` no `<html>`
- **Componentes**: Named exports, sem `export default`

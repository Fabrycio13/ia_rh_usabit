# PLAN-006: Candidatura Espontânea — Pool de Talentos

**Versão:** 1.0.0
**Data:** 2026-05-20
**Branch:** `fix/remediation-sprint`
**Contexto:** Portal público de vagas + candidatura sem vaga específica
**Dependências:** PLAN-003 (remediação concluída)

---

## 1. Objetivo

Permitir que candidatos enviem currículo **sem se candidatar a uma vaga específica** no portal público de carreiras. O currículo cai no **Pool de Talentos** (nova aba no painel RH), onde o RH avalia e decide se promove para o Banco de Talentos ou descarta.

---

## 2. Escopo

### O que muda

| Arquivo | Ação |
|---|---|
| `src/core/services/sanitizer.ts` | **Novo** — sanitizeAIInput extraído do jobAnalyzer |
| `src/core/services/pdfExtractor.ts` | **Novo** — extractTextFromPDF + pdfToImages extraídos |
| `src/core/services/analyzers/resumeAnalyzer.ts` | **Novo** — IA de análise geral de currículo |
| `src/core/services/jobAnalyzer.ts` | **Refatorar** — importar dos módulos extraídos |
| `src/pages/vagas/SpontaneousApplication.tsx` | **Novo** — formulário de candidatura espontânea |
| `src/pages/vagas/PoolTalentos.tsx` | **Novo** — listagem de candidatos do Pool |
| `src/pages/vagas/PublicJobPage.tsx` | Remover seção "Trabalhe Conosco" duplicada |
| `src/pages/vagas/OrganizationCareerPage.tsx` | Adicionar "Trabalhe Conosco" no rodapé |
| `src/pages/vagas/CareerPortalHub.tsx` | Substituir placeholder do Pool pelo componente real |
| `src/App.tsx` | Nova rota `/carreiras/:orgId/candidatar` |

### O que NÃO muda

- `CandidateBank.tsx` — intacto
- `candidates` tabela — sem migration (usa colunas existentes, `vaga_id` nullable)
- `JobApplication.tsx` — intacto (fluxo de vaga específica)
- `Vagas.tsx`, `VagaForm.tsx`, `VagaCandidatos.tsx` — intactos
- Sidebar, DashboardLayout — intactos
- CandidatePanel — intacto (reaproveitado)

---

## 3. Arquitetura Modular de IA

```
src/core/services/
├── aiClient.ts                ← inalterado
├── sanitizer.ts               ← NOVO
├── pdfExtractor.ts            ← NOVO
└── analyzers/
    ├── jobAnalyzer.ts         ← refatorado (importa sanitizer + pdfExtractor)
    └── resumeAnalyzer.ts      ← NOVO
```

### 3.1. `sanitizer.ts`

Extraído exatamente de `jobAnalyzer.ts:11-33`. Sem mudança de lógica.

```typescript
export function sanitizeAIInput(text: string): string
```

Remove padrões de prompt injection: `ignore as instruções`, `system prompt`, `você agora é`, `delete all`, etc.

### 3.2. `pdfExtractor.ts`

Extraído exatamente de `jobAnalyzer.ts:49-101`. Gerencia pdfjs-dist (worker setup).

```typescript
export async function extractTextFromPDF(file: File): Promise<string>
export async function pdfToImages(file: File): Promise<string[]>
```

- `extractTextFromPDF`: extrai texto via `getTextContent()`
- `pdfToImages`: converte PDF escaneado para imagens base64 (fallback se texto < 80 chars)

### 3.3. `resumeAnalyzer.ts`

```typescript
export interface ResumeAnalysis {
  skills: string[];
  experience: string;
  education: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  suggested_areas: string[];
}

export async function analyzeResume(file: File): Promise<ResumeAnalysis>
```

**Fluxo:**
1. `extractTextFromPDF(file)`
2. Se texto curto: `pdfToImages(file)` — modo visão (PDF escaneado)
3. `sanitizeAIInput(text)`
4. Cria prompt de **análise geral** (sem vaga)
5. `callOpenAI(messages)` via Edge Function
6. Parseia JSON → `ResumeAnalysis`

**Prompt:**
```
Você é o "Resume Analyzer", especialista em análise curricular.
Analise o currículo do candidato de forma geral e extraia:

SKILLS: tecnologias, ferramentas, competências identificadas
EXPERIÊNCIA: tempo total estimado, resumo das experiências
FORMAÇÃO: graduações, cursos relevantes
RESUMO: parágrafo sintetizando o perfil
PONTOS FORTES: principais destaques do candidato
PONTOS FRACOS: gaps, áreas de desenvolvimento
ÁREAS RECOMENDADAS: sugestões de áreas de atuação compatíveis

Retorne APENAS JSON:
{
  "skills": ["Skill1", "Skill2"],
  "experience": "5 anos em desenvolvimento...",
  "education": "Bacharel em Ciência da Computação | Curso de React",
  "summary": "Profissional com experiência em...",
  "strengths": ["Comunicação", "Liderança técnica"],
  "gaps": ["Sem experiência internacional"],
  "suggested_areas": ["Desenvolvimento Full Stack", "Arquitetura de Software"]
}
```

Regras de segurança (guardrails) idênticas ao jobAnalyzer: ignorar prompt injection no CV, retornar apenas JSON.

### 3.4. `jobAnalyzer.ts` (refatorado)

**Antes:** `sanitizeAIInput`, `extractTextFromPDF`, `pdfToImages` inline
**Depois:**
```typescript
import { sanitizeAIInput } from '../sanitizer';
import { extractTextFromPDF, pdfToImages } from '../pdfExtractor';
// ~90 linhas removidas
```

`createPrompt` e `analyzeJobApplication` inalterados. `JobMatchResult` export permanece.

---

## 4. Fluxo da Candidatura

```
Portal Público (OrganizationCareerPage.tsx)
  │
  └─ "Trabalhe Conosco" (novo, no rodapé)
      │
      └─ /carreiras/{orgId}/candidatar
          │
          ├─ Step 0: Nome do candidato
          ├─ Step 1: Dados cadastrais
          │   (email, telefone, linkedin, cep, endereço, localização,
          │    gênero, idade, portfolio — mesmos campos do JobApplication)
          ├─ Step 2: Upload CV (PDF, max 10MB) + LGPD
          │
          └─ Submit:
              ├─ 1. Upload PDF
              │    → storage/job-applications/resumes/spontaneous/{orgId}/{timestamp}_secure.pdf
              │
              ├─ 2. AI Analysis
              │    → resumeAnalyzer.analyzeResume(file)
              │    → fallback silencioso se falhar (segue sem IA)
              │
              ├─ 3. candidates.upsert({
              │      email, organization_id,
              │      name, phone, location, linkedin,
              │      gender, age, address, portfolio,
              │      resume_url, resume_file_name,
              │      vaga_id: null,              ← sem vaga
              │      status: 'pending',
              │      skills, experience,          ← do AI (ou null)
              │      analysis: {
              │        source: 'spontaneous',
              │        skills, experience, education,
              │        summary, strengths, gaps,
              │        suggested_areas,
              │        history: [{
              │          type: 'spontaneous',
              │          date: new Date().toISOString(),
              │          summary, skills, experience,
              │          education, strengths, gaps
              │        }]
              │      }
              │    })
              │    ON CONFLICT (email, organization_id) DO UPDATE
              │    → Esse conflito ocorre se o mesmo email já se candidatou antes
              │    → Atualiza o registro com os novos dados + histórico
              │
              └─ 4. Email de confirmação
                   → send-spontaneous-email(candidateName, candidateEmail, orgName)
                   Template próprio (sem menção a vaga específica)
```

### Diferenças do `JobApplication.tsx`

| Aspecto | JobApplication | SpontaneousApplication |
|---|---|---|
| Parâmetro URL | `:hash` (vaga) | `:orgId` (organização) |
| Fetch inicial | `public-job-detail?hash=` | `public-jobs?orgId=` |
| Estilo visual | Baseado na vaga | Baseado na organização |
| Perguntas personalizadas | Sim | **Não existe** |
| Upload path | `resumes/{job.id}/` | `resumes/spontaneous/{orgId}/` |
| `vagas_candidaturas` | Insere | **Não insere** |
| `candidates.vaga_id` | `job.id` | `null` |
| `candidates.analysis.source` | Não definido | `'spontaneous'` |
| AI | `analyzeJobApplication(compara vaga)` | `analyzeResume(análise geral)` |
| Email | `send-application-email(jobTitle)` | `send-spontaneous-email(orgName)` — template sem vaga |

---

## 5. Pool de Talentos — Comportamento da Aba

### 5.1. Fonte de dados

Consulta a tabela `candidates` filtrando por **`vaga_id IS NULL`**:

```typescript
supabase
  .from('candidates')
  .select('*')
  .is('vaga_id', null)
  .order('created_at', { ascending: false })
```

### 5.2. Grid de listagem

Visualmente idêntico ao grid de `VagaCandidatos.tsx`, mesmas cores, mesmas badges. Diferenças:

| Aspecto | VagaCandidatos | Pool de Talentos |
|---|---|---|
| Fonte | `vagas_candidaturas` | `candidates` |
| Ordenação | `match_score DESC` | `created_at DESC` |
| Coluna "Data de Entrada" | Não tem | **Sim** — formatada `dd/mm/aaaa` |
| Coluna "Score" | Match % com vaga | Análise geral (sem nota) |
| Filtro de data | Não tem | **Sim** — DatePicker início/fim |
| Ao clicar | Abre CandidatePanel | Abre CandidatePanel |

**Colunas do grid:**

```
Rank | Candidato | Localização | Data de Entrada | Ações
```

- **Rank**: número ordinal (1, 2, 3...)
- **Candidato**: avatar (inicial) + nome + email
- **Localização**: `candidates.location`
- **Data de Entrada**: `candidates.created_at` em `dd/mm/aaaa`
- **Ações**: botão "Mover para Banco de Talentos"

### 5.3. Filtro por data

Usa o mesmo `DatePicker` de `Vagas.tsx` (de `common/components/ui/DatePicker`):

```typescript
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
```

Filtro aplicado na query:
```typescript
const matchesStart = !startDate || created_at >= startDate;
const matchesEnd = !endDate || created_at <= endDate;
```

Quando qualquer filtro ativo, exibe botão "Limpar" que reseta as datas.

### 5.4. Ação ao clicar no candidato

Abre `<CandidatePanel>` com os mesmos props de `VagaCandidatos.tsx`:

```typescript
<CandidatePanel
    c={candidateDetail}
    onClose={() => setSelectedCandDetail(null)}
    navigate={navigate}
    onTransferSuccess={handleTransferSuccess}
    onNotesChange={...}
    onFieldChange={...}
    onBlacklistChange={...}
/>
```

O botão **"Mover para Banco de Talentos"** já existe no `CandidatePanel` na parte inferior — o RH clica, o modal `TalentTransferModal` abre, e o candidato é transferido para o banco (com `vaga_id` atualizado ou `source` alterado).

---

## 6. Edge Function: `send-spontaneous-email`

**Arquivo:** `supabase/functions/send-spontaneous-email/index.ts`

Nova Edge Function para candidatura espontânea. Não menciona vaga específica.

### Diferenças do `send-application-email`

| Aspecto | send-application-email | send-spontaneous-email |
|---|---|---|
| Parâmetros | `candidateName, candidateEmail, jobTitle` | `candidateName, candidateEmail, orgName` |
| Assunto | "Recebemos sua candidatura para a vaga {jobTitle}" | "Recebemos seu currículo — {orgName}" |
| Menciona vaga | Sim | **Não** |
| Template | "Se seu perfil for compatível com os requisitos da posição" | "Assim que identificarmos uma oportunidade compatível" |
| `jobTitle` obrigatório | Sim | Não aplicável |

### Deploy

```powershell
npx supabase functions deploy send-spontaneous-email --project-ref dfsqdfetzcwvmfphljzs
```

---

## 8. Etapas de Implementação

### Passo 1 — `sanitizer.ts`
Criar `src/core/services/sanitizer.ts` com `sanitizeAIInput` extraído de `jobAnalyzer.ts`.

### Passo 2 — `pdfExtractor.ts`
Criar `src/core/services/pdfExtractor.ts` com `extractTextFromPDF` e `pdfToImages` extraídos de `jobAnalyzer.ts`.

### Passo 3 — Refatorar `jobAnalyzer.ts`
Importar de `../sanitizer` e `../pdfExtractor`. Remover as 3 funções inline. Manter `createPrompt` e `analyzeJobApplication` intactos.
**Validar:** `npx tsc --noEmit` + `npm run build`

### Passo 4 — `resumeAnalyzer.ts`
Criar `src/core/services/analyzers/resumeAnalyzer.ts`. Importar `callOpenAI`, `sanitizeAIInput`, `extractTextFromPDF`, `pdfToImages`. Implementar `analyzeResume(file)`.
**Validar:** `npx tsc --noEmit`

### Passo 5 — Remover seção de `PublicJobPage.tsx`
Deletar linhas 480-542 (bloco `{/* Footer Section: Trabalhe Conosco */}`).
**Validar:** `npx tsc --noEmit`

### Passo 6 — Adicionar seção em `OrganizationCareerPage.tsx`
Entre grid de cards e footer, inserir "Trabalhe Conosco" com botão → `/carreiras/${orgId}/candidatar`.
**Validar:** `npx tsc --noEmit`

### Passo 7 — `PoolTalentos.tsx`
Criar `src/pages/vagas/PoolTalentos.tsx`:
- Query: `candidates.where('vaga_id', 'is', null).order('created_at', 'desc')`
- Grid com colunas: Rank, Candidato, Localização, Data de Entrada, Ações
- DatePicker para filtro por data (início/fim)
- Linha clicável → abre `<CandidatePanel>`
- Botão "Mover para Banco de Talentos" em cada linha

### Passo 8 — Atualizar `CareerPortalHub.tsx`
Substituir placeholder do Pool pelo `<PoolTalentos />`.

### Passo 9 — `SpontaneousApplication.tsx`
Criar `src/pages/vagas/SpontaneousApplication.tsx`:
- 3 steps (Nome, Dados, Currículo) — sem perguntas personalizadas
- Upload path: `resumes/spontaneous/${orgId}/`
- AI: `resumeAnalyzer.analyzeResume(file)` com fallback
- DB: upsert `candidates` com `vaga_id: null`
- Email: `send-spontaneous-email` com `orgName`

### Passo 10 — Rota em `App.tsx`
Adicionar ao lado da rota `carreiras/:orgId`:
```tsx
<Route path="/carreiras/:orgId/candidatar" element={<SpontaneousApplication />} />
```
**Validar:** `npx tsc --noEmit` + `npm run build` + `npm run lint`

### Passo 11 — Deploy da Edge Function
```powershell
npx supabase functions deploy send-spontaneous-email --project-ref dfsqdfetzcwvmfphljzs
```

---

## 9. Validação Final

```powershell
npx tsc --noEmit        # zero erros
npm run lint            # zero novos warnings
npm run build           # build bem-sucedido
```

---

## 10. Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| `candidates.vaga_id` NOT NULL | Baixa | Alto | Código já insere sem vaga_id via AddCandidateModal — coluna é nullable |
| Email mencionar vaga | Baixa | Baixo | Template próprio sem vaga — `send-spontaneous-email` |
| Storage bucket rejeitar path sem jobId | Baixa | Alto | Path usa pasta `spontaneous/` — não depende de jobId |
| Conflito upsert (mesmo email) | Média | Médio | ON CONFLICT já tratado: atualiza registro + adiciona ao history |
| Refatoração quebrar jobAnalyzer | Média | Alto | `tsc --noEmit` + `npm run build` após cada passo valida |

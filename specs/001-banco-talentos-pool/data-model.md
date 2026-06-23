# Data Model: Adicionar Candidato via Pool de Talentos

## Entidades

### candidates (existente — sem alterações estruturais)

A tabela `candidates` não sofre alterações de schema. O novo fluxo apenas insere registros com um novo valor no campo `analysis->>source`.

**Campos relevantes:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID PK | Gerado automaticamente |
| `name` | TEXT | Nome do candidato (obrigatório) |
| `email` | TEXT | Email (opcional, mas recomendado) |
| `phone` | TEXT | Telefone |
| `location` | TEXT | Localização |
| `address` | TEXT | Endereço completo |
| `age` | INTEGER | Idade |
| `gender` | TEXT | Gênero |
| `linkedin` | TEXT | URL do LinkedIn |
| `portfolio` | TEXT | URL do Portfólio |
| `skills` | TEXT | Habilidades (string separada por vírgula) |
| `experience` | TEXT | Experiência profissional |
| `education` | TEXT | Formação acadêmica |
| `notes` | TEXT | Anotações internas |
| `resume_url` | TEXT | URL do PDF no storage |
| `resume_file_name` | TEXT | Nome original do arquivo |
| `status` | TEXT | Status: `pending`, `reviewed`, `shortlisted`, `rejected`, `hired`, `talent_bank` |
| `source` | TEXT | Origem: `spontaneous`, `pdf`, `excel`, `talent_bank`, `public_link` |
| `analysis` | JSONB | Análise completa de IA (ver estrutura abaixo) |
| `score` | INTEGER | Pontuação geral (0-100) |
| `interview_eligible` | BOOLEAN | Elegível para entrevista |
| `is_blacklisted` | BOOLEAN | Blacklist |
| `organization_id` | UUID FK → organizations(id) | Organização |
| `user_id` | UUID FK → auth.users(id) | Usuário que cadastrou |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

### Estrutura do campo `analysis` (JSONB) para `manual_add`

```json
{
  "source": "manual_add",
  "score": 85,
  "classification": "Pleno",
  "skills": ["React", "TypeScript", "Node.js", "PostgreSQL"],
  "experience": "5 anos como desenvolvedor full-stack...",
  "education": "Ciência da Computação - USP",
  "summary": "Profissional com sólida experiência em desenvolvimento web...",
  "strengths": ["React avançado", "TypeScript", "Arquitetura de sistemas"],
  "gaps": ["Falta experiência em liderança", "Sem experiência com Docker"],
  "suggested_areas": ["Frontend", "Full Stack", "Sistemas Web"],
  "history": [
    {
      "type": "manual_add",
      "date": "2026-05-29T10:30:00.000Z",
      "summary": "Profissional com sólida experiência em desenvolvimento web...",
      "skills": ["React", "TypeScript", "Node.js", "PostgreSQL"],
      "experience": "5 anos como desenvolvedor full-stack...",
      "education": "Ciência da Computação - USP",
      "strengths": ["React avançado", "TypeScript"],
      "gaps": ["Falta experiência em liderança"]
    }
  ]
}
```

### CandidateExtraction (type — atualização)

```typescript
// ANTES:
interface CandidateExtraction {
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  age: string | null;
  gender: string | null;
  skills: string[];
  experience: string;
  education: string;
}

// DEPOIS (adição de linkedin e portfolio):
interface CandidateExtraction {
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  age: string | null;
  gender: string | null;
  linkedin: string | null;    // ← NOVO
  portfolio: string | null;   // ← NOVO
  skills: string[];
  experience: string;
  education: string;
}
```

### ResumeAnalysis (existente — sem alterações)

```typescript
interface ResumeAnalysis extends AIAnalysisBase {
  suggested_areas: string[];
}

interface AIAnalysisBase {
  score: number;
  classification: string;
  skills: string[];
  experience: string;
  education: string;
  summary: string;
  strengths: string[];
  gaps: string[];
}
```

## Validações

| Campo | Regra |
|-------|-------|
| `name` | Obrigatório |
| `email` | Opcional, mas se preenchido: formato email válido |
| `resume_file` | Obrigatório, apenas .pdf, máx 10MB |
| `organization_id` | Obrigatório (do perfil do usuário) |

## State Transitions

O candidato segue o fluxo padrão do Pool de Talentos (já existente):

```
manual_add (inserção)
    │
    ▼
pending (Pool de Talentos)
    │
    ├── Analisar com Vaga → reviewed (VagaCandidatos)
    │       │
    │       ├── shortlisted
    │       ├── rejected
    │       └── hired
    │
    └── Mover para Banco → talent_bank (CandidateBank)
```

## Relacionamentos

- `candidates.organization_id` → `organizations.id` (já existente)
- `candidates.user_id` → `auth.users.id` (já existente)
- Nenhum novo relacionamento é criado

# Research: Adicionar Candidato via Pool de Talentos

## Decisões de Design

### D01: Novo componente vs refatorar AddCandidateModal

**Decision**: Criar novo componente `PoolAddCandidate.tsx`

**Rationale**: O `AddCandidateModal.tsx` (1228 linhas) suporta múltiplos formatos (PDF, Word, Excel) e fluxo de salvamento direto. Modificá-lo para suportar o novo fluxo de 3 etapas (upload → extração → análise → confirmação) adicionaria complexidade condicional excessiva e risco de quebrar o fluxo existente. Um novo componente é mais limpo, testável isoladamente, e o componente antigo permanece intacto (apenas perde o ponto de entrada no CandidateBank).

**Alternatives considered**:
- Adicionar prop `mode: 'bank' | 'pool'` ao AddCandidateModal — rejeitado por complexidade e risco de regressão
- Inline no PoolTalentos — rejeitado por violar separação de responsabilidades

### D02: Etapas separadas (extração → análise) vs única

**Decision**: Duas etapas separadas

**Rationale**: O HR precisa revisar os dados extraídos ANTES de disparar a análise completa. Isso permite corrigir campos incorretos (ex: nome mal interpretado, email errado) e garante que a análise seja feita sobre dados corretos. Além disso, as duas chamadas de IA têm propósitos diferentes:
- `extractCandidateData` → extração de campos literais (nome, email, telefone)
- `analyzeResume` → análise semântica (score, skills, summary, gaps)

**Alternatives considered**:
- Chamada única com ambos resultados — rejeitado porque o prompt para extração de campos literais é diferente do prompt para análise semântica

### D03: Bucket de storage

**Decision**: Usar bucket `job-applications` com path `resumes/manual/{orgId}/{timestamp}_{uuid}.pdf`

**Rationale**: O bucket `job-applications` já é usado pelo fluxo espontâneo (`resumes/spontaneous/...`) e tem RLS/configurações adequadas. O path `manual/` separa claramente os uploads manuais dos espontâneos. O bucket `resumes` usado pelo AddCandidateModal atual não tem organização por organização.

**Alternatives considered**:
- Bucket `resumes` — rejeitado por falta de organização por orgId
- Bucket novo — rejeitado por complexidade desnecessária de configuração

### D04: Insert direto vs Edge Function

**Decision**: Insert direto via `supabase.from('candidates').insert()`

**Rationale**: O HR está autenticado no sistema, e as RLS policies protegem a tabela `candidates`. O fluxo espontâneo usa Edge Function (`submit-candidate`) porque é um formulário público sem autenticação. Para usuário autenticado, insert direto é mais simples, mais rápido e segue o mesmo padrão do `AddCandidateModal` atual.

**Alternatives considered**:
- Reutilizar `submit-candidate` Edge Function — rejeitado porque a função usa service_role (bypass RLS) e faz upsert por email, o que não é o comportamento desejado para adição manual

### D05: Source field

**Decision**: `analysis.source = 'manual_add'` no JSONB

**Rationale**: O PoolTalentos filtra por `analysis->>source`. Usar `'manual_add'` (em vez de `'spontaneous'`) permite distinguir a origem do candidato e, futuramente, criar filtros ou métricas específicas. O filtro do Pool será atualizado para `or('spontaneous','manual_add')`.

**Alternatives considered**:
- Reutilizar `'spontaneous'` — rejeitado porque perderia a rastreabilidade da origem
- Novo campo `candidates.source` top-level — rejeitado porque o Pool já filtra por `analysis->>source`

### D06: PDF imagem (scanner)

**Decision**: Reuso de `pdfToImages()` + Vision API (já implementado em `analyzeResume`)

**Rationale**: O `resumeAnalyzer.ts` já trata PDFs imagem: se `extractTextFromPDF` retornar < 80 chars, converte páginas para imagens e usa Vision API da OpenAI. A `extractCandidateData` em `cvAnalyzer.ts` também aceita `images[]` como parâmetro opcional. No novo fluxo, na etapa de extração, faremos a mesma verificação e passaremos `images[]` quando necessário.

**Alternatives considered**:
- Tesseract.js OCR — rejeitado porque a Vision API já está implementada e é mais precisa
- Fallback para erro — rejeitado porque PDF imagem é caso de uso real (currículos escaneados)

## Dependências e Integrações

| Dependência | Uso | Já existe? |
|-------------|-----|------------|
| `extractCandidateData` | Extração de dados do PDF | Sim (`cvAnalyzer.ts:17`) |
| `analyzeResume` | Análise completa do currículo | Sim (`resumeAnalyzer.ts:10`) |
| `extractTextFromPDF` | Extração de texto de PDF | Sim (`pdfExtractor.ts:43`) |
| `pdfToImages` | Conversão de PDF para imagens | Sim (`pdfExtractor.ts:10`) |
| `supabase.storage` | Upload de arquivos | Sim |
| `CandidateExtraction` | Tipo para dados extraídos | Sim (precisa de extensão) |
| `ResumeAnalysis` | Tipo para análise completa | Sim |
| `buildExtractionMessages` | Prompt para extração | Sim (precisa de atualização) |
| `normalizeExtraction` | Validador de extração | Sim (precisa de atualização) |

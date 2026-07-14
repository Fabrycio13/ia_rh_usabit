# Spec: Adicionar Candidato via Pool de Talentos

## Contexto

Atualmente o botão "Adicionar" está no **Banco de Talentos** (`/candidatos`) e insere candidatos diretamente na tabela `candidates` sem passar por análise de IA, sem definir `source` no campo `analysis`. Isso faz com que candidatos adicionados manualmente não apareçam no **Pool de Talentos** e não passem pelo fluxo de revisão/análise que os candidatos de candidatura espontânea (Trabalhe Conosco) passam.

O objetivo é mover o "Adicionar" do Banco de Talentos para o Pool de Talentos, criando um fluxo onde o RH faz upload de PDF, a IA extrai dados + analisa o currículo, e o candidato entra no Pool seguindo o fluxo padrão (revisão → analisar com vaga → mover para vaga/banco).

## Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| RN-01 | Todo candidato novo deve passar pelo Pool de Talentos antes de ir para o Banco |
| RN-02 | O upload deve ser apenas PDF (normal ou imagem) |
| RN-03 | A extração de dados (nome, email, telefone, etc.) é feita por IA e auto-preenche o formulário |
| RN-04 | O HR pode editar/corrigir os campos extraídos antes de prosseguir |
| RN-05 | Após confirmação dos dados, o sistema dispara análise completa de IA (score, skills, etc.) |
| RN-06 | O candidato é salvo em `candidates` com `analysis.source = 'manual_add'` |
| RN-07 | O candidato aparece no Pool de Talentos e segue o fluxo padrão existente |
| RN-08 | O botão "Adicionar" é removido do Banco de Talentos |
| RN-09 | LinkedIn e Portfólio devem ser extraídos pela IA quando disponíveis no PDF |
| RN-10 | PDFs imagem (scanners) devem ser processados via Vision API (já implementado em `analyzeResume`) |

## User Stories

### US1 (P1): Remover "Adicionar" do Banco de Talentos
**Como** RH/Gestor
**Quero** não ter mais o botão "Adicionar" no Banco de Talentos
**Para** que todo candidato novo passe pelo fluxo de análise no Pool de Talentos

**Critérios de Aceitação:**
- CA-01: Botão "Adicionar" removido do cabeçalho do CandidateBank (~L398-403)
- CA-02: Estado `showAddModal` removido do componente
- CA-03: Import e uso de `AddCandidateModal` removidos
- CA-04: Nenhum outro código do CandidateBank é alterado
- CA-05: `AddCandidateModal.tsx` não é excluído (pode ser reutilizado futuramente)

### US2 (P1): Criar fluxo "Adicionar" no Pool de Talentos
**Como** RH/Gestor
**Quero** um botão "Adicionar" no Pool de Talentos que abre um modal de upload de PDF
**Para** adicionar currículos de candidatos manualmente

**Critérios de Aceitação:**
- CA-06: Botão "Adicionar" visível no cabeçalho do PoolTalentos (apenas para não-convidados)
- CA-07: Modal aceita apenas PDF (valida extensão e tamanho máx 10MB)
- CA-08: Upload do PDF para `supabase.storage.from('job-applications')` em `resumes/manual/{orgId}/{timestamp}_{uuid}.pdf`
- CA-09: Extração de texto via `pdfjs-dist`
- CA-10: Se texto extraído < 80 caracteres, converte páginas para imagens via `pdfToImages()`
- CA-11: Chama `extractCandidateData(text, images?)` para extrair dados
- CA-12: Formulário é auto-preenchido com: nome, email, telefone, localização, idade, gênero, LinkedIn, portfólio, skills, experiência, educação
- CA-13: Campos não encontrados pela IA ficam em branco (editáveis)
- CA-14: HR pode editar todos os campos antes de prosseguir

### US3 (P1): Análise completa de IA + salvar no banco
**Como** RH/Gestor
**Quero** clicar em "Analisar Currículo" após revisar os dados extraídos
**Para** que o sistema faça a análise completa do currículo (score, skills, summary) e salve o candidato no Pool

**Critérios de Aceitação:**
- CA-15: Botão "Analisar Currículo" dispara `analyzeResume(resumeFile)`
- CA-16: Análise completa retorna `ResumeAnalysis` (score, classification, skills[], summary, strengths[], gaps[], suggested_areas[])
- CA-17: Resumo da análise é exibido para o HR (score, classificação, pontos fortes, gaps)
- CA-18: HR clica "Confirmar e Adicionar ao Pool" para salvar
- CA-19: Payload completo é construído com `analysis.source = 'manual_add'`
- CA-20: Insert direto em `candidates` via `supabase.from('candidates').insert()`
- CA-21: Estrutura do `analysis` JSONB segue o mesmo formato do fluxo espontâneo
- CA-22: Toast de sucesso exibido, modal fechado, Pool recarregado
- CA-23: Tratamento de erro para: PDF corrompido, falha de extração, falha de análise, duplicidade

### US4 (P2): Atualizar filtro do Pool de Talentos
**Como** Sistema
**Quero** que o Pool de Talentos mostre também candidatos com `analysis->>source = 'manual_add'`
**Para** que candidatos adicionados pelo novo fluxo apareçam na listagem

**Critérios de Aceitação:**
- CA-24: Filtro em `PoolTalentos.tsx:94` muda de `eq('spontaneous')` para `or('spontaneous','manual_add')`
- CA-25: Nenhum outro filtro ou query é alterado
- CA-26: Candidatos `manual_add` aparecem com status/distinção visual correta

### US5 (P2): Adicionar linkedin e portfolio ao CandidateExtraction
**Como** Sistema
**Quero** que a IA extraia também LinkedIn e Portfólio do currículo
**Para** que o HR não precise preencher manualmente

**Critérios de Aceitação:**
- CA-27: `CandidateExtraction` em `ai/types/index.ts` ganha campos `linkedin: string | null` e `portfolio: string | null`
- CA-28: Prompt de extração em `ai/prompts/extraction.ts` é atualizado para solicitar linkedin e portfolio
- CA-29: `normalizeExtraction` em `ai/parsers/validators.ts` é atualizado para os novos campos
- CA-30: Compatibilidade retroativa mantida (campos opcionais)

## Restrições Técnicas

- TypeScript strict mode
- ESLint com `max-warnings 0`
- Não quebrar código existente fora do escopo
- Reutilizar funções existentes (`extractCandidateData`, `analyzeResume`, `extractTextFromPDF`, `pdfToImages`)
- Não modificar `SpontaneousApplication.tsx`, `CandidatePanel.tsx`, `TalentTransferModal.tsx`, `Pipeline.tsx`
- `AddCandidateModal.tsx` não é excluído, apenas perde o ponto de entrada

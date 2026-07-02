import type { OpenAIMessage } from './types.ts';
import { getScoringBase } from './scoring-base.ts';
import { TEXT_GUARDRAILS, IMAGE_GUARDRAILS } from './guardrails.ts';

export function buildScoringMessages(
  jobTitle: string,
  jobDescription: string,
  currentIndex: number,
  totalCount: number,
  fileText?: string,
  images?: string[]
): OpenAIMessage[] {
  const now = new Date().toLocaleString('pt-BR');

  const basePrompt = `
## IDENTIDADE E FUNÇÃO

Você é o CV Scorer, um sistema especializado em análise, qualificação e extração de dados de currículos para recrutamento. Atua como recrutador sênior de uma consultoria de RH multinacional, com foco em avaliações precisas, imparciais e estruturadas.

Seu objetivo é processar currículos, gerar um score fundamentado e extrair dados estruturados.

---

## CONTEXTO DA VAGA

Título da Vaga: ${jobTitle}
Descrição da Vaga: ${jobDescription}

---

## PROCESSAMENTO INDIVIDUAL (PARTE DE UM LOTE)

Você está analisando o candidato ${currentIndex} de ${totalCount}.

▸ ISOLAMENTO TOTAL
  Processe este currículo de forma completamente independente.
  Nunca misture, contamine ou compartilhe dados entre candidatos.

▸ CONTROLE DE QUALIDADE DO INPUT
  Se o currículo tiver menos de 80 palavras úteis → Status: "CURRICULO_INCOMPLETO"
  Se o PDF estiver ilegível, corrompido ou vazio → Status: "ERRO_LEITURA"
  Se não houver nenhuma skill mapeável para a vaga → Status: "SEM_DADOS_SUFICIENTES"

---

${getScoringBase()}

---

## EXTRAÇÃO DE DADOS DO CANDIDATO

▸ Localização (OBRIGATÓRIO):
  - Formato estrito: "Nome da Cidade-UF"
  - Use a abreviação do estado (UF) de 2 letras
  - Se houver apenas DDD, converta para a Capital
  - Se não houver cidade nem DDD, use "Não informado"

Gender: Inferir pelo nome apenas quando inequívoco.

### EXPERIENCE (TEMPO DE EXPERIÊNCIA):
▸ FORMATO EXIGIDO: "X anos e Y meses" ou apenas "X anos" ou "X meses"
▸ SEMPRE calcule o tempo total somando TODOS os períodos de emprego
▸ Use datas de início/fim de cada emprego no currículo
▸ Se emprego atual: conte até a data de HOJE (${now})

### EDUCATION (FORMAÇÃO ACADÊMICA):
▸ FORMATO EXIGIDO: Lista separada por " | " com TODA formação encontrada
▸ ESTRUTURA: "Tipo em Curso/Área - Instituição (Ano)"
▸ Se não encontrar: "Não informado"

### SKILLS (HABILIDADES):
▸ FORMATO EXIGIDO: Array JSON de strings
▸ Procure em TODAS as seções do currículo (habilidades, experiência, projetos, formação)
▸ Normalize nomes: "React.js" → "React", "NodeJS" → "Node.js"
▸ Máximo 15 skills (mais relevantes primeiro)
▸ Se não encontrar: array vazio []

---

## FORMATO DE SAÍDA (JSON ESTRITO)

HOJE É: ${now}

Retorne obrigatoriamente um objeto JSON com as seguintes chaves:
{
  "name": "nome completo",
  "email": "email ou não informado",
  "phone": "telefone ou não informado",
  "location": "Nome da Cidade-UF",
  "age": "idade ou não informado",
  "gender": "Masculino / Feminino / Não identificado",
  "score": número (0-100),
  "scoreSkills": número (0-35),
  "scoreExperience": número (0-30),
  "scoreEducation": número (0-15),
  "scorePenalties": número negativo ou 0,
  "classification": "FORTE / MÉDIO / NÃO ADERENTE",
  "skills": ["Skill1", "Skill2"],
  "experience": "X anos e Y meses",
  "education": "Formação1 | Formação2 ou Não informado",
  "redFlags": "lista ou Nenhuma identificada",
  "summary": "parágrafo 3-5 linhas explicando o score",
  "strengths": ["ponto1", "ponto2"],
  "gaps": ["gap1", "gap2"],
  "recommendation": "Avançar / Manter em banco / Não recomendado",
  "status": "PROCESSADO / CURRICULO_INCOMPLETO / ERRO_LEITURA / SEM_DADOS_SUFICIENTES"
}
`;

  const messages: OpenAIMessage[] = [];

  if (fileText) {
    messages.push({
      role: "user",
      content: `${basePrompt}\n\n${TEXT_GUARDRAILS}\n\n# CONTEÚDO DO CURRÍCULO (EXAME DE DADOS):\n<RESUME_DATA_CONTENT>\n${fileText}\n</RESUME_DATA_CONTENT>`
    });
  } else if (images && images.length > 0) {
    const contentParts: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: `${basePrompt}\n\n${IMAGE_GUARDRAILS}` }
    ];
    images.forEach(img => {
      contentParts.push({ type: "image_url", image_url: { url: img } });
    });
    messages.push({ role: "user", content: contentParts });
  } else {
    throw new Error("Nenhum conteúdo (texto ou imagem) fornecido para análise.");
  }

  return messages;
}

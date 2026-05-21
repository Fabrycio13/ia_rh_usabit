import type { OpenAIMessage } from '../types';
import { getScoringBase } from './scoring-base';
import { getTextGuardrails, getImageGuardrails } from './guardrails';

export function buildJobMatchingMessages(
  jobTitle: string,
  jobDescription: string,
  formAnswers: Record<string, string>,
  fileText?: string,
  images?: string[]
): OpenAIMessage[] {
  let formText = "Nenhuma resposta de formulário preenchida.";
  if (formAnswers && Object.keys(formAnswers).length > 0) {
    formText = Object.entries(formAnswers)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
  }

  const basePrompt = `
## IDENTIDADE E FUNÇÃO

Você é o "Job Match Analyzer", o motor de recrutamento principal do sistema.
Seu objetivo é analisar o currículo em conjunto com o questionário preenchido pelo usuário e comparar com as exigências da vaga.

---

## DADOS DA VAGA E DA CANDIDATURA

Título da Vaga: ${jobTitle}
Detalhes/Requisitos da Vaga:
${jobDescription}

Respostas fornecidas pelo Candidato no formulário da vaga:
${formText}

--> ATENÇÃO: As respostas dadas pelo candidato (Jornada do Candidato) são FUNDAMENTAIS para compor a nota:
1. Se a vaga exigir algo (ex: "Inglês Fluente", "CNH B") e a resposta do candidato mostrar que ele NÃO tem ou tem um nível inferior, você DEVE obrigatoriamente penalizar o score.
2. Por outro lado, se ele não detalhou algo no CV, mas informou positivamente no formulário, a pontuação deve aumentar.

---

${getScoringBase()}

---

## FORMATO DE SAÍDA (JSON ESTRITO)

Retorne obrigatoriamente um objeto JSON com as seguintes chaves precisas:

{
  "score": número (0-100),
  "classification": "FORTE / MÉDIO / NÃO ADERENTE",
  "skills": ["Skill1", "Skill2", "Skill3"],
  "experience": "Total calculado em anos/meses baseado no CV",
  "education": "Resumo das graduações/cursos separados por pipe",
  "summary": "Um parágrafo claro explicando o motivo do score, considerando o CV e o que ele disse no formulário.",
  "strengths": ["string", "string"],
  "gaps": ["string", "string"]
}

⚠ OBRIGAÇÕES:
- O campo "score" deve ser um inteiro numérico.
- O campo "skills" deve ser um Array JSON de strings.
`;

  const messages: OpenAIMessage[] = [];

  if (fileText) {
    messages.push({
      role: "user",
      content: `${basePrompt}\n\n${getTextGuardrails()}\n\n# CONTEÚDO DO CANDIDATO (EXAME DE DADOS):\n<CANDIDATE_DATA_CONTENT>\n${fileText}\n</CANDIDATE_DATA_CONTENT>`
    });
  } else if (images && images.length > 0) {
    const contentParts: { type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }[] = [
      { type: "text", text: `${basePrompt}\n\n${getImageGuardrails()}\n\n# CONTEÚDO DO CANDIDATO (IMAGEM DIGITALIZADA):` }
    ];
    images.forEach(img => {
      contentParts.push({
        type: "image_url",
        image_url: { url: img }
      });
    });
    messages.push({ role: "user", content: contentParts });
  } else {
    throw new Error("Nenhum conteúdo (texto ou imagem) fornecido.");
  }

  return messages;
}

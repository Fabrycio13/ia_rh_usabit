import type { OpenAIMessage } from './types.ts';
import { getScoringBase } from './scoring-base.ts';
import { TEXT_GUARDRAILS, IMAGE_GUARDRAILS } from './guardrails.ts';

export function buildResumeMessages(
  fileText?: string,
  images?: string[]
): OpenAIMessage[] {
  const basePrompt = `
## IDENTIDADE E FUNÇÃO

Você é o "Resume Analyzer", especialista em análise curricular.
Analise o currículo do candidato de forma geral e extraia:

SKILLS: tecnologias, ferramentas, competências identificadas
EXPERIÊNCIA: tempo total estimado, resumo das experiências
FORMAÇÃO: graduações, cursos relevantes
RESUMO: parágrafo sintetizando o perfil
PONTOS FORTES: principais destaques do candidato
PONTOS FRACOS: gaps, pontos de melhoria RELEVANTES à área de atuação do candidato (ex: para um designer, "conhecimento básico de programação" NÃO é um ponto fraco se não for relevante à área dele)
ÁREAS RECOMENDADAS: sugestões de áreas de atuação compatíveis
SCORE (0-100): nota geral do perfil baseada na solidez da experiência, formação, habilidades e aderência à área de atuação do candidato

${getScoringBase()}

Retorne APENAS JSON:
{
  "score": 85,
  "classification": "FORTE / MÉDIO / NÃO ADERENTE",
  "skills": ["Skill1", "Skill2"],
  "experience": "5 anos em desenvolvimento...",
  "education": "Bacharel em Ciência da Computação | Curso de React",
  "summary": "Profissional com experiência em...",
  "strengths": ["Comunicação", "Liderança técnica"],
  "gaps": ["Sem experiência internacional"],
  "suggested_areas": ["Desenvolvimento Full Stack", "Arquitetura de Software"]
}
`;

  const messages: OpenAIMessage[] = [];

  if (fileText) {
    messages.push({
      role: "user",
      content: `${basePrompt}\n\n${TEXT_GUARDRAILS}\n\n# CONTEÚDO DO CANDIDATO (EXAME DE DADOS):\n<CANDIDATE_DATA_CONTENT>\n${fileText}\n</CANDIDATE_DATA_CONTENT>`
    });
  } else if (images && images.length > 0) {
    const contentParts: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: `${basePrompt}\n\n${IMAGE_GUARDRAILS}\n\n# CONTEÚDO DO CANDIDATO (IMAGEM DIGITALIZADA):` }
    ];
    images.forEach(img => {
      contentParts.push({ type: "image_url", image_url: { url: img } });
    });
    contentParts.push({ type: "text", text: "\n</CANDIDATE_DATA_CONTENT>" });
    messages.push({ role: "user", content: contentParts });
  } else {
    throw new Error("Nenhum conteúdo (texto ou imagem) fornecido.");
  }

  return messages;
}

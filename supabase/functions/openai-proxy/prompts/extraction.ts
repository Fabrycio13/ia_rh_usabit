import type { OpenAIMessage } from './types.ts';
import { TEXT_GUARDRAILS } from './guardrails.ts';

export function buildExtractionMessages(
  fileText?: string,
  images?: string[]
): OpenAIMessage[] {
  const now = new Date().toLocaleString('pt-BR');

  const prompt = `
## IDENTIDADE E FUNÇÃO

Você é um sistema especializado em extração de dados de currículos para recrutamento.
Seu ÚNICO objetivo é extrair informações do currículo e retornar em JSON estruturado.
NÃO faça scoring, análise ou avaliação do candidato.

---

${TEXT_GUARDRAILS}

---

## INSTRUÇÕES DE EXTRAÇÃO

### NAME (NOME):
- Extraia o nome completo do candidato
- Se não encontrar: retorne "Não identificado"

### EMAIL:
- Extraia o e-mail
- Se não encontrar: retorne null

### PHONE (TELEFONE):
- Extraia telefone/WhatsApp/celular
- Normalize para formato: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
- Se não encontrar: retorne null

### LOCATION (LOCALIZAÇÃO):
- Formato: "Cidade-UF" (Ex: Rio de Janeiro-RJ, São Paulo-SP)
- Use cidade + estado do currículo
- Se só tiver estado: "Cidade Não Informada-UF"
- Se não encontrar: retorne null

### AGE (IDADE):
📍 COMO ENCONTRAR (EM ORDEM DE PRIORIDADE):

1️⃣ PROCURE EXPLICITAMENTE:
   - "Idade: XX anos"
   - "XX anos" (perto do nome ou dados pessoais)
   - "Data de Nascimento: DD/MM/AAAA" ou "Nascimento: DD/MM/AAAA"
   - "Nascido em DD/MM/AAAA"

2️⃣ SE ENCONTRAR DATA DE NASCIMENTO:
   - HOJE É: ${now}
   - Calcule: ano_atual - ano_nascimento
   - Exemplo: Nasceu em 1990, hoje é ${now} → idade calculada
   - Retorne APENAS o número: "36"

3️⃣ SE ENCONTRAR IDADE DIRETA:
   - Extraia o número: "28 anos" → "28"
   - Retorne APENAS o número como string

4️⃣ SE NÃO ENCONTRAR NENHUM:
   - Retorne: null (NÃO CHUTE!)

### GENDER (GÊNERO):
- Inferir pelo nome quando inequívoco
- Opções: "Masculino", "Feminino", "Não identificado"

### LINKEDIN:
- Extraia a URL completa do perfil do LinkedIn
- Formato: https://linkedin.com/in/... ou similar
- Se não encontrar: retorne null

### PORTFOLIO:
- Extraia a URL do portfólio, site pessoal ou GitHub
- Se não encontrar: retorne null

### SKILLS (HABILIDADES) - PROCURE EM TODO O CURRÍCULO:
- Procure em TODAS as seções do currículo
- Extraia tecnologias, frameworks, bancos, ferramentas, metodologias
- Retorne como ARRAY de strings: ["React", "Node.js", "TypeScript"]
- Normalize nomes: "React.js" → "React", "NodeJS" → "Node.js"
- Máximo 15 skills (mais relevantes primeiro)

### EXPERIENCE (TEMPO DE EXPERIÊNCIA):
- Some TODOS os períodos de emprego mencionados
- Use datas de início/fim de cada emprego
- Se emprego atual: conte até HOJE (${now})
- Formato: "X anos e Y meses" ou "X anos" ou "X meses"

### EDUCATION (FORMAÇÃO ACADÊMICA):
- Procure em seções de formação, educação, cursos
- Formato: "Tipo em Curso/Área - Instituição (Ano)"
- Separe múltiplas formações com " | "

---

## FORMATO DE SAÍDA (JSON ESTRITO)

HOJE É: ${now}

Retorne APENAS este JSON, sem texto adicional:
{
  "name": "nome completo ou Não identificado",
  "email": "email ou null",
  "phone": "telefone ou null",
  "location": "Cidade-UF ou null",
  "age": "idade (número como string) ou null",
  "gender": "Masculino / Feminino / Não identificado",
  "linkedin": "URL do LinkedIn ou null",
  "portfolio": "URL do portfólio ou null",
  "skills": ["Skill1", "Skill2"],
  "experience": "X anos e Y meses ou Não informado",
  "education": "Formação1 | Formação2 ou Não informado"
}
`;

  const messages: OpenAIMessage[] = [];

  // Guardrails como system message
  if (fileText || (images && images.length > 0)) {
    messages.push({ role: 'system', content: TEXT_GUARDRAILS });
  }

  if (fileText) {
    messages.push({
      role: "user",
      content: `${prompt}\n\n# CONTEÚDO DO CURRÍCULO (EXAME DE DADOS):\n<RESUME_DATA_CONTENT>\n${fileText}\n</RESUME_DATA_CONTENT>`
    });
  } else if (images && images.length > 0) {
    const contentParts: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: `${prompt}\n\n# Currículo (Imagens):` }
    ];
    images.forEach(img => {
      contentParts.push({ type: "image_url", image_url: { url: img } });
    });
    messages.push({ role: "user", content: contentParts });
  } else {
    throw new Error("Nenhum conteúdo (texto ou imagem) fornecido.");
  }

  return messages;
}

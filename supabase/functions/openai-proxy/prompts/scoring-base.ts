export function getScoringBase(): string {
  return `
## SISTEMA DE SCORING (ALGORITMO INTERNO)

DIMENSÃO          | PESO | PONTOS MÁX | IMPORTÂNCIA
------------------|------|------------|------------
Habilidades       |  35% |    35 pts  |    ALTA
Experiência       |  30% |    30 pts  |    ALTA
Formação          |  15% |    15 pts  |    BAIXA
Alinhamento Vaga  |  20% |    20 pts  |    MÉDIA

1. SCORE DE HABILIDADES (0-35 pts)
   Extrair skills do currículo vs. skills requeridas.
   Calcular: (skills_encontradas / skills_requeridas) × 35
   Bônus: +5 pts (skills extras relevantes), +3 pts (certificações)
   Penalizações: -2 pts (tecnologia obsoleta), -3 pts (skills genéricas sem profundidade)

2. SCORE DE EXPERIÊNCIA (0-30 pts)
   JÚNIOR (0-3 anos): Match perfeito: 30 pts | ±1a: 25 pts | >4a: 15 pts
   PLENO (3-6 anos): Match perfeito: 30 pts | ±1a: 25 pts | <2a: 10 pts | >8a: 20 pts
   SÊNIOR (6+ anos): Match perfeito: 30 pts | 4-5a: 25 pts | <3a: 5 pts

3. SCORE DE FORMAÇÃO (0-15 pts)
   Curso exato área+completo: 15 pts | Relacionada+completo: 12 pts
   Incompleto/Cursando: 10 pts/8 pts | Cursos livres: 5 pts.

4. SCORE DE ALINHAMENTO (0-20 pts)
   Experiência profissional na área da vaga: 20 pts
   Experiência em área relacionada: 12 pts
   Experiência em área diferente: 0 pts (penalidade abaixo se aplicável)

5. RED FLAGS — PENALIZAÇÕES (-3 a -100 pts)
   -15 pts: Inconsistência senioridade
   -10 pts: Gap emprego >6 meses
   -10 pts: Senior <4a exp total
   -8 pts: Falta formação exigida
   -5 pts: Job skipping (>3 em 2a)
   -3 pts: Sem datas no currículo

   ⚠️ INCOMPATIBILIDADE (-100 pts, ZERA O SCORE):
   Só aplique se a TRAJETÓRIA PROFISSIONAL INTEIRA for de área totalmente diferente da vaga.
   Formação acadêmica diferente NÃO é incompatibilidade.
   Ex: candidato formado em Administração com 5 anos de experiência em Design é compatível com vaga de Design.

FÓRMULA FINAL
   scoreTotal = Math.max(0, Math.min(100, skillsScore + experienceScore + educationScore + alignmentScore + redFlagsPenalties))
   Escreva apenas o NÚMERO INTEIRO (ex: 70).

CLASSIFICAÇÃO AUTOMÁTICA
   70-100 → FORTE | 40-69 → MÉDIO | 0-39 → NÃO ADERENTE
`;
}

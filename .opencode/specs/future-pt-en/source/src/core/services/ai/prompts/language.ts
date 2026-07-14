export type Lang = 'pt' | 'en';

const localeMap: Record<Lang, {
  classification: string;
  gender: string;
  recommendation: string;
  instruction: string;
}> = {
  pt: {
    classification: 'FORTE / MÉDIO / NÃO ADERENTE',
    gender: 'Masculino / Feminino / Não identificado',
    recommendation: 'Avançar / Manter em banco / Não recomendado',
    instruction: 'Responda APENAS em português brasileiro.',
  },
  en: {
    classification: 'STRONG / MEDIUM / NON-ADHERENT',
    gender: 'Male / Female / Not identified',
    recommendation: 'Proceed / Keep in bank / Not recommended',
    instruction: 'Respond ONLY in English.',
  },
};

export function getLang(lang: Lang) {
  return localeMap[lang];
}

export function getLangInstruction(lang: Lang): string {
  return localeMap[lang].instruction;
}

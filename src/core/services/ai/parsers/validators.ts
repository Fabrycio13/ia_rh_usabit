function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeScore(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(clamp(n, 0, 100)) : 0;
}

function normalizeStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(s => String(s)).filter(s => s.trim().length > 0);
  }
  if (typeof raw === 'string') {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function normalizeString(raw: unknown, fallback = ''): string {
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  return fallback;
}

function normalizeClassification(raw: unknown): string {
  const val = normalizeString(raw).toUpperCase();
  if (val.includes('FORTE') || val === 'FORTE') return 'FORTE';
  if (val.includes('MÉDIO') || val === 'MÉDIO') return 'MÉDIO';
  if (val.includes('NÃO') || val.includes('NAO') || val === 'NÃO ADERENTE') return 'NÃO ADERENTE';
  return 'MÉDIO';
}

function normalizeNumber(raw: unknown, fallback = 0): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeAnalysisResult(raw: Record<string, unknown>) {
  return {
    ...raw,
    score: normalizeScore(raw.score),
    scoreSkills: normalizeNumber(raw.scoreSkills),
    scoreExperience: normalizeNumber(raw.scoreExperience),
    scoreEducation: normalizeNumber(raw.scoreEducation),
    scorePenalties: normalizeNumber(raw.scorePenalties),
    classification: normalizeClassification(raw.classification),
    skills: normalizeStringArray(raw.skills),
    strengths: normalizeStringArray(raw.strengths),
    gaps: normalizeStringArray(raw.gaps),
    summary: normalizeString(raw.summary, 'Análise realizada com base no currículo.'),
    name: normalizeString(raw.name, 'Não identificado'),
    email: normalizeString(raw.email, 'não informado'),
    phone: normalizeString(raw.phone, 'não informado'),
    location: normalizeString(raw.location, 'não informado'),
    age: normalizeString(raw.age, 'não informado'),
    gender: normalizeString(raw.gender, 'Não identificado'),
    experience: normalizeString(raw.experience, 'Não informado'),
    education: normalizeString(raw.education, 'Não informado'),
    redFlags: normalizeString(raw.redFlags, 'Nenhuma identificada'),
    recommendation: normalizeString(raw.recommendation, 'Manter em banco'),
    status: normalizeString(raw.status, 'PROCESSADO'),
  };
}

export function normalizeJobMatchResult(raw: Record<string, unknown>) {
  return {
    score: normalizeScore(raw.score),
    classification: normalizeClassification(raw.classification),
    skills: normalizeStringArray(raw.skills),
    experience: normalizeString(raw.experience, 'Não informado'),
    education: normalizeString(raw.education, 'Não informado'),
    summary: normalizeString(raw.summary, 'Análise realizada com base no currículo.'),
    strengths: normalizeStringArray(raw.strengths),
    gaps: normalizeStringArray(raw.gaps),
  };
}

export function normalizeResumeAnalysis(raw: Record<string, unknown>) {
  return {
    score: normalizeScore(raw.score),
    classification: normalizeClassification(raw.classification),
    skills: normalizeStringArray(raw.skills),
    experience: normalizeString(raw.experience, 'Não informado'),
    education: normalizeString(raw.education, 'Não informado'),
    summary: normalizeString(raw.summary, 'Análise realizada com base no currículo.'),
    strengths: normalizeStringArray(raw.strengths),
    gaps: normalizeStringArray(raw.gaps),
    suggested_areas: normalizeStringArray(raw.suggested_areas),
  };
}

export function normalizeExtraction(raw: Record<string, unknown>) {
  return {
    name: normalizeString(raw.name, 'Não identificado'),
    email: raw.email != null ? normalizeString(raw.email) : null,
    phone: raw.phone != null ? normalizeString(raw.phone) : null,
    location: raw.location != null ? normalizeString(raw.location) : null,
    age: raw.age != null ? normalizeString(raw.age) : null,
    gender: normalizeString(raw.gender, 'Não identificado'),
    linkedin: raw.linkedin != null ? normalizeString(raw.linkedin) : null,
    portfolio: raw.portfolio != null ? normalizeString(raw.portfolio) : null,
    skills: normalizeStringArray(raw.skills),
    experience: normalizeString(raw.experience, 'Não informado'),
    education: normalizeString(raw.education, 'Não informado'),
  };
}

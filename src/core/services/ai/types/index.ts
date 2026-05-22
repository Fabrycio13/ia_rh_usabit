export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

export interface AIAnalysisBase {
  score: number;
  classification: string;
  skills: string[];
  experience: string;
  education: string;
  summary: string;
  strengths: string[];
  gaps: string[];
}

export interface AnalysisResult extends AIAnalysisBase {
  name: string;
  email: string;
  phone: string;
  location: string;
  age: string;
  gender: string;
  scoreSkills: number;
  scoreExperience: number;
  scoreEducation: number;
  scorePenalties: number;
  redFlags: string;
  recommendation: string;
  status: string;
}

export type JobMatchResult = AIAnalysisBase;

export interface ResumeAnalysis extends AIAnalysisBase {
  suggested_areas: string[];
}

export interface CandidateExtraction {
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



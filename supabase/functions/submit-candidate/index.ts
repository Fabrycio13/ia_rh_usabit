import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import pdfParse from "npm:pdf-parse@1.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

interface CandidatePayload {
  email: string
  organization_id: string
  name: string
  phone?: string | null
  location?: string | null
  linkedin?: string | null
  resume_url?: string | null
  resume_file_name?: string | null
  gender?: string | null
  age?: string | number | null
  address?: string | null
  portfolio?: string | null
  cep?: string | null
  address_number?: string | null
  complement?: string | null
  vaga_id?: string | null
  status?: string
  source?: string | null
  skills?: string | null
  experience?: string | null
  analysis?: Record<string, unknown> | null
}

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000
const TEXT_MAX = 1000
const EMAIL_MAX = 320
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function stripHtml(v: string): string {
  return v.replace(/<[^>]*>/g, '').trim()
}

function sanitizeText(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.normalize('NFKC').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B-\u200F\uFEFF]/g, '').trim()
}

function validateField(label: string, value: unknown, maxLen: number): string | null {
  if (value == null || String(value).trim() === '') return null
  const s = String(value)
  if (s.length > maxLen) return `Campo '${label}' excede ${maxLen} caracteres`
  return null
}

async function checkRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  key: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs).toISOString()
  const { count } = await supabaseAdmin
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart)
  if ((count ?? 0) >= maxRequests) return false
  await supabaseAdmin.from('rate_limits').insert({ key, endpoint })
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown'

  try {
    const body: CandidatePayload = await req.json()

    if (!body.email || !body.organization_id || !body.name) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: email, organization_id, name' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!EMAIL_RE.test(body.email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const errs = [
      validateField('name', body.name, TEXT_MAX),
      validateField('email', body.email, EMAIL_MAX),
      validateField('phone', body.phone, 50),
      validateField('location', body.location, 255),
      validateField('linkedin', body.linkedin, 500),
      validateField('skills', body.skills, TEXT_MAX),
      validateField('experience', body.experience, TEXT_MAX),
    ].filter(Boolean)
    if (errs.length > 0) {
      return new Response(JSON.stringify({ error: errs[0] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    body.name = sanitizeText(stripHtml(body.name))
    if (body.phone) body.phone = sanitizeText(stripHtml(body.phone))
    if (body.location) body.location = sanitizeText(stripHtml(body.location))
    if (body.linkedin) body.linkedin = sanitizeText(stripHtml(body.linkedin))
    if (body.skills) body.skills = sanitizeText(stripHtml(body.skills))
    if (body.experience) body.experience = sanitizeText(stripHtml(body.experience))

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração de banco de dados ausente na Função')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    // 1. Rate limit por IP
    const allowed = await checkRateLimit(
      supabaseAdmin,
      `ip:${clientIp}`,
      'submit-candidate',
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    )
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    // 2. Validar que a organização existe
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('id', body.organization_id)
      .maybeSingle();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organização não encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // 3. Se informou vaga_id, validar que ela existe e pertence à org
    if (body.vaga_id) {
      const { data: vaga, error: vagaError } = await supabaseAdmin
        .from('vagas_white_label')
        .select('id, organization_id, is_active, status')
        .eq('id', body.vaga_id)
        .single();

      if (vagaError || !vaga) {
        return new Response(JSON.stringify({ error: 'Vaga não encontrada' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }
      if (!vaga.is_active || vaga.status !== 'aberta') {
        return new Response(JSON.stringify({ error: 'Vaga não está mais disponível' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      if (vaga.organization_id !== body.organization_id) {
        return new Response(JSON.stringify({ error: 'Vaga não pertence à organização' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    // 4. Upsert do candidato
    const { data, error } = await supabaseAdmin
      .from('candidates')
      .upsert({
        email: body.email,
        organization_id: body.organization_id,
        name: body.name,
        phone: body.phone || null,
        location: body.location || null,
        linkedin: body.linkedin || null,
        resume_url: body.resume_url || null,
        resume_file_name: body.resume_file_name || null,
        gender: body.gender || null,
        age: body.age != null ? String(body.age) : null,
        address: body.address || null,
        portfolio: body.portfolio || null,
        cep: body.cep || null,
        address_number: body.address_number || null,
        complement: body.complement || null,
        vaga_id: body.vaga_id || null,
        status: body.status || 'pending',
        source: body.source || null,
        skills: body.skills || null,
        experience: body.experience || null,
        analysis: body.analysis || null,
      }, { onConflict: 'email,organization_id' })
      .select('id')
      .single()

    if (error) {
      console.error('Erro no upsert de candidato:', error.message, error.details, error.hint)
      return new Response(JSON.stringify({ error: 'Erro ao salvar candidato' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 5. Enviar email de confirmação (best-effort, não bloqueia)
    const candidateFirstName = body.name.split(' ')[0];
    sendConfirmationEmail(candidateFirstName, body.email);

    // 6. Enriquecer com IA (best-effort, não bloqueia)
    if (body.resume_url) {
      enrichWithAI(data.id, body.resume_url, supabaseAdmin);
    }

    return new Response(JSON.stringify({ id: data.id, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro na função submit-candidate:', (error as Error).message)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// ─── Helpers (server-side, nunca expostos ao frontend) ─────────────────────

// ponytail: fire-and-forget, sem await — usuário já recebeu 200
function sendConfirmationEmail(firstName: string, email: string) {
  if (!RESEND_API_KEY) return;
  // ponytail: busca nome da org mas nao espera
  const subject = 'Currículo recebido com sucesso!';
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#04070c;font-family:Inter,sans-serif;color:#fff"><div style="max-width:600px;margin:0 auto;background:#0b111a;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:40px 24px;text-align:left"><h2 style="color:#2C58FD;font-family:'Space Grotesk',sans-serif;font-size:26px;margin:0 0 16px">Olá, ${firstName}!</h2><p style="font-size:17px;line-height:1.6;color:#94a3b8;margin:0 0 24px">Recebemos seu currículo com sucesso! Seu perfil foi incluído em nosso Banco de Talentos e poderá ser considerado para futuras oportunidades.</p><p style="font-size:14px;color:#64748b;margin:0">Atenciosamente,<br><strong style="color:#fff">Usabit people</strong></p></div></body></html>`;

  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: 'Usabit people <noreply@space.pro.br>', to: [email], subject, html }),
  }).catch(() => {}); // ponytail: falha silenciosa, candidato já está no banco
}

// ponytail: extrai dados do PDF via IA, faz UPDATE no candidato. Best-effort.
async function enrichWithAI(candidateId: string, resumeUrl: string, supabaseAdmin: ReturnType<typeof createClient>) {
  try {
    if (!OPENAI_API_KEY) {
      console.warn('[submit-candidate] OPENAI_API_KEY não configurada, IA pulada');
      return;
    }

    // 1. Baixar PDF do storage
    const bucket = 'job-applications';
    const path = resumeUrl.replace(`${bucket}/`, '');
    const { data: pdfBlob, error: downloadErr } = await supabaseAdmin.storage.from(bucket).download(path);
    if (downloadErr || !pdfBlob) {
      console.error('[submit-candidate] Erro ao baixar PDF:', downloadErr?.message);
      return;
    }

    // 2. Extrair texto do PDF
    const pdfBuffer = new Uint8Array(await pdfBlob.arrayBuffer());
    let extractedText = '';
    try {
      const pdfData = await pdfParse(pdfBuffer);
      extractedText = (pdfData.text || '').slice(0, 8000);
    } catch (parseErr) {
      console.error('[submit-candidate] Erro ao extrair texto do PDF:', (parseErr as Error).message);
      return;
    }
    if (!extractedText.trim()) {
      console.warn('[submit-candidate] PDF sem texto extraível');
      return;
    }

    // 3. Chamar OpenAI para extração estruturada
    const prompt = `Analise o currículo abaixo e retorne APENAS um JSON estrito (sem markdown, sem texto adicional) no formato:
{
  "name": "Nome completo identificado ou string vazia",
  "skills": ["skill1", "skill2", ...],
  "experience": "Resumo da experiência profissional (ex: '5 anos em desenvolvimento web')",
  "education": "Formação principal (ex: 'Ciência da Computação - USP')",
  "summary": "Resumo profissional do candidato em 2-3 linhas",
  "feedback": "Análise geral do perfil: pontos fortes, áreas de atuação, observações relevantes (3-5 linhas)",
  "location": "Cidade/Estado se identificado ou string vazia"
}
Use string vazia se um campo não existir.

CURRÍCULO:
${extractedText}`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 800, temperature: 0 }),
    });
    if (!aiRes.ok) {
      console.error('[submit-candidate] OpenAI erro:', aiRes.status);
      return;
    }

    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content || '';
    let parsed: {
      name?: string; skills?: string[]; experience?: string; education?: string;
      summary?: string; feedback?: string; location?: string;
    } = {};
    try {
      // Remove markdown code blocks se houver
      const cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch (jsonErr) {
      console.error('[submit-candidate] Erro ao parsear resposta da IA:', (jsonErr as Error).message, '| content:', content.slice(0, 200));
      return;
    }

    // 4. Montar objeto analysis (JSONB)
    const analysis: Record<string, unknown> = {};
    if (parsed.summary) analysis.summary = parsed.summary;
    if (parsed.feedback) {
      analysis.general_analysis = parsed.feedback;
      analysis.feedback = parsed.feedback;
    }
    if (parsed.experience) analysis.experience = parsed.experience;

    // 5. Atualizar candidato com dados da IA
    const updates: Record<string, unknown> = {
      raw_text: extractedText,
      is_analyzed: true,
      analysis,
    };
    if (parsed.name) updates.name = parsed.name;
    if (parsed.location) updates.location = parsed.location;
    if (parsed.skills?.length) {
      updates.skills = parsed.skills.join(', ');
      updates.tags = parsed.skills.map((s: string) => s.toLowerCase().trim());
    }
    if (parsed.experience) updates.experience = parsed.experience;
    if (parsed.education) updates.education = parsed.education;

    const { error: updateErr } = await supabaseAdmin.from('candidates').update(updates).eq('id', candidateId);
    if (updateErr) {
      console.error('[submit-candidate] Erro ao atualizar candidato:', updateErr.message);
    } else {
      console.log('[submit-candidate] Candidato enriquecido com IA:', candidateId);
    }
  } catch (err) {
    console.error('[submit-candidate] Erro inesperado na IA:', (err as Error).message);
  }
}

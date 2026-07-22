import { supabase } from './supabase';

/**
 * Tools available for the AI Assistant to query Supabase data.
 * The RLS policies (multitenancy_policy) automatically scope queries
 * to the user's organization — no manual userId/orgId filters needed.
 */

export const search_candidates = async (params: { query?: string; jobName?: string; location?: string }) => {
    let q = supabase
        .from('candidates')
        .select('id, name, email, location, age, gender, score, vagas_candidaturas(vaga_id, candidate_name)');

    if (params.query) q = q.ilike('name', `%${params.query}%`);
    if (params.location) q = q.ilike('location', `%${params.location}%`);

    const { data, error } = await q.order('score', { ascending: false });
    if (error) throw error;

    type CandidateRow = { id: string; name?: string; email?: string; location?: string; score?: number; vagas_candidaturas?: { vaga_id?: string; candidate_name?: string }[] };
    let filtered = ((data ?? []) as CandidateRow[]).map((c) => ({
        ...c,
        vagas: (c.vagas_candidaturas ?? []).map((vc) => vc.candidate_name).filter(Boolean) as string[]
    }));

    if (params.jobName) {
        filtered = filtered.filter((c: { vagas: string[] }) =>
            c.vagas.some((v: string) => v.toLowerCase().includes(params.jobName!.toLowerCase()))
        );
    }

    return filtered.slice(0, 10);
};

export const get_candidate_details = async (params: { candidateId: string }) => {
    // ponytail: select only non-PII columns — email, phone, linkedin, age, gender
    // nunca devem ser expostos ao modelo de IA
    const { data, error } = await supabase
        .from('candidates')
        .select('id, name, location, skills, experience, education, score, status, tags, summary, strengths, gaps, created_at')
        .eq('id', params.candidateId)
        .single();

    if (error) throw error;
    return data;
};

export const get_dashboard_stats = async () => {
    const [{ count: vagasCount }, { count: candidatesCount }] = await Promise.all([
        supabase.from('vagas_white_label').select('*', { count: 'exact', head: true }),
        supabase.from('candidates').select('*', { count: 'exact', head: true })
    ]);

    return {
        total_vagas: vagasCount ?? 0,
        total_candidatos: candidatesCount ?? 0,
    };
};

export const get_job_candidate_counts = async () => {
    const { data: vagas, error: vagasError } = await supabase
        .from('vagas_white_label')
        .select('id, title');

    if (vagasError) throw vagasError;

    const result = await Promise.all((vagas || []).map(async (vaga) => {
        const { count } = await supabase
            .from('vagas_candidaturas')
            .select('*', { count: 'exact', head: true })
            .eq('vaga_id', vaga.id);
        return { id: vaga.id, name: vaga.title, candidate_count: count ?? 0 };
    }));

    return result.sort((a, b) => b.candidate_count - a.candidate_count);
};

export const get_assistant_tools = () => ({
    search_candidates,
    get_candidate_details,
    get_dashboard_stats,
    get_job_candidate_counts,
});

export const openAiToolDefinitions: {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, { type: string; description?: string }>;
            required: string[];
        };
    };
}[] = [
    {
        type: "function",
        function: {
            name: "search_candidates",
            description: "Busca candidatos no banco de dados por nome, localização ou nome da vaga. Retorna os 10 melhores resultados.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Nome ou parte do nome do candidato" },
                    jobName: { type: "string", description: "Nome da vaga (ex: 'Design', 'Padeiro')" },
                    location: { type: "string", description: "Cidade ou estado do candidato" }
                },
                required: [],
            },
        }
    },
    {
        type: "function",
        function: {
            name: "get_candidate_details",
            description: "Retorna todos os detalhes de um candidato específico (experiência, habilidades, educação, e-mail, telefone) usando o ID retornado na busca.",
            parameters: {
                type: "object",
                properties: {
                    candidateId: { type: "string", description: "O ID único do candidato" }
                },
                required: ["candidateId"]
            },
        }
    },
    {
        type: "function",
        function: {
            name: "get_dashboard_stats",
            description: "Retorna estatísticas rápidas do dashboard (total de vagas e candidatos).",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        }
    },
    {
        type: "function",
        function: {
            name: "get_job_candidate_counts",
            description: "Retorna a contagem de candidatos por vaga, ordenada da que tem mais candidatos para a que tem menos. Útil para saber qual vaga é mais popular.",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        }
    }
];

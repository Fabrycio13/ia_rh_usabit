import { supabase } from './supabase';

/**
 * Tools available for the AI Assistant to query Supabase data.
 * The RLS policies (multitenancy_policy) automatically scope queries
 * to the user's organization — no manual userId/orgId filters needed.
 */

export const get_assistant_tools = () => {
    return {
        list_jobs: async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select('id, name, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },

        search_candidates: async (params: { query?: string; jobName?: string; location?: string }) => {
            let q = supabase
                .from('candidates')
                .select('id, name, email, location, age, gender, score, job_candidates(jobs(name))');

            if (params.query) q = q.ilike('name', `%${params.query}%`);
            if (params.location) q = q.ilike('location', `%${params.location}%`);

            const { data, error } = await q.order('score', { ascending: false });
            if (error) throw error;

            type CandidateRow = { id: string; name?: string; email?: string; location?: string; score?: number; job_candidates?: { jobs?: { name?: string } }[] };
            let filtered = ((data ?? []) as CandidateRow[]).map((c) => ({
                ...c,
                vagas: (c.job_candidates ?? []).map((jc) => jc.jobs?.name).filter(Boolean) as string[]
            }));

            if (params.jobName) {
                filtered = filtered.filter((c: { vagas: string[] }) =>
                    c.vagas.some((v: string) => v.toLowerCase().includes(params.jobName!.toLowerCase()))
                );
            }

            return filtered.slice(0, 10);
        },

        get_candidate_details: async (params: { candidateId: string }) => {
            const { data, error } = await supabase
                .from('candidates')
                .select('*')
                .eq('id', params.candidateId)
                .single();

            if (error) throw error;
            return data;
        },

        get_dashboard_stats: async () => {
            const [{ count: jobsCount }, { count: candidatesCount }] = await Promise.all([
                supabase.from('jobs').select('*', { count: 'exact', head: true }),
                supabase.from('candidates').select('*', { count: 'exact', head: true })
            ]);

            return {
                total_vagas: jobsCount ?? 0,
                total_candidatos: candidatesCount ?? 0,
            };
        },

        get_job_candidate_counts: async () => {
            const { data: jobs, error: jobsError } = await supabase
                .from('jobs')
                .select('id, name');

            if (jobsError) throw jobsError;

            const result = await Promise.all((jobs || []).map(async (job) => {
                const { count } = await supabase
                    .from('job_candidates')
                    .select('*', { count: 'exact', head: true })
                    .eq('job_id', job.id);
                return { id: job.id, name: job.name, candidate_count: count ?? 0 };
            }));

            return result.sort((a, b) => b.candidate_count - a.candidate_count);
        }
    };
};

export const toolDefinitions: {
    name: string;
    description: string;
    parameters: {
        type: 'OBJECT';
        properties: Record<string, { type: string; description?: string }>;
        required?: string[];
    };
}[] = [
    {
        name: "list_jobs",
        description: "Lista todas as vagas/análises criadas pelo usuário. Útil para saber quais processos seletivos estão ativos.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "search_candidates",
        description: "Busca candidatos no banco de dados por nome, localização ou nome da vaga. Retorna os 10 melhores resultados.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: { type: "STRING", description: "Nome ou parte do nome do candidato" },
                jobName: { type: "STRING", description: "Nome da vaga (ex: 'Design', 'Padeiro')" },
                location: { type: "STRING", description: "Cidade ou estado do candidato" }
            },
        },
    },
    {
        name: "get_candidate_details",
        description: "Retorna todos os detalhes de um candidato específico (experiência, habilidades, educação, e-mail, telefone) usando o ID retornado na busca.",
        parameters: {
            type: "OBJECT",
            properties: {
                candidateId: { type: "STRING", description: "O ID único do candidato" }
            },
            required: ["candidateId"]
        },
    },
    {
        name: "get_dashboard_stats",
        description: "Retorna estatísticas rápidas do dashboard (total de vagas e candidatos).",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
    {
        name: "get_job_candidate_counts",
        description: "Retorna a contagem de candidatos por vaga, ordenada da que tem mais candidatos para a que tem menos. Útil para saber qual vaga é mais popular.",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    }
];

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
            name: "list_jobs",
            description: "Lista todas as vagas/análises criadas pelo usuário. Útil para saber quais processos seletivos estão ativos.",
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

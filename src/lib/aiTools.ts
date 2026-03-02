import { supabase } from './supabase';

/**
 * Tools available for the AI Assistant to query Supabase data.
 * These functions are scoped to the provided userId for security.
 */

export const get_assistant_tools = (userId: string) => {
    return {
        list_jobs: async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select('id, name, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },

        search_candidates: async (params: { query?: string; jobName?: string; location?: string }) => {
            let query = supabase
                .from('candidates')
                .select('id, name, email, location, age, gender, score, job_candidates(jobs(name))')
                .eq('user_id', userId);

            if (params.query) {
                query = query.ilike('name', `%${params.query}%`);
            }
            if (params.location) {
                query = query.ilike('location', `%${params.location}%`);
            }

            const { data, error } = await query.order('score', { ascending: false });
            if (error) throw error;

            // Filter by jobName in JS since it's a nested relation filter which is trickier in simple select
            let filtered = (data ?? []).map((c: any) => ({
                ...c,
                vagas: (c.job_candidates ?? []).map((jc: any) => jc.jobs?.name).filter(Boolean)
            }));

            if (params.jobName) {
                filtered = filtered.filter(c =>
                    c.vagas.some((v: string) => v.toLowerCase().includes(params.jobName!.toLowerCase()))
                );
            }

            return filtered.slice(0, 10); // Limit to top 10 for context window safety
        },

        get_candidate_details: async (params: { candidateId: string }) => {
            const { data, error } = await supabase
                .from('candidates')
                .select('*')
                .eq('id', params.candidateId)
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            return data;
        },

        get_dashboard_stats: async () => {
            // 1. Jobs count
            const { count: jobsCount } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            // 2. Candidates count
            const { count: candidatesCount } = await supabase
                .from('candidates')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            return {
                total_vagas: jobsCount ?? 0,
                total_candidatos: candidatesCount ?? 0,
            };
        }
    };
};

export const toolDefinitions = [
    {
        name: "list_jobs",
        description: "Lista todas as vagas/análises criadas pelo usuário. Útil para saber quais processos seletivos estão ativos.",
        parameters: {
            type: "OBJECT" as any,
            properties: {},
        },
    },
    {
        name: "search_candidates",
        description: "Busca candidatos no banco de dados por nome, localização ou nome da vaga. Retorna os 10 melhores resultados.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                query: { type: "STRING" as any, description: "Nome ou parte do nome do candidato" },
                jobName: { type: "STRING" as any, description: "Nome da vaga (ex: 'Design', 'Padeiro')" },
                location: { type: "STRING" as any, description: "Cidade ou estado do candidato" }
            },
        },
    },
    {
        name: "get_candidate_details",
        description: "Retorna todos os detalhes de um candidato específico (experiência, habilidades, educação, e-mail, telefone) usando o ID retornado na busca.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                candidateId: { type: "STRING" as any, description: "O ID único do candidato" }
            },
            required: ["candidateId"]
        },
    },
    {
        name: "get_dashboard_stats",
        description: "Retorna estatísticas rápidas do dashboard (total de vagas e candidatos).",
        parameters: {
            type: "OBJECT" as any,
            properties: {},
        },
    }
];

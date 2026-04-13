// Definição de permissões por perfil de acesso

export interface RolePermissions {
    dashboard: boolean;
    vagas: boolean;
    vagas_edit: boolean;
    analises: boolean;
    analises_edit: boolean;
    candidatos: boolean;
    candidatos_edit: boolean;
    pipeline: boolean;
    pipeline_edit: boolean;
    chat: boolean;
    admin: boolean;
    logs: boolean;
}

export const rolePermissions: Record<string, RolePermissions> = {
    admin: {
        dashboard: true,
        vagas: true,
        vagas_edit: true,
        analises: true,
        analises_edit: true,
        candidatos: true,
        candidatos_edit: true,
        pipeline: true,
        pipeline_edit: true,
        chat: true,
        admin: true,
        logs: true,
    },
    rh: {
        dashboard: true,
        vagas: true,
        vagas_edit: true,
        analises: true,
        analises_edit: true,
        candidatos: true,
        candidatos_edit: true,
        pipeline: true,
        pipeline_edit: true,
        chat: false,       // RH não tem acesso ao Chat
        admin: false,      // RH não tem acesso ao Painel Admin
        logs: false,       // RH não tem acesso aos Logs
    },
    gestor: {
        dashboard: true,
        vagas: true,           // Gestor visualiza vagas
        vagas_edit: false,     // Gestor NÃO cria/edita/exclui vagas
        analises: true,        // Gestor visualiza análises
        analises_edit: false,  // Gestor NÃO cria análises
        candidatos: true,      // Gestor visualiza candidatos
        candidatos_edit: false,// Gestor NÃO edita candidatos
        pipeline: true,        // Gestor acompanha pipeline
        pipeline_edit: false,  // Gestor NÃO edita pipeline
        chat: false,           // Gestor NÃO tem acesso ao Chat
        admin: false,          // Gestor não tem acesso ao Painel Admin
        logs: false,           // Gestor não tem acesso aos Logs
    },
    convidado: {
        dashboard: false,  // Convidado NÃO tem acesso ao Dashboard
        vagas: true,       // Convidado visualiza vagas (somente leitura)
        vagas_edit: false, // Convidado NÃO cria/edita/exclui vagas
        analises: false,   // Convidado não vê análises detalhadas
        analises_edit: false,
        candidatos: false, // Convidado não vê banco de candidatos
        candidatos_edit: false,
        pipeline: false,   // Convidado não vê pipeline
        pipeline_edit: false,
        chat: false,       // Convidado não tem acesso ao Chat
        admin: false,      // Convidado não tem acesso ao Painel Admin
        logs: false,       // Convidado não tem acesso aos Logs
    },
};

// Helper para verificar permissão
export const hasPermission = (role: string, permission: keyof RolePermissions): boolean => {
    return rolePermissions[role]?.[permission] ?? false;
};

// Helper para verificar se é modo apenas visual
export const isViewOnly = (role: string, module: 'vagas' | 'analises' | 'candidatos' | 'pipeline'): boolean => {
    const editPermission = `${module}_edit` as keyof RolePermissions;
    return rolePermissions[role]?.[module] === true && rolePermissions[role]?.[editPermission] === false;
};

// Helper para obter o role atual do usuário
export const getUserRole = (): string => {
    try {
        const profileStr = localStorage.getItem('sb-profile') || localStorage.getItem('profile');
        if (profileStr) {
            const profile = JSON.parse(profileStr);
            return profile?.user_role || 'user';
        }
    } catch (e) {
        console.error('Erro ao ler profile:', e);
    }
    return 'user';
};

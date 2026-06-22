// Definição de permissões por perfil de acesso
// Hierarquia: Owner → Administrador → Supervisor → {RH, Convidado}

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
    chat: boolean;      // Acesso à página completa de chat
    chat_widget: boolean; // Acesso ao balão do Assistente IA
    admin: boolean;
    logs: boolean;
}

export const rolePermissions: Record<string, RolePermissions> = {
    // OWNER: super-admin do SaaS — vê TUDO de todas as organizações
    owner: {
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
        chat_widget: true,
        admin: true,
        logs: true,
    },

    // ADMINISTRADOR: admin da organização cliente — acesso total NA SUA org
    administrador: {
        dashboard: true,
        vagas: true,
        vagas_edit: true,
        analises: true,
        analises_edit: true,
        candidatos: true,
        candidatos_edit: true,
        pipeline: true,
        pipeline_edit: true,
        chat: false,
        chat_widget: true,
        admin: true,
        logs: true,
    },

    // SUPERVISOR: operacional + supervisão — acesso total + logs
    supervisor: {
        dashboard: true,
        vagas: true,
        vagas_edit: true,
        analises: true,
        analises_edit: true,
        candidatos: true,
        candidatos_edit: true,
        pipeline: true,
        pipeline_edit: true,
        chat: false,
        chat_widget: true,
        admin: true,
        logs: true,
    },

    // RH: operacional — cria análises, vagas, lida com candidatos
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
        chat: false,
        chat_widget: true,
        admin: false,
        logs: false,
    },

    // CONVIDADO: visualiza vagas + pipeline read-only (vagas permitidas pelo administrador)
    convidado: {
        dashboard: false,
        vagas: true,
        vagas_edit: false,
        analises: false,
        analises_edit: false,
        candidatos: false,
        candidatos_edit: false,
        pipeline: true,
        pipeline_edit: false,
        chat: false,
        chat_widget: false,
        admin: false,
        logs: false,
    },
};

// Helper para verificar permissão (role desconhecido = sem acesso)
export const hasPermission = (role: string, permission: keyof RolePermissions): boolean => {
    return rolePermissions[role]?.[permission] ?? false;
};

// Helper para verificar se é modo apenas visual
export const isViewOnly = (role: string, module: 'vagas' | 'analises' | 'candidatos' | 'pipeline'): boolean => {
    const editPermission = `${module}_edit` as keyof RolePermissions;
    return rolePermissions[role]?.[module] === true && rolePermissions[role]?.[editPermission] === false;
};

// Helper: owner vê tudo; administrador/supervisor/rh veem sua org; convidado acesso minimal
export const isGlobalViewer = (role: string): boolean => role === 'owner';
export const isOrgMember = (role: string): boolean => ['administrador', 'supervisor', 'rh'].includes(role);

// Definição de permissões por perfil de acesso
// Hierarquia: Owner → Gestor → RH → Convidado

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
        admin: true,
        logs: true,
    },

    // GESTOR: admin da organização cliente — acesso total NA SUA org
    gestor: {
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
        admin: true,   // painel de gerenciamento da sua própria org
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
        admin: false,
        logs: false,
    },

    // CONVIDADO: apenas visualiza vagas (somente leitura)
    convidado: {
        dashboard: false,
        vagas: true,
        vagas_edit: false,
        analises: false,
        analises_edit: false,
        candidatos: false,
        candidatos_edit: false,
        pipeline: false,
        pipeline_edit: false,
        chat: false,
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

// Helper: owner vê tudo; gestor/rh veem sua org; convidado acesso minimal
export const isGlobalViewer = (role: string): boolean => role === 'owner';
export const isOrgMember = (role: string): boolean => ['gestor', 'rh'].includes(role);

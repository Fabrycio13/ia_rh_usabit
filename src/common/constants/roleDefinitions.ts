import { ShieldCheck, Briefcase, Users, User } from 'lucide-react';

export interface RoleDefinition {
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>;
    color: string;
    description: string;
    permissions: string[];
}

export const roleDefinitions: RoleDefinition[] = [
    {
        key: 'owner',
        label: 'Owner',
        icon: ShieldCheck,
        color: '#dc2626',
        description: 'Super-admin da plataforma. Vê e gerencia todas as organizações.',
        permissions: [
            'Criar e gerenciar gestores',
            'Acesso total a todas as funcionalidades',
            'Visão de todas as organizações',
            'Configurações globais do sistema',
            'Gerenciar planos e assinaturas',
            'Acesso a logs e auditoria completa'
        ]
    },
    {
        key: 'gestor',
        label: 'Gestor',
        icon: Briefcase,
        color: '#f59e0b',
        description: 'Admin da organização cliente. Acesso total dentro da sua org. Cria e gerencia RH e Convidados.',
        permissions: [
            'Acesso total à sua organização',
            'Criar e gerenciar RH e Convidados',
            'Gerenciar vagas, análises e candidatos',
            'Pipeline e chat com candidatos',
            'Configurar integrações da organização',
            'Acesso a logs de atividade'
        ]
    },
    {
        key: 'rh',
        label: 'RH',
        icon: Users,
        color: '#6366f1',
        description: 'Focado em recrutamento e seleção. Acesso operacional completo à organização.',
        permissions: [
            'Criar e editar vagas',
            'Analisar candidatos',
            'Gerenciar banco de candidatos',
            'Pipeline de candidatos',
            'Visualizar relatórios de análise'
        ]
    },
    {
        key: 'convidado',
        label: 'Convidado',
        icon: User,
        color: '#10b981',
        description: 'Acesso somente leitura às vagas da organização.',
        permissions: [
            'Visualizar vagas publicadas',
            'Acessar links públicos de vagas',
            'Visualizar dados básicos'
        ]
    },
];

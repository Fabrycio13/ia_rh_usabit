import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'pt' | 'en';

const translations = {
    pt: {
        settings: 'Configurações',
        language: 'Idioma',
        help: 'Receber ajuda',
        logout: 'Sair',
        dashboard: 'Dashboard',
        vagas: 'Vagas',
        analyses: 'Análises',
        candidateBank: 'Banco de Talentos',
        menu: 'Menu',
        currentPlan: 'Plano atual',
        profile: 'Informações Pessoais',
        fullName: 'Nome completo',
        role: 'Cargo',
        company: 'Empresa',
        phone: 'Telefone',
        email: 'E-mail',
        saveChanges: 'Salvar alterações',
        saving: 'Salvando...',
        changePhoto: 'Trocar foto',
        plans: 'Plano Atual',
        manageSubscription: 'Gerencie sua assinatura e faça upgrade quando quiser',
        upgrade: 'Fazer upgrade',
        talkToSales: 'Falar com vendas',
        active: 'Ativo',
        popular: 'Mais popular',
        manageProfile: 'Gerencie seu perfil e plano',
        planTrial: 'Plano Trial',
        planPro: 'Plano Pro',
        planEnterprise: 'Enterprise',
    },
    en: {
        settings: 'Settings',
        language: 'Language',
        help: 'Get help',
        logout: 'Sign out',
        dashboard: 'Dashboard',
        vagas: 'Job Openings',
        analyses: 'Analyses',
        candidateBank: 'Talent Bank',
        menu: 'Menu',
        currentPlan: 'Current plan',
        profile: 'Personal Information',
        fullName: 'Full name',
        role: 'Role',
        company: 'Company',
        phone: 'Phone',
        email: 'E-mail',
        saveChanges: 'Save changes',
        saving: 'Saving...',
        changePhoto: 'Change photo',
        plans: 'Current Plan',
        manageSubscription: 'Manage your subscription and upgrade anytime',
        upgrade: 'Upgrade',
        talkToSales: 'Talk to sales',
        active: 'Active',
        popular: 'Most popular',
        manageProfile: 'Manage your profile and plan',
        planTrial: 'Trial Plan',
        planPro: 'Pro Plan',
        planEnterprise: 'Enterprise',
    },
} as const;

type TranslationKey = keyof typeof translations.pt;

interface LangContextType {
    lang: Lang;
    setLang: (l: Lang) => void;
    t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextType>({
    lang: 'pt',
    setLang: () => { },
    t: (k) => k,
});

export const useLang = () => useContext(LangContext);

export const LangProvider = ({ children }: { children: ReactNode }) => {
    const [lang, setLangState] = useState<Lang>(() => {
        return (localStorage.getItem('app_lang') as Lang) || 'pt';
    });

    const setLang = (l: Lang) => {
        localStorage.setItem('app_lang', l);
        setLangState(l);
    };

    const t = (key: TranslationKey): string => translations[lang][key];

    return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
};

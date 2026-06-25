/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { rolePermissions } from '../config/permissions';

interface UserProfile {
    userId: string;
    userName: string;
    firstName: string;
    avatarUrl: string;
    plan: string;
    email: string;
    initials: string;
    notificationsEnabled: boolean;
    user_role: 'owner' | 'administrador' | 'supervisor' | 'rh' | 'convidado';
    status: 'active' | 'inactive' | 'pending';
    account_type: 'trial' | 'active' | 'lifetime';
    trial_ends_at: string | null;
    organization_id: string | null;
    organization_name: string | null;
    brandName: string;
    brandColor: string;
    brandFont: string;
    onboarding_completed: boolean;
    loaded: boolean; // true once the first load completed
    isPremium: boolean;
    evolution_api_url?: string;
    evolution_api_key?: string;
    evolution_instance?: string;
}

const defaultProfile: UserProfile = {
    userId: '', userName: '', firstName: '', avatarUrl: '',
    plan: 'trial', email: '', initials: '', notificationsEnabled: false,
    user_role: 'owner', status: 'active', account_type: 'trial', trial_ends_at: null,
    organization_id: null, organization_name: null, brandName: '', brandColor: '', brandFont: '', onboarding_completed: false, loaded: false,
    isPremium: false,
};

const UserContext = createContext<{ profile: UserProfile; refetch: () => void; updateProfile: (partial: Partial<UserProfile>) => void }>({
    profile: defaultProfile,
    refetch: () => { },
    updateProfile: () => { },
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [profile, setProfile] = useState<UserProfile>(defaultProfile);

    const loadProfile = async () => {
        // Use getSession() - reads from memory/localStorage, no network call
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
            setProfile({ ...defaultProfile, loaded: true });
            return;
        }

        const name = user.user_metadata?.full_name || user.email || '';
        const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

        const isPremiumOptimistic = user.user_metadata?.account_type === 'lifetime' || 
                                    user.user_metadata?.user_role?.toLowerCase() === 'owner' ||
                                    user.user_metadata?.user_role?.toLowerCase() === 'administrador' ||
                                    user.user_metadata?.user_role?.toLowerCase() === 'supervisor' ||
                                    user.user_metadata?.user_role?.toLowerCase() === 'rh';

        // Optimistic update with what we already know from the session
        setProfile(prev => ({
            ...prev,
            userId: user.id,
            email: user.email || '',
            isPremium: isPremiumOptimistic,
            ...(prev.loaded ? {} : {
                userName: name,
                firstName: name.split(' ')[0],
                initials,
            }),
            loaded: prev.loaded, // Preserve loaded state during refetch
        }));

        // Then enrich with Supabase profile data (avatarUrl, role etc.)
        const { data } = await supabase
            .from('profiles')
            .select('name, avatar_url, notifications_enabled, user_role, status, account_type, trial_ends_at, organization_id, organization_name, brand_name, brand_color, brand_font, onboarding_completed, evolution_api_url, evolution_api_key, evolution_instance')
            .eq('id', user.id)
            .maybeSingle();

        if (data) {
            const profileName = (data.name && !data.name.includes('@')) 
                ? data.name 
                : (user.user_metadata?.full_name || user.user_metadata?.name || data.name || name);
            const profileInitials = profileName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            setProfile(prev => ({
                ...prev,
                userId: user.id,
                email: user.email || '',
                userName: profileName,
                firstName: profileName.split(' ')[0],
                avatarUrl: data.avatar_url || '',
                initials: profileInitials,
                notificationsEnabled: data.notifications_enabled ?? false,
                user_role: ((data.user_role && data.user_role in rolePermissions) ? data.user_role : 'rh') as UserProfile['user_role'],
                status: (data.status as UserProfile['status']) || 'active',
                account_type: (data.account_type as UserProfile['account_type']) || 'trial',
                plan: (data.account_type as UserProfile['account_type']) || 'trial',
                trial_ends_at: data.trial_ends_at || null,
                organization_id: (data.organization_id && data.organization_id !== 'null') ? data.organization_id : null,
                organization_name: (data.organization_name && data.organization_name !== 'null') ? data.organization_name : null,
                brandName: data.brand_name || '',
                brandColor: data.brand_color || '',
                brandFont: data.brand_font || '',
                onboarding_completed: data.onboarding_completed ?? false,
                isPremium: data.account_type === 'lifetime' ||
                           data.user_role?.toLowerCase() === 'owner' ||
                           data.user_role?.toLowerCase() === 'administrador' ||
                           data.user_role?.toLowerCase() === 'supervisor' ||
                           data.user_role?.toLowerCase() === 'rh' ||
                           user.user_metadata?.user_role?.toLowerCase() === 'owner' ||
                           user.user_metadata?.user_role?.toLowerCase() === 'administrador' ||
                           user.user_metadata?.user_role?.toLowerCase() === 'supervisor' ||
                           user.user_metadata?.user_role?.toLowerCase() === 'rh',
                evolution_api_url: data.evolution_api_url || '',
                evolution_api_key: data.evolution_api_key || '',
                evolution_instance: data.evolution_instance || '',
                loaded: true,
            } as UserProfile));
            
        } else {
            // Case where user exists in Auth but not yet in Profiles (trigger delay)
            // Still set loaded to true so the app can continue, but with base data
            setProfile(prev => ({ ...prev, loaded: true }));
        }
    };
    useEffect(() => {
        /* eslint-disable react-hooks/set-state-in-effect */
        loadProfile();
        /* eslint-enable react-hooks/set-state-in-effect */
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                setProfile({ ...defaultProfile, loaded: true });
            } else {
                loadProfile();
            }
        });

        // Subscription realtime para detectar mudanças no perfil
        const profileSubscription = profile.userId
            ? supabase
                .channel('profile-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${profile.userId}`,
                    },
                    () => {
                        loadProfile();
                    }
                )
                .subscribe()
            : null;

        return () => {
            subscription.unsubscribe();
            if (profileSubscription) supabase.removeChannel(profileSubscription);
        };
         
    }, [profile.userId]);

    const updateProfile = (partial: Partial<UserProfile>) => {
        setProfile(prev => ({ ...prev, ...partial }));
    };

    return (
        <UserContext.Provider value={{ profile, refetch: loadProfile, updateProfile }}>
            {children}
        </UserContext.Provider>
    );
};

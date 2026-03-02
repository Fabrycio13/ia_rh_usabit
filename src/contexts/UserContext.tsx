import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface UserProfile {
    userId: string;
    userName: string;
    firstName: string;
    avatarUrl: string;
    plan: string;
    email: string;
    initials: string;
    loaded: boolean; // true once the first load completed
}

const defaultProfile: UserProfile = {
    userId: '', userName: '', firstName: '', avatarUrl: '',
    plan: 'trial', email: '', initials: '', loaded: false,
};

const UserContext = createContext<{ profile: UserProfile; refetch: () => void }>({
    profile: defaultProfile,
    refetch: () => { },
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

        // Optimistic update with what we already know from the session
        setProfile(prev => ({
            ...prev,
            userId: user.id,
            email: user.email || '',
            userName: name,
            firstName: name.split(' ')[0],
            initials,
            loaded: true,
        }));

        // Then enrich with Supabase profile data (avatarUrl, role etc.)
        const { data } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();

        if (data) {
            const profileName = data.name || name;
            const profileInitials = profileName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            setProfile(prev => ({
                ...prev,
                userId: user.id,
                email: user.email || '',
                userName: profileName,
                firstName: profileName.split(' ')[0],
                avatarUrl: data.avatar_url || '',
                initials: profileInitials,
                loaded: true,
            }));
        }
    };

    useEffect(() => {
        loadProfile();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                setProfile({ ...defaultProfile, loaded: true });
            } else {
                loadProfile();
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    return (
        <UserContext.Provider value={{ profile, refetch: loadProfile }}>
            {children}
        </UserContext.Provider>
    );
};

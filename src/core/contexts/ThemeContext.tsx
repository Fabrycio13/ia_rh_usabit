import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    planetMode: boolean;
    togglePlanetMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('app-theme');
        return (saved as Theme) || 'dark'; // Default to dark as requested
    });

    const [planetMode, setPlanetMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('app-planet-mode');
        return saved !== null ? saved === 'true' : true; // Default is true (with planet)
    });

    useEffect(() => {
        localStorage.setItem('app-theme', theme);
        document.documentElement.className = theme;
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('app-planet-mode', String(planetMode));
    }, [planetMode]);

    const togglePlanetMode = () => {
        setPlanetMode(prev => !prev);
    };

    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        const direction = nextTheme === 'dark' ? 'ltr' : 'rtl';

        // Suporte para View Transitions API
        const doc = document as any;
        if (!doc.startViewTransition) {
            setTheme(nextTheme);
            return;
        }

        document.documentElement.setAttribute('data-theme-anim', direction);

        doc.startViewTransition(() => {
            setTheme(nextTheme);
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, planetMode, togglePlanetMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
